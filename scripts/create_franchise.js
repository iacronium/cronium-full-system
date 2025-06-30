// scripts/create_franchise.js
const { ethers } = require("hardhat");

async function main() {
    console.log("Preparando para crear una nueva franquicia...");

    const franchiseTokenizerAddress = "0x8434DA43Bb2DbC09D380097F77648Ecdd12e7Bb4"; 
    const [deployer] = await ethers.getSigners();
    
    console.log(`Usando la cuenta del manager: ${deployer.address}`);

    const franchiseTokenizer = await ethers.getContractAt("FranchiseTokenizer", franchiseTokenizerAddress);

    console.log("Llamando a la función createFranchise...");

    const tx = await franchiseTokenizer.connect(deployer).createFranchise(
        "Cronium Burger #1",
        ethers.parseUnits("100000", 6),
        10000,
        deployer.address
    );

    console.log("Esperando el recibo de la transacción...");
    const receipt = await tx.wait();
    console.log("¡Transacción exitosa! Hash:", receipt.hash);

    // --- LÓGICA MEJORADA PARA OBTENER EL ID ---
    // Buscamos en los logs del recibo el evento 'FranchiseCreated'
    const event = receipt.logs.find(e => e.eventName === 'FranchiseCreated');
    
    if (event) {
        const franchiseId = event.args.franchiseId;
        console.log(`Franquicia "Cronium Burger #1" creada con el ID: ${franchiseId.toString()}`);
    } else {
        console.error("No se pudo encontrar el evento FranchiseCreated en la transacción.");
    }
    
    const newNextId = await franchiseTokenizer.nextFranchiseId();
    console.log(`El nuevo valor de nextFranchiseId es: ${newNextId.toString()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});