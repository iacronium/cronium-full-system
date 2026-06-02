const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`Account used: ${signer.address}`);

  const tokenizerAddress = process.env.FRANCHISE_TOKENIZER_ADDRESS || "0xAC566fADcD8fE13A67307d13B994e89bf368447b";
  const tokenizer = await ethers.getContractAt("FranchiseTokenizer", tokenizerAddress);

  // Diagnóstico de Permisos
  const MANAGER_ROLE = await tokenizer.MANAGER_ROLE();
  const hasManagerRole = await tokenizer.hasRole(MANAGER_ROLE, signer.address);
  console.log(`¿Tiene permisos de Manager (MANAGER_ROLE)?: ${hasManagerRole}`);

  if (!hasManagerRole) {
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const hasAdminRole = await tokenizer.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
    if (hasAdminRole) {
      throw new Error("❌ La cuenta tiene permisos de Administrador pero no de Manager (MANAGER_ROLE). Debes auto-asignarte el rol MANAGER_ROLE primero.");
    } else {
      throw new Error("❌ La cuenta actual no tiene permisos de MANAGER_ROLE para crear franquicias en este contrato.");
    }
  }

  // Datos de la nueva franquicia (Antminer S21 XP)
  const name = "S21 XP 270 TH";
  // El valor total de 12,000,000,000 representa $12,000.00 USDC (usando 6 decimales)
  const totalValue = 12000000000n; 
  const maxSupply = 10n; // 10 fracciones de $1,200 cada una
  const manager = "0xa7F35507210C1eB6E212911cCc1289AA73e6e7A6";

  console.log(`Creando nueva franquicia: ${name}...`);
  
  let tx;
  let usedSymbol = "CBX";
  try {
    tx = await tokenizer.createFranchise(
      name,
      usedSymbol,
      totalValue,
      maxSupply,
      manager
    );
  } catch (err) {
    console.log("⚠️ El contrato desplegado no soporta el parámetro 'symbol' (versión antigua de 4 argumentos). Usando fallback de 4 argumentos...");
    const tokenizer4 = new ethers.Contract(
      tokenizerAddress,
      [
        "function createFranchise(string name, uint256 totalValue, uint256 maxSupply, address manager) external"
      ],
      signer
    );
    tx = await tokenizer4.createFranchise(
      name,
      totalValue,
      maxSupply,
      manager
    );
    usedSymbol = "N/A (No soportado en este contrato)";
  }

  console.log("Transacción enviada. Esperando confirmación en Base Sepolia...");
  await tx.wait();

  const newId = (await tokenizer.nextFranchiseId()) - 1n;
  console.log(`✅ ¡Éxito! Franquicia "${name}" creada con ID: ${newId}`);
  console.log(`Símbolo para el archivo de metadata (IPFS): ${usedSymbol}`);
}

main().catch(console.error);