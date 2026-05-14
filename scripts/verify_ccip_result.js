// scripts/verify_ccip_result.js
// Verifica el resultado de una compra CCIP ya entregada en Base Sepolia.
// Útil si test_ccip_e2e.js hizo timeout antes de que llegara el mensaje.
//
// Uso:
//   MESSAGE_ID=0x... npx hardhat run scripts/verify_ccip_result.js --network baseSepolia
//   (si no se pasa MESSAGE_ID, muestra solo el balance de tokens del deployer)

const { ethers } = require("hardhat");

const RECEIVER_ADDRESS            = process.env.CCIP_RECEIVER_ADDRESS;
const FRANCHISE_TOKENIZER_ADDRESS = "0xAC566fADcD8fE13A67307d13B994e89bf368447b";
const FRANCHISE_ID                = 1n;

const RECEIVER_ABI = [
    "function isMessageProcessed(bytes32) view returns (bool)",
    "function getPurchaseHistory(bytes32) view returns (tuple(address buyer, uint256 franchiseId, uint256 tokenAmount, uint256 paymentAmount, uint64 sourceChainSelector, uint256 timestamp, bool success))",
    "function availableLiquidity() view returns (uint256)",
];

const ERC1155_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)",
];

async function main() {
    const [deployer] = await ethers.getSigners();
    const messageId  = process.env.MESSAGE_ID;

    console.log("=".repeat(60));
    console.log("  VERIFY CCIP RESULT — Base Sepolia");
    console.log("=".repeat(60));
    console.log(`Deployer: ${deployer.address}`);

    const receiver  = new ethers.Contract(RECEIVER_ADDRESS, RECEIVER_ABI, deployer);
    const franchise = new ethers.Contract(FRANCHISE_TOKENIZER_ADDRESS, ERC1155_ABI, deployer);

    // Token balance
    const balance = await franchise.balanceOf(deployer.address, FRANCHISE_ID);
    console.log(`\nERC-1155 balance (Franchise #${FRANCHISE_ID}): ${balance} tokens`);

    // Receiver liquidity
    const liquidity = await receiver.availableLiquidity();
    console.log(`Receiver mUSDC liquidity: ${ethers.formatUnits(liquidity, 18)} mUSDC`);

    // Message-specific check
    if (messageId) {
        console.log(`\nChecking message: ${messageId}`);
        const processed = await receiver.isMessageProcessed(messageId);
        console.log(`  Processed: ${processed}`);

        if (processed) {
            const history = await receiver.getPurchaseHistory(messageId);
            console.log(`  Buyer:         ${history.buyer}`);
            console.log(`  Franchise ID:  ${history.franchiseId}`);
            console.log(`  Token amount:  ${history.tokenAmount}`);
            console.log(`  Payment:       ${ethers.formatUnits(history.paymentAmount, 18)} mUSDC`);
            console.log(`  Success:       ${history.success}`);
            console.log(`  Timestamp:     ${new Date(Number(history.timestamp) * 1000).toISOString()}`);

            if (history.success) {
                console.log("\n✅ Purchase was successful!");
            } else {
                console.log("\n⚠️  Message was delivered but purchase failed.");
                console.log("   Possible causes: insufficient liquidity, KYC not verified, demo mode off.");
            }
        } else {
            console.log("  Message not yet delivered — check https://ccip.chain.link/msg/" + messageId);
        }
    } else {
        console.log("\n(Pass MESSAGE_ID=0x... env var to check a specific message)");
    }
}

main().catch(console.error);
