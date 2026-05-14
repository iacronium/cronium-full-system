// scripts/demo/run_full_demo.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🎬 CRONIUM MVP - DEMO COMPLETO");
    console.log("=".repeat(60));
    console.log();

    const complianceAddress = "0x9Ea652E99B9D488e53e418726642d872824c75D4";
    const tokenizerAddress = "0xAb59a3e3Ae08359139D457975579dA2fdeb0ff5f";
    const distributorAddress = "0xC8e3575e66FB54d0B00237f9b17dc6e05BF8d4B1";
    const usdcAddress = "0x70Fef40966f45fA2cdf2c241c247D806B9E24d61";

    const compliance = await ethers.getContractAt("ComplianceManager", complianceAddress);
    const tokenizer = await ethers.getContractAt("FranchiseTokenizer", tokenizerAddress);
    const distributor = await ethers.getContractAt("DividendDistributor", distributorAddress);
    const usdc = await ethers.getContractAt("MockERC20", usdcAddress);

    const [admin, investor1, investor2] = await ethers.getSigners();
    const franchiseId = 1;

    console.log("📋 Información del Sistema:");
    console.log(`Admin: ${admin.address}`);
    console.log(`Investor 1: ${investor1.address}`);
    console.log(`Investor 2: ${investor2.address}`);
    console.log();

    // PASO 1: KYC
    console.log("PASO 1: Configurando KYC");
    console.log("-".repeat(60));
    let tx = await compliance.setKYCStatus(investor1.address, 2);
    await tx.wait();
    tx = await compliance.setKYCStatus(investor2.address, 2);
    await tx.wait();
    console.log("✅ KYC verificado para ambos inversores\n");

    // PASO 2: Mintear USDC
    console.log("PASO 2: Minteando mUSDC");
    console.log("-".repeat(60));
    tx = await usdc.mint(investor1.address, ethers.parseUnits("10000", 18));
    await tx.wait();
    tx = await usdc.mint(investor2.address, ethers.parseUnits("5000", 18));
    await tx.wait();
    console.log("✅ 10,000 mUSDC → Investor 1");
    console.log("✅ 5,000 mUSDC → Investor 2\n");

    // PASO 3: Comprar Tokens
    console.log("PASO 3: Comprando Tokens de Franquicia");
    console.log("-".repeat(60));

    // Investor 1: 750 tokens
    tx = await usdc.connect(investor1).approve(complianceAddress, ethers.parseUnits("7500", 18));
    await tx.wait();
    tx = await compliance.connect(investor1).purchaseTokens(franchiseId, 750, ethers.parseUnits("7500", 18));
    await tx.wait();
    console.log("✅ Investor 1 compró 750 tokens ($7,500)");

    // Investor 2: 250 tokens
    tx = await usdc.connect(investor2).approve(complianceAddress, ethers.parseUnits("2500", 18));
    await tx.wait();
    tx = await compliance.connect(investor2).purchaseTokens(franchiseId, 250, ethers.parseUnits("2500", 18));
    await tx.wait();
    console.log("✅ Investor 2 compró 250 tokens ($2,500)\n");

    // Verificar balances
    const balance1 = await tokenizer.balanceOf(investor1.address, franchiseId);
    const balance2 = await tokenizer.balanceOf(investor2.address, franchiseId);
    console.log(`📊 Participación:`);
    console.log(`   Investor 1: ${balance1} tokens (75%)`);
    console.log(`   Investor 2: ${balance2} tokens (25%)\n`);

    // PASO 4: Depositar Dividendos
    console.log("PASO 4: Depositando Dividendos");
    console.log("-".repeat(60));
    tx = await usdc.mint(admin.address, ethers.parseUnits("10000", 18));
    await tx.wait();
    tx = await usdc.approve(distributorAddress, ethers.parseUnits("10000", 18));
    await tx.wait();
    tx = await distributor.depositDividends(franchiseId, ethers.parseUnits("10000", 18));
    await tx.wait();
    console.log("✅ $10,000 depositados para distribución\n");

    // PASO 5: Crear Ciclo de Dividendos
    console.log("PASO 5: Creando Ciclo de Dividendos");
    console.log("-".repeat(60));
    const performData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [franchiseId]);
    tx = await distributor.performUpkeep(performData);
    await tx.wait();
    const cycleId = await distributor.currentCycleId(franchiseId);
    console.log(`✅ Ciclo #${cycleId} creado\n`);

    // PASO 6: Reclamar Dividendos
    console.log("PASO 6: Reclamando Dividendos");
    console.log("-".repeat(60));

    const pending1 = await distributor.getPendingDividend(investor1.address, franchiseId, cycleId);
    const pending2 = await distributor.getPendingDividend(investor2.address, franchiseId, cycleId);

    console.log(`Dividendos pendientes:`);
    console.log(`   Investor 1: $${ethers.formatUnits(pending1, 18)}`);
    console.log(`   Investor 2: $${ethers.formatUnits(pending2, 18)}\n`);

    const usdcBefore1 = await usdc.balanceOf(investor1.address);
    const usdcBefore2 = await usdc.balanceOf(investor2.address);

    tx = await distributor.connect(investor1).claimDividend(franchiseId, cycleId);
    await tx.wait();
    tx = await distributor.connect(investor2).claimDividend(franchiseId, cycleId);
    await tx.wait();

    const usdcAfter1 = await usdc.balanceOf(investor1.address);
    const usdcAfter2 = await usdc.balanceOf(investor2.address);

    console.log("✅ Dividendos reclamados:");
    console.log(`   Investor 1 recibió: $${ethers.formatUnits(usdcAfter1 - usdcBefore1, 18)}`);
    console.log(`   Investor 2 recibió: $${ethers.formatUnits(usdcAfter2 - usdcBefore2, 18)}\n`);

    // RESUMEN FINAL
    console.log("=".repeat(60));
    console.log("🎉 DEMO COMPLETADO EXITOSAMENTE");
    console.log("=".repeat(60));
    console.log();
    console.log("📊 Resumen Final:");
    console.log(`   Total Invertido: $10,000`);
    console.log(`   Total Dividendos: $10,000`);
    console.log(`   Investor 1: 750 tokens → $7,500 dividendos`);
    console.log(`   Investor 2: 250 tokens → $2,500 dividendos`);
    console.log();
    console.log("🔗 Ver en BaseScan:");
    console.log(`   FranchiseTokenizer: https://sepolia.basescan.org/address/${tokenizerAddress}`);
    console.log(`   ComplianceManager: https://sepolia.basescan.org/address/${complianceAddress}`);
    console.log(`   DividendDistributor: https://sepolia.basescan.org/address/${distributorAddress}`);
    console.log();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
