// scripts/deploy_ccip.js
// Script de despliegue para los contratos CCIP de Cronium.
//
// Arquitectura:
//   - CCIPTokenPurchaseSender: se despliega en la cadena ORIGEN (ej. Ethereum Sepolia)
//   - CCIPTokenPurchaseReceiver: se despliega en BASE SEPOLIA (cadena destino)
//
// Este script despliega SOLO el Receiver en Base Sepolia y lo configura
// para aceptar mensajes del Sender en Ethereum Sepolia.
//
// Para desplegar el Sender en Ethereum Sepolia, ejecutar con --network ethereumSepolia
// (requiere agregar esa red en hardhat.config.js).
//
// Direcciones CCIP oficiales:
//   Base Sepolia Router:       0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93
//   Ethereum Sepolia Router:   0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59
//   Base Sepolia Chain Selector:      10344971235874465080
//   Ethereum Sepolia Chain Selector:  16015286601757825753
//   LINK en Base Sepolia:      0xE4aB69C077896252FAFBD49EFD26B5D171A32410
//   LINK en Ethereum Sepolia:  0x779877A7B0D9E8603169DdbD7836e478b4624789

const { ethers } = require("hardhat");

// ============================================
// CONFIGURACIÓN — ajustar según la red
// ============================================
const CONFIG = {
    baseSepolia: {
        ccipRouter: "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93",
        linkToken: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
        chainSelector: "10344971235874465080",
    },
    ethereumSepolia: {
        ccipRouter: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
        linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        chainSelector: "16015286601757825753",
    },
};

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log("=".repeat(60));
    console.log("  DESPLIEGUE CCIP — Cronium MVP");
    console.log("=".repeat(60));
    console.log(`Red: ${network.name} (chainId: ${chainId})`);
    console.log(`Deployer: ${deployer.address}`);

    // ============================================
    // DESPLIEGUE EN BASE SEPOLIA (Receiver)
    // ============================================
    if (chainId === 84532) {
        console.log("\n[BASE SEPOLIA] Desplegando CCIPTokenPurchaseReceiver...");

        // Leer las direcciones del MVP ya desplegado desde variables de entorno
        const complianceManagerAddress = process.env.COMPLIANCE_MANAGER_ADDRESS;
        const paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS;

        if (!complianceManagerAddress || !paymentTokenAddress) {
            throw new Error(
                "Faltan variables de entorno: COMPLIANCE_MANAGER_ADDRESS y PAYMENT_TOKEN_ADDRESS\n" +
                "Agrégalas al .env con las direcciones del MVP ya desplegado."
            );
        }

        console.log(`  ComplianceManager: ${complianceManagerAddress}`);
        console.log(`  PaymentToken (USDC): ${paymentTokenAddress}`);
        console.log(`  CCIP Router: ${CONFIG.baseSepolia.ccipRouter}`);

        const CCIPReceiver = await ethers.getContractFactory("CCIPTokenPurchaseReceiver");
        const receiver = await CCIPReceiver.deploy(
            CONFIG.baseSepolia.ccipRouter,
            complianceManagerAddress,
            paymentTokenAddress
        );
        await receiver.waitForDeployment();
        const receiverAddress = await receiver.getAddress();
        console.log(`\n✓ CCIPTokenPurchaseReceiver desplegado en: ${receiverAddress}`);

        // Otorgar CCIP_RECEIVER_ROLE en ComplianceManager
        console.log("\nConfigurando roles...");
        const ComplianceManager = await ethers.getContractAt("ComplianceManager", complianceManagerAddress);
        const CCIP_RECEIVER_ROLE = await ComplianceManager.CCIP_RECEIVER_ROLE();
        let tx = await ComplianceManager.grantRole(CCIP_RECEIVER_ROLE, receiverAddress);
        await tx.wait(1);
        console.log(`✓ CCIP_RECEIVER_ROLE otorgado al receiver`);

        // Si se conoce la dirección del Sender en Ethereum Sepolia, configurar allowlist
        const senderAddress = process.env.CCIP_SENDER_ADDRESS;
        if (senderAddress) {
            const ethereumSepoliaSelector = CONFIG.ethereumSepolia.chainSelector;
            tx = await receiver.setAllowedSender(ethereumSepoliaSelector, senderAddress, true);
            await tx.wait(1);
            console.log(`✓ Sender autorizado: ${senderAddress} (Ethereum Sepolia)`);
        } else {
            console.log("⚠ CCIP_SENDER_ADDRESS no configurado — autorizar el sender manualmente después.");
        }

        console.log("\n" + "=".repeat(60));
        console.log("  RESUMEN — BASE SEPOLIA");
        console.log("=".repeat(60));
        console.log(`CCIPTokenPurchaseReceiver: "${receiverAddress}"`);
        console.log("\nPróximos pasos:");
        console.log("  1. Agregar CCIP_RECEIVER_ADDRESS=" + receiverAddress + " al .env");
        console.log("  2. Depositar USDC en el receiver para liquidez:");
        console.log("     receiver.depositLiquidity(amount)");
        console.log("  3. Desplegar el Sender en Ethereum Sepolia con --network ethereumSepolia");
    }

    // ============================================
    // DESPLIEGUE EN ETHEREUM SEPOLIA (Sender)
    // ============================================
    else if (chainId === 11155111) {
        console.log("\n[ETHEREUM SEPOLIA] Desplegando CCIPTokenPurchaseSender...");

        const paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS_ETH_SEPOLIA;
        const receiverAddress = process.env.CCIP_RECEIVER_ADDRESS;

        if (!paymentTokenAddress || !receiverAddress) {
            throw new Error(
                "Faltan variables de entorno:\n" +
                "  PAYMENT_TOKEN_ADDRESS_ETH_SEPOLIA — USDC en Ethereum Sepolia\n" +
                "  CCIP_RECEIVER_ADDRESS — dirección del receiver en Base Sepolia"
            );
        }

        const baseSepolia = CONFIG.baseSepolia;
        console.log(`  PaymentToken (USDC): ${paymentTokenAddress}`);
        console.log(`  LINK Token: ${CONFIG.ethereumSepolia.linkToken}`);
        console.log(`  CCIP Router: ${CONFIG.ethereumSepolia.ccipRouter}`);
        console.log(`  Destination (Base Sepolia) selector: ${baseSepolia.chainSelector}`);
        console.log(`  Receiver en Base Sepolia: ${receiverAddress}`);

        const CCIPSender = await ethers.getContractFactory("CCIPTokenPurchaseSender");
        const sender = await CCIPSender.deploy(
            CONFIG.ethereumSepolia.ccipRouter,
            CONFIG.ethereumSepolia.linkToken,
            paymentTokenAddress,
            baseSepolia.chainSelector,
            receiverAddress
        );
        await sender.waitForDeployment();
        const senderAddress = await sender.getAddress();
        console.log(`\n✓ CCIPTokenPurchaseSender desplegado en: ${senderAddress}`);

        console.log("\n" + "=".repeat(60));
        console.log("  RESUMEN — ETHEREUM SEPOLIA");
        console.log("=".repeat(60));
        console.log(`CCIPTokenPurchaseSender: "${senderAddress}"`);
        console.log("\nPróximos pasos:");
        console.log("  1. Agregar CCIP_SENDER_ADDRESS=" + senderAddress + " al .env");
        console.log("  2. Autorizar el sender en el receiver (Base Sepolia):");
        console.log("     receiver.setAllowedSender(ethereumSepoliaSelector, senderAddress, true)");
        console.log("  3. Depositar LINK en el sender para fees:");
        console.log("     sender.depositLinkFees(amount)");
        console.log("  4. Los usuarios deben aprobar USDC al sender antes de llamar sendPurchaseRequest()");
    }

    else {
        console.log(`\n⚠ Red no reconocida (chainId: ${chainId})`);
        console.log("Redes soportadas: baseSepolia (84532), ethereumSepolia (11155111)");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
