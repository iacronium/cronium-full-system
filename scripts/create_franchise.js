// scripts/create_franchise.js
const { ethers } = require("hardhat");

async function main() {
    console.log("Preparando para crear una nueva franquicia...");

    const franchiseTokenizerAddress = "0xAb59a3e3Ae08359139D457975579dA2fdeb0ff5f";
    const [deployer] = await ethers.getSigners();

    console.log(`Usando la cuenta del manager: ${deployer.address}`);

    const franchiseTokenizer = await ethers.getContractAt("FranchiseTokenizer", franchiseTokenizerAddress);

    console.log("Llamando a la función createFranchise para McDonald's Local #12...");

    // 1M Tokens, $1.25M Total Value (6 decimals for USDC/Value)
    const tx = await franchiseTokenizer.connect(deployer).createFranchise(
        "McDonald's Local #12",
        ethers.parseUnits("1250000", 6),
        1000000,
        deployer.address
    );

    console.log("Esperando el recibo de la transacción...");
    const receipt = await tx.wait();
    console.log("¡Transacción exitosa! Hash:", receipt.hash);

    const event = receipt.logs.find(e => e.fragment && e.fragment.name === 'FranchiseCreated');

    if (event) {
        const franchiseId = event.args.franchiseId;
        console.log(`Franquicia creada con el ID: ${franchiseId.toString()}`);
    }

    const newNextId = await franchiseTokenizer.nextFranchiseId();
    console.log(`El nuevo valor de nextFranchiseId es: ${newNextId.toString()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});