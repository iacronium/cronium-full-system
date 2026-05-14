// scripts/deposit_usdc_receiver.js
// Deposita mUSDC en el CCIPTokenPurchaseReceiver (Base Sepolia) para que
// tenga liquidez al ejecutar compras cross-chain entrantes desde Ethereum Sepolia.
//
// Ejecutar con: npx hardhat run scripts/deposit_usdc_receiver.js --network baseSepolia
//
// Cuánto depositar:
//   Cada compra cross-chain consume paymentAmount de USDC del Receiver.
//   Con precio de $100/token y compras de 100 tokens → $10,000 por tx.
//   Recomendado para testnet: 50,000 mUSDC (cubre 500 compras de 100 tokens a $100).

const { ethers } = require("hardhat");

// ── Ajustar según necesidad ────────────────────────────────────────────────────
const USDC_AMOUNT_TO_DEPOSIT = "50000"; // mUSDC a depositar (18 decimals en MockERC20)
// ──────────────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function mint(address to, uint256 amount)",
];

const RECEIVER_ABI = [
    "function depositLiquidity(uint256 amount)",
    "function availableLiquidity() view returns (uint256)",
];

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("=".repeat(60));
    console.log("  DEPOSITAR mUSDC — CCIPTokenPurchaseReceiver");
    console.log("=".repeat(60));
    console.log(`Red:            ${network.name} (chainId: ${Number(network.chainId)})`);
    console.log(`Deployer:       ${deployer.address}`);

    const receiverAddress = process.env.CCIP_RECEIVER_ADDRESS;
    const usdcAddress     = process.env.PAYMENT_TOKEN_ADDRESS;

    if (!receiverAddress || !usdcAddress) {
        throw new Error(
            "Faltan variables de entorno:\n" +
            "  CCIP_RECEIVER_ADDRESS — receiver en Base Sepolia\n" +
            "  PAYMENT_TOKEN_ADDRESS — mUSDC en Base Sepolia"
        );
    }

    console.log(`Receiver:       ${receiverAddress}`);
    console.log(`mUSDC:          ${usdcAddress}`);

    const usdc     = new ethers.Contract(usdcAddress, ERC20_ABI, deployer);
    const receiver = new ethers.Contract(receiverAddress, RECEIVER_ABI, deployer);

    // ── Balances actuales ──────────────────────────────────────────────────
    const decimals         = await usdc.decimals();
    const walletBalance    = await usdc.balanceOf(deployer.address);
    const receiverLiquidity = await receiver.availableLiquidity();

    console.log(`\nBalance mUSDC en tu wallet:    ${ethers.formatUnits(walletBalance, decimals)} mUSDC`);
    console.log(`Liquidez actual del Receiver:  ${ethers.formatUnits(receiverLiquidity, decimals)} mUSDC`);

    const amountWei = ethers.parseUnits(USDC_AMOUNT_TO_DEPOSIT, decimals);

    // ── Mint si no hay suficiente balance (MockERC20 permite mint libre) ───
    if (walletBalance < amountWei) {
        const needed = amountWei - walletBalance;
        console.log(`\nBalance insuficiente. Minteando ${ethers.formatUnits(needed, decimals)} mUSDC adicionales...`);
        const mintTx = await usdc.mint(deployer.address, needed);
        console.log(`  Tx: ${mintTx.hash}`);
        await mintTx.wait(1);
        console.log("  ✓ Mint confirmado");
    }

    // ── Aprobar mUSDC al Receiver ──────────────────────────────────────────
    const currentAllowance = await usdc.allowance(deployer.address, receiverAddress);
    if (currentAllowance < amountWei) {
        console.log(`\nAprobando ${USDC_AMOUNT_TO_DEPOSIT} mUSDC al Receiver...`);
        const approveTx = await usdc.approve(receiverAddress, amountWei);
        console.log(`  Tx: ${approveTx.hash}`);
        await approveTx.wait(1);
        console.log("  ✓ Aprobación confirmada");
    } else {
        console.log(`\n✓ Allowance ya suficiente (${ethers.formatUnits(currentAllowance, decimals)} mUSDC)`);
    }

    // ── Depositar mUSDC ────────────────────────────────────────────────────
    console.log(`\nDepositando ${USDC_AMOUNT_TO_DEPOSIT} mUSDC en el Receiver...`);
    const depositTx = await receiver.depositLiquidity(amountWei);
    console.log(`  Tx: ${depositTx.hash}`);
    await depositTx.wait(1);
    console.log("  ✓ Depósito confirmado");

    // ── Balance final ──────────────────────────────────────────────────────
    const liquidityAfter = await receiver.availableLiquidity();
    console.log(`\nLiquidez del Receiver ahora:   ${ethers.formatUnits(liquidityAfter, decimals)} mUSDC`);
    console.log("\n✓ Listo — el Receiver puede ejecutar compras cross-chain.");
    console.log(`\nVer en BaseScan: https://sepolia.basescan.org/address/${receiverAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
