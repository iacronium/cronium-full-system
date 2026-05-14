// scripts/mint_fractions.js
const { ethers } = require("hardhat");

async function main() {
    const franchiseTokenizerAddress = "0xAb59a3e3Ae08359139D457975579dA2fdeb0ff5f";
    const [deployer] = await ethers.getSigners();
    const franchiseTokenizer = await ethers.getContractAt("FranchiseTokenizer", franchiseTokenizerAddress);

    const franchiseId = 2; // McDonald's Local #12
    const amount = 650000;

    console.log(`Minting ${amount} tokens for Franchise #${franchiseId}...`);

    const tx = await franchiseTokenizer.mintTokens(
        franchiseId,
        deployer.address,
        amount,
        "0x"
    );

    await tx.wait();
    console.log("Tokens minted successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
