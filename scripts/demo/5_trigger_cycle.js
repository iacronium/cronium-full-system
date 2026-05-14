// scripts/demo/5_trigger_cycle.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Creando ciclo de dividendos...\n");

    const distributorAddress = "0xC8e3575e66FB54d0B00237f9b17dc6e05BF8d4B1";
    const distributor = await ethers.getContractAt("DividendDistributor", distributorAddress);

    const franchiseId = 1;
    const performData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [franchiseId]);

    console.log("Ejecutando performUpkeep (simula Chainlink Automation)...");
    const tx = await distributor.performUpkeep(performData);
    const receipt = await tx.wait();

    const cycleId = await distributor.currentCycleId(franchiseId);
    console.log(`✅ Ciclo de dividendos creado: #${cycleId}`);
    console.log(`TX Hash: ${receipt.hash}`);

    // Obtener información del ciclo
    const cycleInfo = await distributor.getDividendCycleInfo(franchiseId, cycleId);
    console.log(`\n📊 Información del Ciclo #${cycleId}:`);
    console.log(`  Total Amount: ${ethers.formatUnits(cycleInfo.totalAmount, 18)} USD`);
    console.log(`  Timestamp: ${new Date(Number(cycleInfo.timestamp) * 1000).toLocaleString()}`);

    console.log("\n✅ Ciclo creado exitosamente!");
    console.log(`\n🔗 Ver en BaseScan: https://sepolia.basescan.org/tx/${receipt.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
