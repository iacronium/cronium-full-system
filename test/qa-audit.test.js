const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("QA Audit Test Suite - Cronium NFT Marketplace", function () {
    const KYC_STATUS = { None: 0, Pending: 1, Verified: 2, Rejected: 3 };

    async function deploySystemFixture() {
        const [owner, kycAdmin, manager, user1, user2, treasury] = await ethers.getSigners();

        // 1. Deploy mUSDC
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const paymentToken = await MockERC20.deploy("Mock USDC", "mUSDC");
        await paymentToken.waitForDeployment();
        await paymentToken.mint(owner.address, ethers.parseUnits("1000000", 6));

        // 2. Deploy FranchiseTokenizer
        const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
        const franchiseTokenizer = await FranchiseTokenizer.deploy("ipfs://cronium-meta/");
        await franchiseTokenizer.waitForDeployment();

        // 3. Deploy ComplianceManager
        const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
        const complianceManager = await ComplianceManager.deploy(
            await franchiseTokenizer.getAddress(),
            await paymentToken.getAddress(),
            treasury.address
        );
        await complianceManager.waitForDeployment();

        // Roles Setup
        const MINTER_ROLE = await franchiseTokenizer.MINTER_ROLE();
        await franchiseTokenizer.grantRole(MINTER_ROLE, await complianceManager.getAddress());
        
        const KYC_ADMIN_ROLE = await complianceManager.KYC_ADMIN_ROLE();
        await complianceManager.grantRole(KYC_ADMIN_ROLE, kycAdmin.address);
        
        const MANAGER_ROLE = await franchiseTokenizer.MANAGER_ROLE();
        await franchiseTokenizer.grantRole(MANAGER_ROLE, manager.address);

        return { 
            franchiseTokenizer, complianceManager, paymentToken, 
            owner, kycAdmin, manager, user1, user2, treasury 
        };
    }

    describe("Security & Permissions", function () {
        it("SEC-01: Solo el MANAGER_ROLE debe crear franquicias", async function () {
            const { franchiseTokenizer, user1 } = await loadFixture(deploySystemFixture);
            await expect(
                franchiseTokenizer.connect(user1).createFranchise("Franchi Test", 1000, 100, user1.address)
            ).to.be.reverted;
        });

        it("SEC-02: Solo el KYC_ADMIN_ROLE debe asignar estados KYC", async function () {
            const { complianceManager, user1, user2 } = await loadFixture(deploySystemFixture);
            await expect(
                complianceManager.connect(user1).setKYCStatus(user2.address, KYC_STATUS.Verified)
            ).to.be.reverted;
        });

        it("SEC-03: Solo el DEFAULT_ADMIN_ROLE debe asignar nuevos roles", async function () {
            const { complianceManager, manager, user1 } = await loadFixture(deploySystemFixture);
            const KYC_ADMIN_ROLE = await complianceManager.KYC_ADMIN_ROLE();
            await expect(
                complianceManager.connect(manager).grantRole(KYC_ADMIN_ROLE, user1.address)
            ).to.be.reverted;
        });
    });

    describe("Edge Cases: Investment Flow", function () {
        async function setupActiveFranchise() {
            const system = await deploySystemFixture();
            const { franchiseTokenizer, manager } = system;
            await franchiseTokenizer.connect(manager).createFranchise(
                "Burger King #1", ethers.parseUnits("10000", 6), 100, manager.address
            );
            return system;
        }

        it("EDGE-01: Debe fallar si el allowance de mUSDC es insuficiente", async function () {
            const { complianceManager, paymentToken, owner, kycAdmin, user1 } = await setupActiveFranchise();
            const FRANCHISE_ID = 1;
            await complianceManager.connect(kycAdmin).setKYCStatus(user1.address, KYC_STATUS.Verified);
            await paymentToken.connect(owner).transfer(user1.address, ethers.parseUnits("1000", 6));
            await expect(
                complianceManager.connect(user1).purchaseTokens(FRANCHISE_ID, 1, ethers.parseUnits("100", 6))
            ).to.be.reverted;
        });

        it("EDGE-02: Debe fallar si el saldo de mUSDC es insuficiente", async function () {
            const { complianceManager, paymentToken, kycAdmin, user1 } = await setupActiveFranchise();
            const FRANCHISE_ID = 1;
            const price = ethers.parseUnits("100", 6);
            await complianceManager.connect(kycAdmin).setKYCStatus(user1.address, KYC_STATUS.Verified);
            await paymentToken.connect(user1).approve(await complianceManager.getAddress(), price);
            await expect(
                complianceManager.connect(user1).purchaseTokens(FRANCHISE_ID, 1, price)
            ).to.be.reverted;
        });

        it("EDGE-03: Debe fallar si se excede el maxSupply de la franquicia", async function () {
            const { complianceManager, paymentToken, owner, kycAdmin, user1 } = await setupActiveFranchise();
            const FRANCHISE_ID = 1;
            const price = ethers.parseUnits("100", 6);
            await complianceManager.connect(kycAdmin).setKYCStatus(user1.address, KYC_STATUS.Verified);
            await paymentToken.connect(owner).transfer(user1.address, ethers.parseUnits("20000", 6));
            await paymentToken.connect(user1).approve(await complianceManager.getAddress(), ethers.parseUnits("20000", 6));
            await expect(
                complianceManager.connect(user1).purchaseTokens(FRANCHISE_ID, 101, price * 101n)
            ).to.be.revertedWith("Exceeds max supply for this franchise");
        });
    });

    describe("Metadata Verification", function () {
        it("MT-01: La URI del contrato debe coincidir con IPFS", async function () {
            const { franchiseTokenizer } = await loadFixture(deploySystemFixture);
            expect(await franchiseTokenizer.uri(1)).to.equal("ipfs://cronium-meta/");
        });
    });
});
