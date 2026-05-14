// scripts/demo/4_deposit_dividends.js
const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Depositando dividendos...\n");

    const distributorAddress = "0xC8e3575e66FB54d0B00237f9b17dc6e05BF8d4B1";
    const usdcAddress = "0x70Fef40966f45fA2cdf2c241c247D806B9E24d61";

    const distributor = await ethers.getContractAt("DividendDistributor", distributorAddress);
    const usdc = await ethers.getContractAt("MockERC20", usdcAddress);

    const [manager] = await ethers.getSigners();

    const franchiseId = 1;
    const dividendAmount = ethers.parseUnits("10000", 18); // $10,000 en dividendos

    // Mintear USDC al manager para dividendos
    console.log("Minteando USDC para dividendos...");
    let tx = await usdc.mint(manager.address, dividendAmount);
    await tx.wait();
    console.log("✅ USDC minteado");

    // Aprobar
    console.log("\nAprobando USDC...");
    tx = await usdc.approve(distributorAddress, dividendAmount);
    await tx.wait();
    console.log("✅ USDC aprobado");

    // Depositar dividendos
    console.log("\nDepositando dividendos...");
    tx = await distributor.depositDividends(franchiseId, dividendAmount);
    const receipt = await tx.wait();
    console.log(`✅ Dividendos depositados: $10,000`);
    console.log(`TX Hash: ${receipt.hash}`);

    // Verificar pending pool
    const pending = await distributor.pendingDividendPool(franchiseId);
    console.log(`\n📊 Pool de dividendos pendientes: ${ethers.formatUnits(pending, 18)} USD`);

    console.log("\n✅ Depósito completado!");
    console.log(`\n🔗 Ver en BaseScan: https://sepolia.basescan.org/tx/${receipt.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
