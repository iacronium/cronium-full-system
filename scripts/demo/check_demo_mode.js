const { ethers } = require("hardhat");
async function main() {
    const complianceAddress = "0x9Ea652E99B9D488e53e418726642d872824c75D4";
    const compliance = await ethers.getContractAt("ComplianceManager", complianceAddress);
    const demoMode = await compliance.demoModeActive();
    console.log("Demo Mode Active:", demoMode);
}
main().catch(console.error);
