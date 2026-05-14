// scripts/manual_execute_ccip.js
// Ejecuta manualmente un mensaje CCIP que quedó en estado "Ready for manual execution"
// por falta de gas en la cadena destino.
//
// El router CCIP de Base Sepolia expone manuallyExecute(InternalExecutionReport, GasLimitOverrides[])
// pero la ABI completa es compleja. La forma más simple es usar el CCIP Explorer UI:
//
//   1. Ve a: https://ccip.chain.link/msg/<MESSAGE_ID>
//   2. Conecta MetaMask en Base Sepolia
//   3. Haz clic en "Execute manually"
//   4. Confirma la transacción con gas suficiente
//
// Este script verifica el estado actual y muestra el link directo.
//
// Ejecutar con: npx hardhat run scripts/manual_execute_ccip.js --network baseSepolia

const { ethers } = require("hardhat");

const MESSAGE_ID      = process.env.MESSAGE_ID ||
    "0x656283ece6c93a1457a647699d0dd64d64da6ecfef04739ebeafbed71d89293a";
const RECEIVER_ADDRESS = process.env.CCIP_RECEIVER_ADDRESS;

const RECEIVER_ABI = [
    "function isMessageProcessed(bytes32) view returns (bool)",
    "function getPurchaseHistory(bytes32) view returns (tuple(address buyer, uint256 franchiseId, uint256 tokenAmount, uint256 paymentAmount, uint64 sourceChainSelector, uint256 timestamp, bool success))",
    "function availableLiquidity() view returns (uint256)",
];

const ERC1155_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)",
];

const FRANCHISE_TOKENIZER = "0xAC566fADcD8fE13A67307d13B994e89bf368447b";
const BUYER               = "0xa7F35507210C1eB6E212911cCc1289AA73e6e7A6";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("=".repeat(60));
    console.log("  MANUAL EXECUTION CHECK — CCIP");
    console.log("=".repeat(60));
    console.log(`Message ID: ${MESSAGE_ID}`);

    const receiver  = new ethers.Contract(RECEIVER_ADDRESS, RECEIVER_ABI, deployer);
    const franchise = new ethers.Contract(FRANCHISE_TOKENIZER, ERC1155_ABI, deployer);

    const processed = await receiver.isMessageProcessed(MESSAGE_ID);
    const balance   = await franchise.balanceOf(BUYER, 1n);
    const liquidity = await receiver.availableLiquidity();

    console.log(`\nMessage processed:        ${processed}`);
    console.log(`ERC-1155 balance (buyer): ${balance} tokens`);
    console.log(`Receiver mUSDC liquidity: ${ethers.formatUnits(liquidity, 18)} mUSDC`);

    if (processed) {
        const h = await receiver.getPurchaseHistory(MESSAGE_ID);
        console.log(`\nPurchase result:`);
        console.log(`  Success:      ${h.success}`);
        console.log(`  Token amount: ${h.tokenAmount}`);
        console.log(`  Payment:      ${ethers.formatUnits(h.paymentAmount, 18)} mUSDC`);
        if (h.success) {
            console.log("\n✅ Purchase already executed successfully!");
        } else {
            console.log("\n⚠️  Message processed but purchase failed.");
        }
    } else {
        console.log("\n⏳ Message not yet processed on Base Sepolia.");
        console.log("\n📋 To manually execute:");
        console.log(`   1. Open: https://ccip.chain.link/msg/${MESSAGE_ID}`);
        console.log("   2. Connect MetaMask → switch to Base Sepolia");
        console.log('   3. Click "Execute manually" and confirm');
        console.log("\n   The new gas limit (500,000) is set on the Sender for future messages.");
        console.log("   For this pending message, the CCIP Explorer will use a higher gas override.");
    }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
