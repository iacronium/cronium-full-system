// scripts/demo/3_purchase_tokens.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🛒 Comprando tokens de franquicia...\n");

    const complianceAddress = "0x9Ea652E99B9D488e53e418726642d872824c75D4";
    const tokenizerAddress = "0xAb59a3e3Ae08359139D457975579dA2fdeb0ff5f";
    const usdcAddress = "0x70Fef40966f45fA2cdf2c241c247D806B9E24d61";

    const compliance = await ethers.getContractAt("ComplianceManager", complianceAddress);
    const tokenizer = await ethers.getContractAt("FranchiseTokenizer", tokenizerAddress);
    const usdc = await ethers.getContractAt("MockERC20", usdcAddress);

    // Obtener signers
    const [admin, investor1, investor2] = await ethers.getSigners();

    const franchiseId = 1;

    // Investor 1 compra 750 tokens por $7,500
    console.log("Investor 1 comprando 750 tokens...");
    const tokens1 = 750;
    const payment1 = ethers.parseUnits("7500", 18);

    let tx = await usdc.connect(investor1).approve(complianceAddress, payment1);
    await tx.wait();
    console.log("  ✅ USDC aprobado");

    tx = await compliance.connect(investor1).purchaseTokens(franchiseId, tokens1, payment1);
    let receipt = await tx.wait();
    console.log(`  ✅ Tokens comprados! TX: ${receipt.hash}`);

    // Investor 2 compra 250 tokens por $2,500
    console.log("\nInvestor 2 comprando 250 tokens...");
    const tokens2 = 250;
    const payment2 = ethers.parseUnits("2500", 18);

    tx = await usdc.connect(investor2).approve(complianceAddress, payment2);
    await tx.wait();
    console.log("  ✅ USDC aprobado");

    tx = await compliance.connect(investor2).purchaseTokens(franchiseId, tokens2, payment2);
    receipt = await tx.wait();
    console.log(`  ✅ Tokens comprados! TX: ${receipt.hash}`);

    // Verificar balances
    console.log("\n📊 Balances de Tokens:");
    const balance1 = await tokenizer.balanceOf(investor1.address, franchiseId);
    const balance2 = await tokenizer.balanceOf(investor2.address, franchiseId);
    const totalSupply = await tokenizer.totalSupply(franchiseId);

    console.log(`Investor 1: ${balance1} tokens (${(Number(balance1) / Number(totalSupply) * 100).toFixed(1)}%)`);
    console.log(`Investor 2: ${balance2} tokens (${(Number(balance2) / Number(totalSupply) * 100).toFixed(1)}%)`);
    console.log(`Total Supply: ${totalSupply} tokens`);

    console.log("\n✅ Compras completadas!");
    console.log(`\n🔗 Ver en BaseScan: https://sepolia.basescan.org/address/${tokenizerAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
