const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FranchiseTokenizer", function () {
    let franchiseTokenizer;
    let owner, manager, minter, user1;
    let MANAGER_ROLE, MINTER_ROLE;

    beforeEach(async function () {
        [owner, manager, minter, user1] = await ethers.getSigners();
        const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
        const initialUri = "ipfs://your-cid-prefix/{id}.json";
        franchiseTokenizer = await FranchiseTokenizer.deploy(initialUri);
        
        MANAGER_ROLE = await franchiseTokenizer.MANAGER_ROLE();
        MINTER_ROLE = await franchiseTokenizer.MINTER_ROLE();
        
        await franchiseTokenizer.connect(owner).grantRole(MANAGER_ROLE, manager.address);
        await franchiseTokenizer.connect(owner).grantRole(MINTER_ROLE, minter.address);
    });

    describe("Creación de Franquicias", function () {
        it("Debería crear una franquicia correctamente con datos válidos", async function () {
            const franchiseId = await franchiseTokenizer.nextFranchiseId();
            
            await expect(
                franchiseTokenizer.connect(manager).createFranchise(
                    "Good Burger", 500000, 10000, manager.address
                )
            ).to.emit(franchiseTokenizer, "FranchiseCreated")
             .withArgs(franchiseId, "Good Burger", 500000, 10000, manager.address);

            const franchise = await franchiseTokenizer.franchises(franchiseId);
            expect(franchise.name).to.equal("Good Burger");
            expect(franchise.maxSupply).to.equal(10000);
            
            // <<< SOLUCIÓN AL ERROR 1 >>>
            // Comparamos BigInt con BigInt
            expect(await franchiseTokenizer.nextFranchiseId()).to.equal(franchiseId + BigInt(1));
        });

        it("Debería revertir la creación si el llamante no tiene el MANAGER_ROLE", async function () {
            await expect(
                franchiseTokenizer.connect(user1).createFranchise(
                    "Franquicia No Autorizada", 1000, 100, user1.address
                )
            ).to.be.reverted;
        });

        it("Debería revertir la creación de una franquicia si maxSupply es 0", async function () {
            await expect(
                franchiseTokenizer.connect(manager).createFranchise(
                    "Franquicia Cero Supply", 100000, 0, manager.address
                )
            ).to.be.revertedWith("Max supply must be greater than 0");
        });
    });

    describe("Acuñación de Tokens", function () {
        beforeEach(async function () {
            await franchiseTokenizer.connect(manager).createFranchise(
                "Franquicia para Minting", 100000, 100, manager.address
            );
        });

        it("Debería acuñar tokens si el llamante tiene MINTER_ROLE y no se excede el maxSupply", async function() {
            const franchiseId = 1;
            const amountToMint = 50;
            await franchiseTokenizer.connect(minter).mintTokens(franchiseId, user1.address, amountToMint, "0x");
            expect(await franchiseTokenizer.balanceOf(user1.address, franchiseId)).to.equal(amountToMint);
            expect(await franchiseTokenizer.totalSupply(franchiseId)).to.equal(amountToMint);
        });

        it("Debería revertir la acuñación si el llamante no tiene el MINTER_ROLE", async function () {
            await expect(
                franchiseTokenizer.connect(manager).mintTokens(1, user1.address, 10, "0x")
            ).to.be.reverted;
        });
        
        it("Debería revertir mintTokens si se intenta acuñar más allá del maxSupply", async function () {
            const franchiseId = 1;
            const maxSupply = 100;
    
            await expect(
                franchiseTokenizer.connect(minter).mintTokens(franchiseId, user1.address, maxSupply + 1, "0x")
            ).to.be.revertedWith("Exceeds max supply for this franchise");
    
            await franchiseTokenizer.connect(minter).mintTokens(franchiseId, user1.address, maxSupply, "0x");
            
            await expect(
                franchiseTokenizer.connect(minter).mintTokens(franchiseId, user1.address, 1, "0x")
            ).to.be.revertedWith("Exceeds max supply for this franchise");
        });
    });
});