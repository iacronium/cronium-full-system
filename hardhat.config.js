// Carga las herramientas de Hardhat y la configuración de variables de entorno.
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Se obtienen las variables del archivo .env para mantener las claves seguras.
const { YOUR_PRIVATE_KEY, YOUR_INFURA_KEY, YOUR_BASESCAN_API_KEY } = process.env;

// Verificación para asegurar que las variables de entorno están presentes.
if (!YOUR_PRIVATE_KEY || !YOUR_INFURA_KEY || !YOUR_BASESCAN_API_KEY) {
  console.error("Por favor, asegúrate de que las variables YOUR_PRIVATE_KEY, YOUR_INFURA_KEY, y YOUR_BASESCAN_API_KEY están definidas en tu archivo .env");
  process.exit(1);
}

// El bloque de la tarea "toggle-demo-mode" ha sido eliminado para centralizar la lógica
// en el script de despliegue.

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    baseSepolia: {
      url: `https://base-sepolia.infura.io/v3/${YOUR_INFURA_KEY}`,
      // Hardhat espera la clave privada sin el prefijo '0x'.
      // Asegúrate de que en tu archivo .env la clave esté guardada sin él.
      accounts: [YOUR_PRIVATE_KEY],
      chainId: 84532,
    },
  },
  etherscan: {
    // Formato actualizado para la API de Etherscan.
    apiKey: YOUR_BASESCAN_API_KEY,
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
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