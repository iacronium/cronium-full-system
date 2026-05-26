// scripts/debug_tx.js
const { ethers } = require("hardhat");

async function main() {
    const provider = ethers.provider;
    const walletAddress = "0x406808Fb1C56E8D133a7B03b9f7BC88d6Fe99784";
    const complianceAddress = "0x0101d356313142a5F6063BFED81C57D836a9EabC";
    const mUsdcConfigured = "0x5c040e640aea34CC9ef86548dBAAF15749C1E6e4";
    const mUsdcInContract = "0x5d22C60eFCb70cA752E718187D7C7C1D2a045410";

    const ERC20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];

    console.log("=== Checking Configured mUSDC (0x5c04...) ===");
    try {
        const token = new ethers.Contract(mUsdcConfigured, ERC20Abi, provider);
        const name = await token.name();
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        const balance = await token.balanceOf(walletAddress);
        const allowance = await token.allowance(walletAddress, complianceAddress);
        console.log(`Token Name: ${name} (${symbol})`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Wallet Balance: ${ethers.formatUnits(balance, decimals)} (Raw: ${balance.toString()})`);
        console.log(`Wallet Allowance for ComplianceManager: ${ethers.formatUnits(allowance, decimals)} (Raw: ${allowance.toString()})`);
    } catch (e) {
        console.log("Error querying configured mUSDC:", e.message);
    }

    console.log("\n=== Checking Compliance Contract's mUSDC (0x5d22...) ===");
    try {
        const token = new ethers.Contract(mUsdcInContract, ERC20Abi, provider);
        const name = await token.name();
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        const balance = await token.balanceOf(walletAddress);
        const allowance = await token.allowance(walletAddress, complianceAddress);
        console.log(`Token Name: ${name} (${symbol})`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Wallet Balance: ${ethers.formatUnits(balance, decimals)} (Raw: ${balance.toString()})`);
        console.log(`Wallet Allowance for ComplianceManager: ${ethers.formatUnits(allowance, decimals)} (Raw: ${allowance.toString()})`);
    } catch (e) {
        console.log("Error querying contract's mUSDC:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
