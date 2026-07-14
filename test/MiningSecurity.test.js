const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Mining Equipment Security & Dividends", function () {
    const KYC_STATUS = { None: 0, Pending: 1, Verified: 2, Rejected: 3 };

    async function deployMiningSystemFixture() {
        const [owner, kycAdmin, franchiseManager, investor1, investor2, receiver, treasury] = await ethers.getSigners();

        // 1. Mock USDC (6 decimals)
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const paymentToken = await MockERC20.deploy("Mock USDC", "mUSDC");
        await paymentToken.waitForDeployment();
        await paymentToken.mint(owner.address, ethers.parseUnits("1000000", 6));

        // 2. FranchiseTokenizer
        const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
        const franchiseTokenizer = await FranchiseTokenizer.deploy("ipfs://cronium-meta/");
        await franchiseTokenizer.waitForDeployment();
        
        // 3. ComplianceManager
        const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
        const complianceManager = await ComplianceManager.deploy(
            await franchiseTokenizer.getAddress(),
            await paymentToken.getAddress(),
            treasury.address
        );
        await complianceManager.waitForDeployment();
        
        // 4. DividendDistributor (30 day interval)
        const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;
        const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
        const dividendDistributor = await DividendDistributor.deploy(
            await franchiseTokenizer.getAddress(),
            await paymentToken.getAddress(),
            THIRTY_DAYS_IN_SECS
        );
        await dividendDistributor.waitForDeployment();

        // 5. Connect all components
        await franchiseTokenizer.setComplianceManager(await complianceManager.getAddress());
        await franchiseTokenizer.setDividendDistributor(await dividendDistributor.getAddress());

        // 6. Setup Roles
        const MINTER_ROLE = await franchiseTokenizer.MINTER_ROLE();
        await franchiseTokenizer.grantRole(MINTER_ROLE, await complianceManager.getAddress());
        
        const KYC_ADMIN_ROLE = await complianceManager.KYC_ADMIN_ROLE();
        await complianceManager.grantRole(KYC_ADMIN_ROLE, kycAdmin.address);
        
        const MANAGER_ROLE = await franchiseTokenizer.MANAGER_ROLE();
        await franchiseTokenizer.grantRole(MANAGER_ROLE, franchiseManager.address);

        // 7. Create a Mining Rig Franchise
        const franchiseId = await franchiseTokenizer.nextFranchiseId();
        await franchiseTokenizer.connect(franchiseManager).createFranchise(
            "Antminer S19 Pro - 110TH/s",
            "AMP",
            ethers.parseUnits("10000", 6), // $10,000
            100, // 100 tokens
            franchiseManager.address
        );

        return { 
            franchiseTokenizer, dividendDistributor, complianceManager, paymentToken, 
            owner, kycAdmin, franchiseManager, investor1, investor2, receiver, treasury,
            FRANCHISE_ID: franchiseId
        };
    }

    describe("Transfer Security (KYC Restrictions)", function () {
        it("Debería bloquear transferencias a direcciones sin KYC", async function () {
            const { franchiseTokenizer, complianceManager, kycAdmin, investor1, receiver, FRANCHISE_ID, owner, paymentToken } = await loadFixture(deployMiningSystemFixture);
            
            // Investor 1 verified
            await complianceManager.connect(kycAdmin).setKYCStatus(investor1.address, KYC_STATUS.Verified);
            
            // Purchase tokens for investor1
            const price = ethers.parseUnits("100", 6); // 1 token = $100
            await paymentToken.connect(owner).transfer(investor1.address, price);
            await paymentToken.connect(investor1).approve(await complianceManager.getAddress(), price);
            await complianceManager.connect(investor1).purchaseTokens(FRANCHISE_ID, 1, price);

            // Attempt transfer to receiver (NOT verified)
            await expect(
                franchiseTokenizer.connect(investor1).safeTransferFrom(investor1.address, receiver.address, FRANCHISE_ID, 1, "0x")
            ).to.be.revertedWith("FranchiseTokenizer: Receiver not KYC verified");
        });

        it("Debería permitir transferencias entre direcciones con KYC", async function () {
            const { franchiseTokenizer, complianceManager, kycAdmin, investor1, receiver, FRANCHISE_ID, owner, paymentToken } = await loadFixture(deployMiningSystemFixture);
            
            // Both verified
            await complianceManager.connect(kycAdmin).setKYCStatus(investor1.address, KYC_STATUS.Verified);
            await complianceManager.connect(kycAdmin).setKYCStatus(receiver.address, KYC_STATUS.Verified);
            
            // Purchase tokens
            const price = ethers.parseUnits("100", 6);
            await paymentToken.connect(owner).transfer(investor1.address, price);
            await paymentToken.connect(investor1).approve(await complianceManager.getAddress(), price);
            await complianceManager.connect(investor1).purchaseTokens(FRANCHISE_ID, 1, price);

            // Transfer should work
            await franchiseTokenizer.connect(investor1).safeTransferFrom(investor1.address, receiver.address, FRANCHISE_ID, 1, "0x");
            expect(await franchiseTokenizer.balanceOf(receiver.address, FRANCHISE_ID)).to.equal(1);
        });
    });

    describe("Dividend Calculations (Manual Trigger & 6 Decimals)", function () {
        it("Debería distribuir dividendos exactos usando performUpkeep", async function () {
            const { 
                complianceManager, franchiseTokenizer, dividendDistributor, paymentToken, 
                owner, kycAdmin, franchiseManager, investor1, investor2, FRANCHISE_ID 
            } = await loadFixture(deployMiningSystemFixture);

            // Setup: Investor 1 (60 tokens), Investor 2 (40 tokens)
            await complianceManager.connect(kycAdmin).setKYCStatus(investor1.address, KYC_STATUS.Verified);
            await complianceManager.connect(kycAdmin).setKYCStatus(investor2.address, KYC_STATUS.Verified);
            
            const price60 = ethers.parseUnits("6000", 6);
            const price40 = ethers.parseUnits("4000", 6);

            await paymentToken.connect(owner).transfer(investor1.address, price60);
            await paymentToken.connect(investor1).approve(await complianceManager.getAddress(), price60);
            await complianceManager.connect(investor1).purchaseTokens(FRANCHISE_ID, 60, price60);

            await paymentToken.connect(owner).transfer(investor2.address, price40);
            await paymentToken.connect(investor2).approve(await complianceManager.getAddress(), price40);
            await complianceManager.connect(investor2).purchaseTokens(FRANCHISE_ID, 40, price40);

            // Deposit $100.00 USDC dividends
            const dividendAmount = ethers.parseUnits("100", 6);
            await paymentToken.connect(owner).transfer(franchiseManager.address, dividendAmount);
            await paymentToken.connect(franchiseManager).approve(await dividendDistributor.getAddress(), dividendAmount);
            await dividendDistributor.connect(franchiseManager).depositDividends(FRANCHISE_ID, dividendAmount);

            // Advance time past the interval so checkUpkeep returns true
            const interval = await dividendDistributor.interval();
            await time.increase(interval + 1n);

            // Trigger cycle via performUpkeep (anyone can call it — Chainlink Automation does in prod)
            const performData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [FRANCHISE_ID]);
            await dividendDistributor.connect(owner).performUpkeep(performData);

            // Claim
            await dividendDistributor.connect(investor1).claimDividend(FRANCHISE_ID);
            await dividendDistributor.connect(investor2).claimDividend(FRANCHISE_ID);

            // Verify: Investor 1 should have $60.00, Investor 2 should have $40.00
            expect(await paymentToken.balanceOf(investor1.address)).to.equal(ethers.parseUnits("60", 6));
            expect(await paymentToken.balanceOf(investor2.address)).to.equal(ethers.parseUnits("40", 6));
        });

        it("Debería fallar si se llama performUpkeep sin fondos pendientes", async function () {
            const { dividendDistributor, investor1, FRANCHISE_ID } = await loadFixture(deployMiningSystemFixture);
            // No pending funds + no time elapsed → upkeepNeeded = false → should revert
            const performData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [FRANCHISE_ID]);
            await expect(
                dividendDistributor.connect(investor1).performUpkeep(performData)
            ).to.be.revertedWith("DividendDistributor: No pending dividends");
        });
    });
});
