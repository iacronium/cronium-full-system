// scripts/deploy_mvp.js
const { ethers } = require("hardhat");

async function main() {
    console.log("Iniciando el despliegue del MVP de Cronium...");

    const [deployer] = await ethers.getSigners();
    console.log("Desplegando contratos con la cuenta:", deployer.address);
    
    const treasuryAddress = deployer.address;
    console.log(`La Tesorería será: ${treasuryAddress}`);

    // --- 1. Despliegue de Contratos ---
    console.log("\n1. Desplegando MockERC20 (PaymentToken)...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const paymentToken = await MockERC20.deploy("Mock USDC", "mUSDC");
    await paymentToken.waitForDeployment();
    console.log(`-> Contrato MockERC20 desplegado en: ${await paymentToken.getAddress()}`);

    console.log("\n2. Desplegando FranchiseTokenizer...");
    const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
    const franchiseTokenizer = await FranchiseTokenizer.deploy("ipfs://cronium-meta/");
    await franchiseTokenizer.waitForDeployment();
    console.log(`-> Contrato FranchiseTokenizer desplegado en: ${await franchiseTokenizer.getAddress()}`);
    
    console.log("\n3. Desplegando ComplianceManager...");
    const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
    const complianceManager = await ComplianceManager.deploy(
        await franchiseTokenizer.getAddress(),
        await paymentToken.getAddress(),
        treasuryAddress
    );
    await complianceManager.waitForDeployment();
    console.log(`-> Contrato ComplianceManager desplegado en: ${await complianceManager.getAddress()}`);
    
    console.log("\n4. Desplegando DividendDistributor...");
    const ONE_HOUR_IN_SECS = 60 * 60; 
    const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
    const dividendDistributor = await DividendDistributor.deploy(
        await franchiseTokenizer.getAddress(),
        await paymentToken.getAddress(),
        ONE_HOUR_IN_SECS
    );
    await dividendDistributor.waitForDeployment();
    console.log(`-> Contrato DividendDistributor desplegado en: ${await dividendDistributor.getAddress()}`);

    // --- 5. FASE DE CONFIGURACIÓN POST-DESPLIEGUE ---
    console.log("\n5. Configurando roles y estado inicial...");

    // Se declara 'tx' aquí para poder reutilizarla.
    let tx;

    console.log("-> Otorgando MINTER_ROLE a ComplianceManager...");
    const MINTER_ROLE = await franchiseTokenizer.MINTER_ROLE();
    tx = await franchiseTokenizer.grantRole(MINTER_ROLE, await complianceManager.getAddress());
    await tx.wait(1); // Espera 1 confirmación de bloque.
    console.log("   MINTER_ROLE otorgado.");
    
    console.log("-> Activando el modo demo para pruebas...");
    tx = await complianceManager.setDemoMode(true);
    await tx.wait(1); // Espera 1 confirmación de bloque.
    
    const currentMode = await complianceManager.demoModeActive();
    console.log(`   ¡Modo demo activado! El estado actual es: ${currentMode}`);

    console.log("-> Configurando ComplianceManager en FranchiseTokenizer...");
    tx = await franchiseTokenizer.setComplianceManager(await complianceManager.getAddress());
    await tx.wait(1);
    console.log("   ComplianceManager configurado en el Tokenizer.");

    console.log("\n¡Despliegue y configuración del MVP completados exitosamente!");
    console.log("----------------------------------------------------");
    console.log("NUEVAS DIRECCIONES PARA EL FRONTEND:");
    console.log(`FranchiseTokenizer: "${await franchiseTokenizer.getAddress()}"`);
    console.log(`ComplianceManager: "${await complianceManager.getAddress()}"`);
    console.log(`DividendDistributor: "${await dividendDistributor.getAddress()}"`);
    console.log(`PaymentToken: "${await paymentToken.getAddress()}"`);
    console.log("----------------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});