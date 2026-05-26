// scripts/setup_franchise.js
// Run after deploy_mvp.js to create the initial McDonald's franchise and seed it.
const { ethers } = require("hardhat");

const FRANCHISE_TOKENIZER_ADDRESS = "0x4b740015a2d61d9FA38780885b9BEf5596fBF4e7";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Setting up franchise with account:", deployer.address);

    const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
    const tokenizer = FranchiseTokenizer.attach(FRANCHISE_TOKENIZER_ADDRESS);

    // Check if franchise #1 already exists
    const nextId = await tokenizer.nextFranchiseId();
    console.log(`Next franchise ID: ${nextId}`);

    if (nextId > 1n) {
        console.log("Franchise #1 already exists — skipping creation.");
        const info = await tokenizer.getFranchiseInfo(1);
        console.log("Franchise #1:", info.name, "| Active:", info.isActive);
        return;
    }

    console.log("Creating Franchise #1: McDonald's Local #12...");
    // totalValue = 75,000 USDC (6 decimals) = 75_000 * 10^6
    const totalValue = ethers.parseUnits("75000", 6);
    // maxSupply = 1000 tokens
    const maxSupply = 1000n;

    const tx = await tokenizer.createFranchise(
        "McDonald's Local #12",
        "MCD",
        totalValue,
        maxSupply,
        deployer.address
    );
    await tx.wait(1);

    console.log("✅ Franchise #1 created successfully!");
    // Re-fetch after creation
    const info2 = await tokenizer.getFranchiseInfo(1);
    console.log(`   Name: ${info2.name}`);
    console.log(`   Total Value: ${ethers.formatUnits(info2.totalValue, 6)} USDC`);
    console.log(`   Max Supply: ${info2.maxSupply} tokens`);
    console.log(`   Is Active: ${info2.isActive}`);
    console.log("\nFrontend is ready — franchise token metadata will now show the full name in Metamask!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
