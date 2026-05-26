/**
 * setup_post_deploy.js
 *
 * Configura los contratos auxiliares en FranchiseTokenizer después del despliegue.
 * Debe ejecutarse una sola vez tras deploy_mvp.js si no se hizo automáticamente.
 *
 * Acciones:
 *   1. FranchiseTokenizer.setComplianceManager(ComplianceManager)
 *   2. FranchiseTokenizer.setDividendDistributor(DividendDistributor)
 *
 * Uso:
 *   npx hardhat run scripts/setup_post_deploy.js --network baseSepolia
 */
const { ethers } = require("hardhat");

const FRANCHISE_TOKENIZER  = "0xAC566fADcD8fE13A67307d13B994e89bf368447b";
const COMPLIANCE_MANAGER   = "0x0101d356313142a5F6063BFED81C57D836a9EabC";
const DIVIDEND_DISTRIBUTOR = "0x36fe4A50e2aFfBE9D3d03A8b355bc59676D1EEB9";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Configurando FranchiseTokenizer con cuenta:", deployer.address);

    const ft = await ethers.getContractAt("FranchiseTokenizer", FRANCHISE_TOKENIZER);

    // ── 1. Verificar estado actual ────────────────────────────────────────────
    const currentCM = await ft.complianceManager();
    const currentDD = await ft.dividendDistributor();
    console.log("\nEstado actual:");
    console.log("  complianceManager:   ", currentCM);
    console.log("  dividendDistributor: ", currentDD);

    // ── 2. setComplianceManager ───────────────────────────────────────────────
    if (currentCM.toLowerCase() !== COMPLIANCE_MANAGER.toLowerCase()) {
        console.log("\n→ Llamando setComplianceManager...");
        const tx1 = await ft.setComplianceManager(COMPLIANCE_MANAGER);
        await tx1.wait(1);
        console.log("  ✓ ComplianceManager configurado:", COMPLIANCE_MANAGER);
    } else {
        console.log("\n✓ ComplianceManager ya estaba configurado correctamente.");
    }

    // ── 3. setDividendDistributor ─────────────────────────────────────────────
    if (currentDD.toLowerCase() !== DIVIDEND_DISTRIBUTOR.toLowerCase()) {
        console.log("→ Llamando setDividendDistributor...");
        const tx2 = await ft.setDividendDistributor(DIVIDEND_DISTRIBUTOR);
        await tx2.wait(1);
        console.log("  ✓ DividendDistributor configurado:", DIVIDEND_DISTRIBUTOR);
    } else {
        console.log("✓ DividendDistributor ya estaba configurado correctamente.");
    }

    // ── 4. Verificar resultado ────────────────────────────────────────────────
    const newCM = await ft.complianceManager();
    const newDD = await ft.dividendDistributor();
    console.log("\nEstado final:");
    console.log("  complianceManager:   ", newCM);
    console.log("  dividendDistributor: ", newDD);
    console.log("\n✅ Configuración completada.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
