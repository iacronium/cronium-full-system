// scripts/authorize_sender.js
// Autoriza el CCIPTokenPurchaseSender (Ethereum Sepolia) en el
// CCIPTokenPurchaseReceiver (Base Sepolia) para que pueda enviar mensajes CCIP.
// Ejecutar con: npx hardhat run scripts/authorize_sender.js --network baseSepolia

const { ethers } = require("hardhat");

const ETHEREUM_SEPOLIA_CHAIN_SELECTOR = "16015286601757825753";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Red: ${network.name} (chainId: ${Number(network.chainId)})`);
    console.log(`Deployer: ${deployer.address}`);

    const receiverAddress = process.env.CCIP_RECEIVER_ADDRESS;
    const senderAddress   = process.env.CCIP_SENDER_ADDRESS;

    if (!receiverAddress || !senderAddress) {
        throw new Error(
            "Faltan variables de entorno:\n" +
            "  CCIP_RECEIVER_ADDRESS — receiver en Base Sepolia\n" +
            "  CCIP_SENDER_ADDRESS   — sender en Ethereum Sepolia"
        );
    }

    console.log(`\nReceiver (Base Sepolia):    ${receiverAddress}`);
    console.log(`Sender (Ethereum Sepolia):  ${senderAddress}`);
    console.log(`Chain selector Eth Sepolia: ${ETHEREUM_SEPOLIA_CHAIN_SELECTOR}`);

    const receiver = await ethers.getContractAt("CCIPTokenPurchaseReceiver", receiverAddress);

    // Check if already authorized
    const alreadyAllowed = await receiver.allowedSenders(ETHEREUM_SEPOLIA_CHAIN_SELECTOR, senderAddress);
    if (alreadyAllowed) {
        console.log("\n✓ Sender ya está autorizado — nada que hacer.");
        return;
    }

    console.log("\nAutorizando sender...");
    const tx = await receiver.setAllowedSender(ETHEREUM_SEPOLIA_CHAIN_SELECTOR, senderAddress, true);
    console.log(`  Tx enviada: ${tx.hash}`);
    await tx.wait(1);
    console.log("✓ Sender autorizado correctamente.");

    // Verify
    const isAllowed = await receiver.allowedSenders(ETHEREUM_SEPOLIA_CHAIN_SELECTOR, senderAddress);
    console.log(`\nVerificación: allowedSenders[${ETHEREUM_SEPOLIA_CHAIN_SELECTOR}][${senderAddress}] = ${isAllowed}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
