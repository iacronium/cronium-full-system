// scripts/deposit_link.js
// Aprueba LINK al CCIPTokenPurchaseSender y deposita los fees.
// Ejecutar con: npx hardhat run scripts/deposit_link.js --network ethereumSepolia
//
// Ajusta LINK_AMOUNT_TO_DEPOSIT según cuánto LINK quieras depositar.
// Cada mensaje CCIP cuesta ~0.1–0.3 LINK en testnet.
// Con 2 LINK tienes margen para ~7–20 transacciones de prueba.

const { ethers } = require("hardhat");

const LINK_TOKEN_ADDRESS  = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // LINK en Eth Sepolia
const LINK_AMOUNT_TO_DEPOSIT = "2"; // LINK a depositar (ajustar según balance disponible)

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
];

const SENDER_ABI = [
    "function depositLinkFees(uint256 amount)",
    "function estimateFee(uint256 franchiseId, uint256 tokenAmount, uint256 paymentAmount) view returns (uint256)",
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=".repeat(60));
    console.log("  DEPOSITAR LINK — CCIPTokenPurchaseSender");
    console.log("=".repeat(60));
    console.log(`Deployer:       ${deployer.address}`);

    const senderAddress = process.env.CCIP_SENDER_ADDRESS;
    if (!senderAddress) throw new Error("Falta CCIP_SENDER_ADDRESS en .env");
    console.log(`Sender address: ${senderAddress}`);

    const link   = new ethers.Contract(LINK_TOKEN_ADDRESS, ERC20_ABI, deployer);
    const sender = new ethers.Contract(senderAddress, SENDER_ABI, deployer);

    // ── Balances actuales ──────────────────────────────────────────────────
    const decimals      = await link.decimals();
    const walletBalance = await link.balanceOf(deployer.address);
    const senderBalance = await link.balanceOf(senderAddress);

    console.log(`\nBalance LINK en tu wallet:  ${ethers.formatUnits(walletBalance, decimals)} LINK`);
    console.log(`Balance LINK en el Sender:  ${ethers.formatUnits(senderBalance, decimals)} LINK`);

    // ── Estimar fee de un mensaje de prueba ────────────────────────────────
    try {
        const estimatedFee = await sender.estimateFee(1, 100, ethers.parseUnits("100", 6));
        console.log(`\nFee estimado por mensaje:   ${ethers.formatUnits(estimatedFee, 18)} LINK`);
        const messagesCapacity = Number(ethers.formatUnits(walletBalance, decimals)) / Number(ethers.formatUnits(estimatedFee, 18));
        console.log(`Capacidad con tu balance:   ~${messagesCapacity.toFixed(0)} mensajes`);
    } catch {
        console.log("\n(No se pudo estimar el fee — el router puede estar offline en testnet)");
    }

    // ── Validar que hay suficiente LINK ────────────────────────────────────
    const amountWei = ethers.parseUnits(LINK_AMOUNT_TO_DEPOSIT, decimals);
    if (walletBalance < amountWei) {
        throw new Error(
            `Balance insuficiente. Tienes ${ethers.formatUnits(walletBalance, decimals)} LINK ` +
            `pero intentas depositar ${LINK_AMOUNT_TO_DEPOSIT} LINK.\n` +
            `Ajusta LINK_AMOUNT_TO_DEPOSIT en el script.`
        );
    }

    // ── Aprobar LINK al Sender ─────────────────────────────────────────────
    const currentAllowance = await link.allowance(deployer.address, senderAddress);
    if (currentAllowance < amountWei) {
        console.log(`\nAprobando ${LINK_AMOUNT_TO_DEPOSIT} LINK al Sender...`);
        const approveTx = await link.approve(senderAddress, amountWei);
        console.log(`  Tx: ${approveTx.hash}`);
        await approveTx.wait(1);
        console.log("  ✓ Aprobación confirmada");
    } else {
        console.log(`\n✓ Allowance ya suficiente (${ethers.formatUnits(currentAllowance, decimals)} LINK)`);
    }

    // ── Depositar LINK ─────────────────────────────────────────────────────
    console.log(`\nDepositando ${LINK_AMOUNT_TO_DEPOSIT} LINK en el Sender...`);
    const depositTx = await sender.depositLinkFees(amountWei);
    console.log(`  Tx: ${depositTx.hash}`);
    await depositTx.wait(1);
    console.log("  ✓ Depósito confirmado");

    // ── Balance final ──────────────────────────────────────────────────────
    const senderBalanceAfter = await link.balanceOf(senderAddress);
    console.log(`\nBalance LINK en el Sender ahora: ${ethers.formatUnits(senderBalanceAfter, decimals)} LINK`);
    console.log("\n✓ Listo — el Sender puede pagar fees CCIP.");
    console.log(`\nVer en Etherscan: https://sepolia.etherscan.io/address/${senderAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
