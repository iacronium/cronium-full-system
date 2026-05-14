// scripts/fix_gas_limit.js
// Actualiza el destinationGasLimit en CCIPTokenPurchaseSender.
// El error "out of gas on destination chain" indica que 300,000 no es suficiente
// para purchaseTokensFor + KYC check + ERC-1155 mint en Base Sepolia.
// Subimos a 500,000 con margen holgado.
//
// Ejecutar con: npx hardhat run scripts/fix_gas_limit.js --network ethereumSepolia

const { ethers } = require("hardhat");

const NEW_GAS_LIMIT = 500_000;

const SENDER_ABI = [
    "function destinationGasLimit() view returns (uint256)",
    "function setDestinationGasLimit(uint256 newGasLimit)",
];

async function main() {
    const [deployer] = await ethers.getSigners();
    const senderAddress = process.env.CCIP_SENDER_ADDRESS;
    if (!senderAddress) throw new Error("Falta CCIP_SENDER_ADDRESS en .env");

    const sender = new ethers.Contract(senderAddress, SENDER_ABI, deployer);

    const current = await sender.destinationGasLimit();
    console.log(`Gas limit actual:  ${current.toString()}`);
    console.log(`Gas limit nuevo:   ${NEW_GAS_LIMIT}`);

    const tx = await sender.setDestinationGasLimit(NEW_GAS_LIMIT);
    console.log(`Tx: ${tx.hash}`);
    await tx.wait(1);

    const updated = await sender.destinationGasLimit();
    console.log(`✓ Gas limit actualizado a: ${updated.toString()}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
