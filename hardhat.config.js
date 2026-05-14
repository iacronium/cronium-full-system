// Carga las herramientas de Hardhat y la configuración de variables de entorno.
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Se obtienen las variables del archivo .env o se usan valores por defecto para pruebas locales.
const YOUR_PRIVATE_KEY = process.env.YOUR_PRIVATE_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const YOUR_INFURA_KEY = process.env.YOUR_INFURA_KEY || "";
const YOUR_ALCHEMY_BASE_KEY = process.env.YOUR_ALCHEMY_BASE_KEY || "pVGZiqtnbazA9X4jImXiU";
const YOUR_ALCHEMY_ETH_KEY = process.env.YOUR_ALCHEMY_ETH_KEY || "XsVbHiLZ2kp78VJvghxYL";
// BaseScan migró a Etherscan API V2 — una sola key sirve para Base y Ethereum.
// YOUR_ETHERSCAN_API_KEY se usa para ambas redes.
// YOUR_BASESCAN_API_KEY se mantiene como fallback por compatibilidad.
const YOUR_BASESCAN_API_KEY = process.env.YOUR_BASESCAN_API_KEY || "";
const YOUR_ETHERSCAN_API_KEY = process.env.YOUR_ETHERSCAN_API_KEY || YOUR_BASESCAN_API_KEY;

// Solo alertar si no estamos en la red local de Hardhat y faltan las claves.
const isHardhatNetwork = !process.argv.includes("--network") || process.argv.includes("hardhat");

if (!isHardhatNetwork && (!process.env.YOUR_PRIVATE_KEY || !process.env.YOUR_INFURA_KEY)) {
  console.warn("ADVERTENCIA: Faltan variables de entorno para redes externas.");
}

// El bloque de la tarea "toggle-demo-mode" ha sido eliminado para centralizar la lógica
// en el script de despliegue.

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    baseSepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${YOUR_ALCHEMY_BASE_KEY}`,
      // Hardhat espera la clave privada sin el prefijo '0x'.
      // Asegúrate de que en tu archivo .env la clave esté guardada sin él.
      accounts: [YOUR_PRIVATE_KEY],
      chainId: 84532,
    },
    ethereumSepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${YOUR_ALCHEMY_ETH_KEY}`,
      accounts: [YOUR_PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    // Etherscan API V2 — una sola key string cubre todas las redes EVM incluyendo Base.
    // Ver: https://docs.etherscan.io/v2-migration
    apiKey: YOUR_ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "ethereumSepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};