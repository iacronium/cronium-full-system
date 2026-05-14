const hre = require("hardhat");
require('dotenv').config();

async function main() {
    const franchiseAddress = process.env.FRANCHISE_TOKENIZER_ADDRESS;
    
    if (!franchiseAddress) {
        console.error("❌ FRANCHISE_TOKENIZER_ADDRESS not found in .env");
        process.exit(1);
    }

    console.log("📋 Checking franchise info...");
    console.log("Address:", franchiseAddress);
    
    const FranchiseTokenizer = await hre.ethers.getContractAt(
        "FranchiseTokenizer",
        franchiseAddress
    );

    const franchiseId = 1;
    const info = await FranchiseTokenizer.getFranchiseInfo(franchiseId);
    
    console.log("\n✅ Franchise #1 Info:");
    console.log("Name:", info.name);
    console.log("Total Value:", hre.ethers.formatUnits(info.totalValue, 6), "USDC");
    console.log("Max Supply:", info.maxSupply.toString());
    console.log("Current Supply:", info.currentSupply.toString());
    console.log("Is Active:", info.isActive);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
