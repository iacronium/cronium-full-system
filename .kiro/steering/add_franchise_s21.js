const { ethers } = require("hardhat");

async function main() {
  const tokenizerAddress = "0xAb59a3e3Ae08359139D457975579dA2fdeb0ff5f";
  const tokenizer = await ethers.getContractAt("FranchiseTokenizer", tokenizerAddress);

  // Datos de la nueva franquicia (Antminer S21 XP)
  const name = "Antminer S21 XP";
  // El valor total de 12,000,000,000 representa $12,000.00 USDC (usando 6 decimales)
  const totalValue = 12000000000n; 
  const maxSupply = 10n; // 10 fracciones de $1,200 cada una
  const manager = "0xa7F35507210C1eB6E212911cCc1289AA73e6e7A6";

  console.log(`Creating a new franchise: ${name}...`);
  
  // Llamada al contrato FranchiseTokenizer para registrar el nuevo pool
  const tx = await tokenizer.createFranchise(
    name,
    "CBX",
    totalValue,
    maxSupply,
    manager
  );

  console.log("Transaction sent. Waiting for confirmation on the Sepolia blockchain....");
  await tx.wait();

  const newId = (await tokenizer.nextFranchiseId()) - 1n;
  console.log(`✅ Success! Pool "${name}" created with ID: ${newId}`);
  console.log(`Metadata file symbol (IPFS): CBX`);
}

main().catch(console.error);
