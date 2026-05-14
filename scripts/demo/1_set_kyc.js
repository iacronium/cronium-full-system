// scripts/demo/1_set_kyc.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🔐 Configurando KYC para inversores...\n");

    const complianceAddress = "0x9Ea652E99B9D488e53e418726642d872824c75D4";
    const compliance = await ethers.getContractAt("ComplianceManager", complianceAddress);

    // Obtener signers
    const [admin, investor1, investor2] = await ethers.getSigners();

    console.log("Admin:", admin.address);
    console.log("Investor 1:", investor1.address);
    console.log("Investor 2:", investor2.address);
    console.log();

    // Verificar KYC para investor1 (2 = Verified)
    console.log("Verificando KYC para Investor 1...");
    let tx = await compliance.setKYCStatus(investor1.address, 2);
    await tx.wait();
    console.log("✅ KYC Verificado para Investor 1");

    // Verificar KYC para investor2
    console.log("Verificando KYC para Investor 2...");
    tx = await compliance.setKYCStatus(investor2.address, 2);
    await tx.wait();
    console.log("✅ KYC Verificado para Investor 2");

    // Verificar estados
    console.log("\n📋 Estados KYC:");
    const status1 = await compliance.kycStatus(investor1.address);
    const status2 = await compliance.kycStatus(investor2.address);
    console.log(`Investor 1: ${status1} (2 = Verified)`);
    console.log(`Investor 2: ${status2} (2 = Verified)`);

    console.log("\n✅ Configuración KYC completada!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
