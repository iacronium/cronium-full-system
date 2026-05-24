const { ethers } = require("hardhat");

async function main() {
  const [owner, kycAdmin, franchiseManager, buyer, treasury] = await ethers.getSigners();
  const ETH_SEPOLIA_SELECTOR = 16015286601757825753n;
  const BASE_SEPOLIA_SELECTOR = 10344971235874465080n;

  console.log("\n--- 🏗️ DEPLOYING SIMULATED CROSS-CHAIN SYSTEM ---");

  // 1. Tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdcOrigin = await MockERC20.deploy("Ethereum USDC", "eUSDC");
  const usdcDest = await MockERC20.deploy("Base USDC", "mUSDC");
  const linkToken = await MockERC20.deploy("Chainlink Token", "LINK");
  
  await usdcOrigin.waitForDeployment();
  await usdcDest.waitForDeployment();
  await linkToken.waitForDeployment();
  console.log("✅ Tokens deployed: USDC (Origin/Dest) and LINK");

  // 2. Mock Router
  const MockCCIPRouter = await ethers.getContractFactory("MockCCIPRouter");
  const mockRouter = await MockCCIPRouter.deploy();
  await mockRouter.waitForDeployment();
  console.log("✅ Mock CCIP Router deployed");

  // 3. Cronium Core (Base Sepolia)
  const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
  const franchiseTokenizer = await FranchiseTokenizer.deploy("ipfs://cronium-meta/");
  await franchiseTokenizer.waitForDeployment();

  const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
  const complianceManager = await ComplianceManager.deploy(
    await franchiseTokenizer.getAddress(),
    await usdcDest.getAddress(),
    treasury.address
  );
  await complianceManager.waitForDeployment();
  console.log("✅ Cronium Core deployed");

  // 4. CCIP Contracts
  const CCIPReceiver = await ethers.getContractFactory("CCIPTokenPurchaseReceiver");
  const ccipReceiver = await CCIPReceiver.deploy(
    await mockRouter.getAddress(),
    await complianceManager.getAddress(),
    await usdcDest.getAddress()
  );
  await ccipReceiver.waitForDeployment();

  const CCIPSender = await ethers.getContractFactory("CCIPTokenPurchaseSender");
  const ccipSender = await CCIPSender.deploy(
    await mockRouter.getAddress(),
    await linkToken.getAddress(),
    await usdcOrigin.getAddress(),
    BASE_SEPOLIA_SELECTOR,
    await ccipReceiver.getAddress()
  );
  await ccipSender.waitForDeployment();
  console.log("✅ CCIP Sender & Receiver deployed");

  // --- CONFIGURATION ---
  console.log("\n--- ⚙️ CONFIGURING SYSTEM ---");

  // Roles & Connections
  await franchiseTokenizer.grantRole(await franchiseTokenizer.MINTER_ROLE(), await complianceManager.getAddress());
  await complianceManager.grantRole(await complianceManager.KYC_ADMIN_ROLE(), kycAdmin.address);
  await complianceManager.grantRole(await complianceManager.CCIP_RECEIVER_ROLE(), await ccipReceiver.getAddress());
  await franchiseTokenizer.grantRole(await franchiseTokenizer.MANAGER_ROLE(), franchiseManager.address);
  
  // Create Mining Rig
  await franchiseTokenizer.connect(franchiseManager).createFranchise(
    "Antminer S19 Pro — Cross-Chain Demo",
    ethers.parseUnits("10000", 6), // $10,000
    100,
    franchiseManager.address
  );
  const FRANCHISE_ID = 1n;

  // Verify Buyer
  await complianceManager.connect(kycAdmin).setKYCStatus(buyer.address, 2); // Verified
  console.log("✅ Buyer KYC verified");

  // Liquidity & Fees
  const LIQUIDITY = ethers.parseUnits("1000", 6);
  await usdcDest.mint(owner.address, LIQUIDITY);
  await usdcDest.approve(await ccipReceiver.getAddress(), LIQUIDITY);
  await ccipReceiver.depositLiquidity(LIQUIDITY);

  await linkToken.mint(buyer.address, ethers.parseUnits("1", 18));
  await usdcOrigin.mint(buyer.address, ethers.parseUnits("100", 6));
  console.log("✅ Liquidity and fees prepared");

  // Allow Sender
  await ccipReceiver.setAllowedSender(ETH_SEPOLIA_SELECTOR, await ccipSender.getAddress(), true);

  // --- CROSS-CHAIN ACTION ---
  console.log("\n--- 🚀 EXECUTING CROSS-CHAIN PURCHASE ---");

  const purchaseAmount = 1n; // 1 token
  const paymentAmount = ethers.parseUnits("100", 6); // $100

  console.log(`- Buyer initiating purchase from Ethereum...`);
  await usdcOrigin.connect(buyer).approve(await ccipSender.getAddress(), paymentAmount);
  await linkToken.connect(buyer).approve(await ccipSender.getAddress(), ethers.parseUnits("1", 18));
  await ccipSender.connect(buyer).depositLinkFees(ethers.parseUnits("0.5", 18));

  const tx = await ccipSender.connect(buyer).sendPurchaseRequest(FRANCHISE_ID, purchaseAmount, paymentAmount);
  await tx.wait();
  
  const messageId = await mockRouter.lastMessageId();
  console.log(`✅ Message sent! ID: ${messageId}`);

  console.log(`- CCIP Router delivering message to Base...`);
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "uint256", "uint256"],
    [buyer.address, FRANCHISE_ID, purchaseAmount, paymentAmount]
  );
  
  await mockRouter.simulateMessageReceived(
    await ccipReceiver.getAddress(),
    messageId,
    ETH_SEPOLIA_SELECTOR,
    await ccipSender.getAddress(),
    payload
  );
  console.log(`✅ Message delivered!`);

  // --- FINAL CHECK ---
  console.log("\n--- 🏁 RESULTS ---");
  const buyerBalance = await franchiseTokenizer.balanceOf(buyer.address, FRANCHISE_ID);
  const treasuryBalance = await usdcDest.balanceOf(treasury.address);
  const history = await ccipReceiver.getPurchaseHistory(messageId);

  console.log(`Buyer Token Balance (Base): ${buyerBalance} token(s)`);
  console.log(`Treasury USDC Balance (Base): $${ethers.formatUnits(treasuryBalance, 6)}`);
  console.log(`Purchase Success Flag: ${history.success}`);

  if (buyerBalance == purchaseAmount && history.success) {
    console.log("\n✨ CROSS-CHAIN PURCHASE SIMULATION SUCCESSFUL! ✨\n");
  } else {
    console.log("\n❌ SIMULATION FAILED. Check logs.\n");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
