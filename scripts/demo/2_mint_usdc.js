// scripts/demo/2_mint_usdc.js
const { ethers } = require("hardhat");

async function main() {
    console.log("💵 Minteando mUSDC para inversores...\n");

    const usdcAddress = "0x70Fef40966f45fA2cdf2c241c247D806B9E24d61";
    const usdc = await ethers.getContractAt("MockERC20", usdcAddress);

    // Obtener signers
    const [admin, investor1, investor2] = await ethers.getSigners();

    const amount1 = ethers.parseUnits("10000", 18); // 10,000 mUSDC
    const amount2 = ethers.parseUnits("5000", 18);  // 5,000 mUSDC

    // Mintear a Investor 1
    console.log(`Minteando 10,000 mUSDC a ${investor1.address}...`);
    let tx = await usdc.mint(investor1.address, amount1);
    await tx.wait();
    console.log("✅ Completado");

    // Mintear a Investor 2
    console.log(`Minteando 5,000 mUSDC a ${investor2.address}...`);
    tx = await usdc.mint(investor2.address, amount2);
    await tx.wait();
    console.log("✅ Completado");

    // Verificar balances
    console.log("\n📊 Balances:");
    const balance1 = await usdc.balanceOf(investor1.address);
    const balance2 = await usdc.balanceOf(investor2.address);
    console.log(`Investor 1: ${ethers.formatUnits(balance1, 18)} mUSDC`);
    console.log(`Investor 2: ${ethers.formatUnits(balance2, 18)} mUSDC`);

    console.log("\n✅ Minteo completado!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
