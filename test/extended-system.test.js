const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Cronium Extended System Verification", function () {
    const KYC_STATUS = { None: 0, Pending: 1, Verified: 2, Rejected: 3 };
    const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;

    async function deployExtendedFixture() {
        const [owner, kycAdmin, manager, user1, user2, user3, treasury] = await ethers.getSigners();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("Mock USDC", "mUSDC");
        await usdc.waitForDeployment();
        await usdc.mint(owner.address, ethers.parseUnits("1000000", 6));

        const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
        const tokenizer = await FranchiseTokenizer.deploy("ipfs://meta/");
        await tokenizer.waitForDeployment();

        const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
        const compliance = await ComplianceManager.deploy(
            await tokenizer.getAddress(),
            await usdc.getAddress(),
            treasury.address
        );
        await compliance.waitForDeployment();

        const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
        const distributor = await DividendDistributor.deploy(
            await tokenizer.getAddress(),
            await usdc.getAddress(),
            THIRTY_DAYS_IN_SECS
        );
        await distributor.waitForDeployment();

        // Roles
        await tokenizer.grantRole(await tokenizer.MINTER_ROLE(), await compliance.getAddress());
        await compliance.grantRole(await compliance.KYC_ADMIN_ROLE(), kycAdmin.address);
        await tokenizer.grantRole(await tokenizer.MANAGER_ROLE(), manager.address);

        // Create Franchise
        const franchiseId = 1;
        await tokenizer.connect(manager).createFranchise("Burger Co", "BCO", ethers.parseUnits("100000", 6), 1000, manager.address);

        return {
            tokenizer, distributor, compliance, usdc,
            owner, kycAdmin, manager, user1, user2, user3, treasury,
            franchiseId
        };
    }

    describe("ComplianceManager: Búsqueda de Límites y Demo Mode", function () {
        it("Debería permitir Batch KYC hasta 100 usuarios", async function () {
            const { compliance, kycAdmin, user1, user2 } = await loadFixture(deployExtendedFixture);
            const users = [user1.address, user2.address];
            await compliance.connect(kycAdmin).batchSetKYCStatus(users, KYC_STATUS.Verified);
            expect(await compliance.kycStatus(user1.address)).to.equal(KYC_STATUS.Verified);
            expect(await compliance.kycStatus(user2.address)).to.equal(KYC_STATUS.Verified);
        });

        it("Debería habilitar Demo Mode y saltarse KYC", async function () {
            const { compliance, tokenizer, usdc, owner, user3, franchiseId } = await loadFixture(deployExtendedFixture);

            // Sin demo mode y sin KYC debería fallar
            await expect(
                compliance.connect(user3).purchaseTokens(franchiseId, 10, 100)
            ).to.be.revertedWith("ComplianceManager: KYC not verified");

            // Activamos demo mode
            await compliance.connect(owner).setDemoMode(true);
            expect(await compliance.demoModeActive()).to.be.true;

            // Ahora debería dejar comprar sin KYC
            // Precio: (100000e6 * 1) / 1000 = 100e6
            const price = ethers.parseUnits("100", 6);
            await usdc.connect(owner).transfer(user3.address, price);
            await usdc.connect(user3).approve(await compliance.getAddress(), price);
            await compliance.connect(user3).purchaseTokens(franchiseId, 1, price);

            expect(await tokenizer.balanceOf(user3.address, franchiseId)).to.equal(1);
        });
    });

    describe("DividendDistributor: Múltiples Ciclos y Rounding", function () {
        it("Debería manejar múltiples ciclos y que los inversores cobren ambos", async function () {
            const { compliance, distributor, usdc, owner, kycAdmin, user1, franchiseId } = await loadFixture(deployExtendedFixture);

            // Setup Inversor
            await compliance.connect(kycAdmin).setKYCStatus(user1.address, KYC_STATUS.Verified);
            // Precio: (100000e6 * 100) / 1000 = 10000e6
            const price = ethers.parseUnits("10000", 6);
            await usdc.connect(owner).transfer(user1.address, price);
            await usdc.connect(user1).approve(await compliance.getAddress(), price);
            await compliance.connect(user1).purchaseTokens(franchiseId, 100, price);

            // Ciclo 1
            const div1 = ethers.parseUnits("1000", 6);
            await usdc.connect(owner).transfer(owner.address, div1); // Dummy transfer to ensure funds
            await usdc.connect(owner).approve(await distributor.getAddress(), div1);
            await distributor.connect(owner).depositDividends(franchiseId, div1);

            await time.increase(THIRTY_DAYS_IN_SECS + 1);
            await distributor.performUpkeep(ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [franchiseId]));
            const cycle1 = await distributor.currentCycleId(franchiseId);

            // Ciclo 2
            const div2 = ethers.parseUnits("2000", 6);
            await usdc.connect(owner).approve(await distributor.getAddress(), div2);
            await distributor.connect(owner).depositDividends(franchiseId, div2);

            await time.increase(THIRTY_DAYS_IN_SECS + 1);
            await distributor.performUpkeep(ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [franchiseId]));
            const cycle2 = await distributor.currentCycleId(franchiseId);

            // Debería tener 1000 + 2000 = 3000 pendientes (acumulados)
            expect(await distributor.getPendingDividend(user1.address, franchiseId)).to.equal(div1 + div2);

            await distributor.connect(user1).claimDividend(franchiseId);

            expect(await usdc.balanceOf(user1.address)).to.equal(div1 + div2);
        });

        it("Debería verificar el comportamiento con divisiones no exactas (Rounding Dust)", async function () {
            const { compliance, distributor, tokenizer, usdc, owner, kycAdmin, user1, user2, user3, franchiseId } = await loadFixture(deployExtendedFixture);

            // 3 inversores con 33, 33, 33 tokens (Total 99)
            // Queremos repartir 100 USDC. ($100 / 99 = 1.010101...)
            await compliance.connect(kycAdmin).batchSetKYCStatus([user1.address, user2.address, user3.address], KYC_STATUS.Verified);

            const buyTokens = async (user, amount) => {
                // Precio: (100000e6 * amount) / 1000 = 100e6 * amount
                const cost = ethers.parseUnits("100", 6) * BigInt(amount);
                await usdc.connect(owner).transfer(user.address, cost);
                await usdc.connect(user).approve(await compliance.getAddress(), cost);
                await compliance.connect(user).purchaseTokens(franchiseId, amount, cost);
            };

            await buyTokens(user1, 33);
            await buyTokens(user2, 33);
            await buyTokens(user3, 33);

            const divAmount = ethers.parseUnits("100", 6); // 100.000000 USDC
            await usdc.connect(owner).approve(await distributor.getAddress(), divAmount);
            await distributor.connect(owner).depositDividends(franchiseId, divAmount);

            await time.increase(THIRTY_DAYS_IN_SECS + 1);
            await distributor.performUpkeep(ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [franchiseId]));
            const cycleId = await distributor.currentCycleId(franchiseId);

            await distributor.connect(user1).claimDividend(franchiseId);
            await distributor.connect(user2).claimDividend(franchiseId);
            await distributor.connect(user3).claimDividend(franchiseId);

            const balance1 = await usdc.balanceOf(user1.address);
            const balance2 = await usdc.balanceOf(user2.address);
            const balance3 = await usdc.balanceOf(user3.address);

            // Cada uno debería recibir floor( (33 * (100e6 * 1e18 / 99)) / 1e18 )
            // perTokenPayout = 100e6 * 1e18 / 99 = 1010101010101010101010101
            // userPayout = 33 * 1010101010101010101010101 / 1e18 = 33333333 (con precisión de 6 decimales)
            // 33.333333 * 3 = 99.999999. Queda 0.000001 de "dust".

            const totalDistributed = balance1 + balance2 + balance3;
            expect(totalDistributed).to.be.closeTo(divAmount, ethers.parseUnits("0.00001", 6));
            expect(await usdc.balanceOf(await distributor.getAddress())).to.be.lessThan(ethers.parseUnits("0.00001", 6));
        });
    });
});
