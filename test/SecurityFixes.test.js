const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Security Fixes & Validations", function () {
    const KYC_STATUS = { None: 0, Pending: 1, Verified: 2, Rejected: 3 };

    async function deploySystemFixture() {
        const [owner, kycAdmin, franchiseManager, investor, treasury, externalUser] = await ethers.getSigners();

        // 1. Mock USDC (6 decimals)
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const paymentToken = await MockERC20.deploy("Mock USDC", "mUSDC");
        await paymentToken.waitForDeployment();
        await paymentToken.mint(owner.address, ethers.parseUnits("1000000", 6));

        // 2. Mock LINK (18 decimals)
        const linkToken = await MockERC20.deploy("Mock LINK", "mLINK");
        await linkToken.waitForDeployment();
        await linkToken.mint(owner.address, ethers.parseUnits("1000", 18));

        // 3. FranchiseTokenizer
        const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
        const franchiseTokenizer = await FranchiseTokenizer.deploy("ipfs://cronium-meta/");
        await franchiseTokenizer.waitForDeployment();
        
        // 4. ComplianceManager
        const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
        const complianceManager = await ComplianceManager.deploy(
            await franchiseTokenizer.getAddress(),
            await paymentToken.getAddress(),
            treasury.address
        );
        await complianceManager.waitForDeployment();
        
        // 5. DividendDistributor (30 day interval)
        const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;
        const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
        const dividendDistributor = await DividendDistributor.deploy(
            await franchiseTokenizer.getAddress(),
            await paymentToken.getAddress(),
            THIRTY_DAYS_IN_SECS
        );
        await dividendDistributor.waitForDeployment();

        // Connect all components
        await franchiseTokenizer.setComplianceManager(await complianceManager.getAddress());
        await franchiseTokenizer.setDividendDistributor(await dividendDistributor.getAddress());

        // Setup Roles
        await franchiseTokenizer.grantRole(await franchiseTokenizer.MINTER_ROLE(), await complianceManager.getAddress());
        await complianceManager.grantRole(await complianceManager.KYC_ADMIN_ROLE(), kycAdmin.address);
        await franchiseTokenizer.grantRole(await franchiseTokenizer.MANAGER_ROLE(), franchiseManager.address);

        return { 
            franchiseTokenizer, dividendDistributor, complianceManager, paymentToken, linkToken,
            owner, kycAdmin, franchiseManager, investor, treasury, externalUser,
            THIRTY_DAYS_IN_SECS
        };
    }

    describe("DividendDistributor: checkUpkeep DOS prevention when totalSupply is 0", function () {
        it("Debería retornar upkeepNeeded = false si totalSupply es 0 aunque haya fondos e intervalo transcurrido", async function () {
            const { franchiseTokenizer, dividendDistributor, franchiseManager, owner, paymentToken, THIRTY_DAYS_IN_SECS } = await loadFixture(deploySystemFixture);

            // Crear franquicia
            await franchiseTokenizer.connect(franchiseManager).createFranchise(
                "Cronium Coffee #1",
                "CCC",
                ethers.parseUnits("10000", 6),
                100,
                franchiseManager.address
            );
            const franchiseId = 1n;

            // Depositar dividendos
            const dividendAmount = ethers.parseUnits("100", 6);
            await paymentToken.connect(owner).approve(await dividendDistributor.getAddress(), dividendAmount);
            await dividendDistributor.connect(owner).depositDividends(franchiseId, dividendAmount);

            // Aumentar el tiempo más allá del intervalo
            await time.increase(THIRTY_DAYS_IN_SECS + 1);

            // Verificar upkeep
            const checkData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [franchiseId]);
            const [upkeepNeeded] = await dividendDistributor.checkUpkeep(checkData);

            // Total supply es 0, por lo que upkeepNeeded debe ser false
            expect(await franchiseTokenizer.totalSupply(franchiseId)).to.equal(0n);
            expect(upkeepNeeded).to.be.false;
        });
    });

    describe("DividendDistributor: recoverERC20", function () {
        it("Debería permitir al owner rescatar tokens que no sean USDC", async function () {
            const { dividendDistributor, linkToken, owner } = await loadFixture(deploySystemFixture);

            // Enviar LINK por error al DividendDistributor
            const amount = ethers.parseUnits("5", 18);
            await linkToken.connect(owner).transfer(await dividendDistributor.getAddress(), amount);

            const balanceBefore = await linkToken.balanceOf(owner.address);

            // Rescatar tokens
            await dividendDistributor.connect(owner).recoverERC20(await linkToken.getAddress(), amount);

            const balanceAfter = await linkToken.balanceOf(owner.address);
            expect(balanceAfter - balanceBefore).to.equal(amount);
        });

        it("Debería revertir si se intenta rescatar el token de pago (USDC)", async function () {
            const { dividendDistributor, paymentToken, owner } = await loadFixture(deploySystemFixture);
            const amount = ethers.parseUnits("5", 6);

            await expect(
                dividendDistributor.connect(owner).recoverERC20(await paymentToken.getAddress(), amount)
            ).to.be.revertedWith("DividendDistributor: Cannot recover payment token");
        });

        it("Debería revertir si un no-owner intenta llamar a recoverERC20", async function () {
            const { dividendDistributor, linkToken, externalUser } = await loadFixture(deploySystemFixture);
            const amount = ethers.parseUnits("5", 18);

            await expect(
                dividendDistributor.connect(externalUser).recoverERC20(await linkToken.getAddress(), amount)
            ).to.be.revertedWithCustomError(dividendDistributor, "OwnableUnauthorizedAccount");
        });
    });

    describe("ComplianceManager: Exact USDC Charging", function () {
        it("Debería cobrar únicamente la cantidad requerida y no transferir el excedente del expectedPaymentAmount", async function () {
            const { complianceManager, franchiseTokenizer, paymentToken, kycAdmin, investor, treasury, owner, franchiseManager } = await loadFixture(deploySystemFixture);

            // Crear franquicia: valor $10,000, 100 max supply -> $100 por token
            await franchiseTokenizer.connect(franchiseManager).createFranchise(
                "Cronium Bakery #1",
                "CRB",
                ethers.parseUnits("10000", 6),
                100,
                franchiseManager.address
            );
            const franchiseId = 1n;

            // Verificar inversor
            await complianceManager.connect(kycAdmin).setKYCStatus(investor.address, KYC_STATUS.Verified);

            // Inversor compra 2 tokens (requiere $200 USDC)
            const required = ethers.parseUnits("200", 6);
            const expectedPayment = ethers.parseUnits("300", 6); // Envía $300 (excedente de $100)

            await paymentToken.connect(owner).transfer(investor.address, expectedPayment);
            await paymentToken.connect(investor).approve(await complianceManager.getAddress(), expectedPayment);

            const treasuryBefore = await paymentToken.balanceOf(treasury.address);
            const investorBefore = await paymentToken.balanceOf(investor.address);

            // Ejecutar la compra
            const tx = await complianceManager.connect(investor).purchaseTokens(franchiseId, 2n, expectedPayment);
            const receipt = await tx.wait();

            const treasuryAfter = await paymentToken.balanceOf(treasury.address);
            const investorAfter = await paymentToken.balanceOf(investor.address);

            // El inversor sólo debería haber pagado $200, conservando $100
            expect(investorBefore - investorAfter).to.equal(required);
            expect(treasuryAfter - treasuryBefore).to.equal(required);

            // El evento debe emitir requiredPayment ($200)
            const event = receipt.logs
                .map((log) => {
                    try {
                        return complianceManager.interface.parseLog(log);
                    } catch (e) {
                        return null;
                    }
                })
                .find((x) => x && x.name === "TokensPurchased");

            expect(event.args.paymentAmount).to.equal(required);
        });
    });

    describe("FranchiseTokenizer: JSON injection prevention in metadata", function () {
        it("Debería revertir si el nombre de la franquicia contiene comillas dobles", async function () {
            const { franchiseTokenizer, franchiseManager } = await loadFixture(deploySystemFixture);

            await expect(
                franchiseTokenizer.connect(franchiseManager).createFranchise(
                    'Invalid "Name" Franchise',
                    "INF",
                    ethers.parseUnits("10000", 6),
                    100,
                    franchiseManager.address
                )
            ).to.be.revertedWith("FranchiseTokenizer: Invalid characters in name");
        });

        it("Debería revertir si el símbolo de la franquicia contiene barra invertida", async function () {
            const { franchiseTokenizer, franchiseManager } = await loadFixture(deploySystemFixture);

            await expect(
                franchiseTokenizer.connect(franchiseManager).createFranchise(
                    "Valid Name",
                    "IN\\F",
                    ethers.parseUnits("10000", 6),
                    100,
                    franchiseManager.address
                )
            ).to.be.revertedWith("FranchiseTokenizer: Invalid characters in symbol");
        });
    });
});
