// scripts/mint_to_user.js
const { ethers } = require("hardhat");

async function main() {
    // La dirección del otro usuario que necesita los tokens
    const targetUser = "0x406808Fb1C56E8D133a7B03b9f7BC88d6Fe99784";
    
    // Dirección del Mock USDC actual en Base Sepolia
    const mockUsdcAddress = "0x5d22C60eFCb70cA752E718187D7C7C1D2a045410";

    console.log(`Iniciando el minteo de 10,000 mUSDC para la dirección: ${targetUser}`);

    const [deployer] = await ethers.getSigners();
    console.log("Ejecutando la transacción desde el Owner:", deployer.address);

    // Obtener la instancia del contrato
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const paymentToken = MockERC20.attach(mockUsdcAddress);

    // Minar 10,000 mUSDC (el token tiene 18 decimales)
    const amountToMint = ethers.parseUnits("10000", 18);
    
    console.log("Enviando transacción...");
    const tx = await paymentToken.mint(targetUser, amountToMint);
    await tx.wait(1);

    console.log(`¡Éxito! Se han minado y enviado 10,000 mUSDC a ${targetUser}.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
