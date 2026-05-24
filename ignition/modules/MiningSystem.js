const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;

module.exports = buildModule("MiningSystemModule", (m) => {
  // Parameters
  const paymentTokenAddress = m.getParameter("paymentTokenAddress");
  const treasuryAddress = m.getParameter("treasuryAddress", "0x36fe4A50e2aFfBE9D3d03A8b355bc59676D1EEB9"); // Default treasury
  const baseUri = m.getParameter("baseUri", "ipfs://cronium-meta/");

  // 1. Deploy FranchiseTokenizer
  const franchiseTokenizer = m.contract("FranchiseTokenizer", [baseUri]);

  // 2. Deploy ComplianceManager
  const complianceManager = m.contract("ComplianceManager", [
    franchiseTokenizer,
    paymentTokenAddress,
    treasuryAddress,
  ]);

  // 3. Deploy DividendDistributor
  const dividendDistributor = m.contract("DividendDistributor", [
    franchiseTokenizer,
    paymentTokenAddress,
    THIRTY_DAYS_IN_SECS,
  ]);

  // ─── CCIP Cross-Chain Deployment ───────────────────────────────────────────
  
  const ccipRouterAddress = m.getParameter("ccipRouterAddress");
  const linkTokenAddress = m.getParameter("linkTokenAddress");
  const sourceChainSelector = m.getParameter("sourceChainSelector"); // e.g. Eth Sepolia

  // Deploy CCIP Receiver on Base Sepolia
  const ccipReceiver = m.contract("CCIPTokenPurchaseReceiver", [
    ccipRouterAddress,
    complianceManager,
    paymentTokenAddress,
  ]);

  // Deploy CCIP Sender (Note: In a real multi-chain deployment, this would be on a different network)
  // But we include it here for local testing/one-command deployment capability
  const ccipSender = m.contract("CCIPTokenPurchaseSender", [
    ccipRouterAddress,
    linkTokenAddress,
    paymentTokenAddress,
    sourceChainSelector,
    ccipReceiver,
  ]);

  // 4. Configuration (Post-deployment setup)
  
  // Grant MINTER_ROLE to ComplianceManager
  const MINTER_ROLE = m.staticCall(franchiseTokenizer, "MINTER_ROLE");
  m.call(franchiseTokenizer, "grantRole", [MINTER_ROLE, complianceManager]);

  // Grant CCIP_RECEIVER_ROLE to the CCIP Receiver
  const CCIP_RECEIVER_ROLE = m.staticCall(complianceManager, "CCIP_RECEIVER_ROLE");
  m.call(complianceManager, "grantRole", [CCIP_RECEIVER_ROLE, ccipReceiver]);

  // Set ComplianceManager in Tokenizer
  m.call(franchiseTokenizer, "setComplianceManager", [complianceManager]);

  // Set DividendDistributor in Tokenizer
  m.call(franchiseTokenizer, "setDividendDistributor", [dividendDistributor]);

  // Allow the Sender in the Receiver
  m.call(ccipReceiver, "setAllowedSender", [sourceChainSelector, ccipSender, true]);

  return {
    franchiseTokenizer,
    complianceManager,
    dividendDistributor,
    ccipReceiver,
    ccipSender,
  };
});
