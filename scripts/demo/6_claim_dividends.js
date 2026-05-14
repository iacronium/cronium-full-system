// scripts/demo/6_claim_dividends.js
const { ethers } = require("hardhat");

async function main() {
    console.log("💸 Reclamando dividendos...\n");

    const distributorAddress = "0xC8e3575e66FB54d0B00237f9b17dc6e05BF8d4B1";
    const usdcAddress = "0x70Fef40966f45fA2cdf2c241c247D806B9E24d61";

    const distributor = await ethers.getContractAt("DividendDistributor", distributorAddress);
    const usdc = await ethers.getContractAt("MockERC20", usdcAddress);

    const [admin, investor1, investor2] = await ethers.getSigners();

    const franchiseId = 1;
    const cycleId = 1;

    // Ver dividendos pendientes antes de reclamar
    console.log("📊 Dividendos Pendientes:");
    const pending1 = await distributor.getPendingDividend(investor1.address, franchiseId, cycleId);
    const pending2 = await distributor.getPendingDividend(investor2.address, franchiseId, cycleId);
    console.log(`Investor 1: ${ethers.formatUnits(pending1, 18)} USD`);
    console.log(`Investor 2: ${ethers.formatUnits(pending2, 18)} USD`);

    // Balances USDC antes
    const usdcBefore1 = await usdc.balanceOf(investor1.address);
    const usdcBefore2 = await usdc.balanceOf(investor2.address);

    // Investor 1 reclama
    console.log("\nInvestor 1 reclamando...");
    let tx = await distributor.connect(investor1).claimDividend(franchiseId, cycleId);
    let receipt = await tx.wait();
    console.log(`✅ Reclamado! TX: ${receipt.hash}`);

    // Investor 2 reclama
    console.log("\nInvestor 2 reclamando...");
    tx = await distributor.connect(investor2).claimDividend(franchiseId, cycleId);
    receipt = await tx.wait();
    console.log(`✅ Reclamado! TX: ${receipt.hash}`);

    // Balances USDC después
    const usdcAfter1 = await usdc.balanceOf(investor1.address);
    const usdcAfter2 = await usdc.balanceOf(investor2.address);

    console.log("\n📊 Resultados:");
    console.log(`Investor 1:`);
    console.log(`  Antes: ${ethers.formatUnits(usdcBefore1, 18)} mUSDC`);
    console.log(`  Después: ${ethers.formatUnits(usdcAfter1, 18)} mUSDC`);
    console.log(`  Ganancia: ${ethers.formatUnits(usdcAfter1 - usdcBefore1, 18)} mUSDC`);

    console.log(`\nInvestor 2:`);
    console.log(`  Antes: ${ethers.formatUnits(usdcBefore2, 18)} mUSDC`);
    console.log(`  Después: ${ethers.formatUnits(usdcAfter2, 18)} mUSDC`);
    console.log(`  Ganancia: ${ethers.formatUnits(usdcAfter2 - usdcBefore2, 18)} mUSDC`);

    console.log("\n✅ Dividendos reclamados exitosamente!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
