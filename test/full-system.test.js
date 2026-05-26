const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Cronium Full System Integration Test", function () {
    // Definimos constantes para estados para mayor legibilidad y mantenibilidad.
    // Asumiendo el enum en Solidity: enum KYCStatus { None, Pending, Verified, Rejected }
    const KYC_STATUS = { None: 0, Pending: 1, Verified: 2, Rejected: 3 };

    // Usamos una fixture para desplegar el entorno una sola vez y reutilizar el estado.
    async function deploySystemFixture() {
        // 1. Obtenemos las cuentas de prueba
        const [owner, kycAdmin, franchiseManager, investor1, investor2, treasury] = await ethers.getSigners();

        // 2. Desplegamos un contrato Mock de ERC20 para simular el USDC
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const paymentToken = await MockERC20.deploy("Mock USDC", "mUSDC");
        await paymentToken.waitForDeployment();
        // Acuñamos fondos iniciales al dueño para que pueda distribuirlos en las pruebas
        await paymentToken.mint(owner.address, ethers.parseUnits("1000000", 6));

        // 3. Desplegamos el FranchiseTokenizer
        const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
        const franchiseTokenizer = await FranchiseTokenizer.deploy("ipfs://cronium-meta/");
        await franchiseTokenizer.waitForDeployment();
        
        // 4. Desplegamos el ComplianceManager con las direcciones correctas
        const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
        const complianceManager = await ComplianceManager.deploy(
            await franchiseTokenizer.getAddress(),
            await paymentToken.getAddress(),
            treasury.address
        );
        await complianceManager.waitForDeployment();
        
        // 5. Desplegamos el DividendDistributor
        const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;
        const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
        const dividendDistributor = await DividendDistributor.deploy(
            await franchiseTokenizer.getAddress(),
            await paymentToken.getAddress(),
            THIRTY_DAYS_IN_SECS
        );
        await dividendDistributor.waitForDeployment();

        // 6. Configuramos los roles para una correcta interacción entre contratos
        const MINTER_ROLE = await franchiseTokenizer.MINTER_ROLE();
        await franchiseTokenizer.grantRole(MINTER_ROLE, await complianceManager.getAddress());
        
        const KYC_ADMIN_ROLE = await complianceManager.KYC_ADMIN_ROLE();
        await complianceManager.grantRole(KYC_ADMIN_ROLE, kycAdmin.address);
        
        const MANAGER_ROLE = await franchiseTokenizer.MANAGER_ROLE();
        await franchiseTokenizer.grantRole(MANAGER_ROLE, franchiseManager.address);

        // 7. Creamos una franquicia inicial para las pruebas
        const franchiseId = await franchiseTokenizer.nextFranchiseId();
        await franchiseTokenizer.connect(franchiseManager).createFranchise(
            "Cronium Burger #1",
            "CRB",
            ethers.parseUnits("100000", 6),
            10000,
            franchiseManager.address
        );

        // 8. Devolvemos todos los componentes para que estén disponibles en cada test
        return { 
            franchiseTokenizer, dividendDistributor, complianceManager, paymentToken, 
            owner, kycAdmin, franchiseManager, investor1, investor2, treasury,
            FRANCHISE_ID: franchiseId
        };
    }

    describe("Investment and KYC Workflow", function () {
        it("Debería REVERTIR la compra si el usuario no tiene KYC", async function () {
            const { complianceManager, investor1, FRANCHISE_ID } = await loadFixture(deploySystemFixture);
            
            await expect(
                complianceManager.connect(investor1).purchaseTokens(FRANCHISE_ID, 100, 0)
            ).to.be.revertedWith("ComplianceManager: KYC not verified");
        });

        it("Debería PERMITIR la compra después de la verificación KYC", async function () {
            const { complianceManager, franchiseTokenizer, paymentToken, owner, kycAdmin, investor1, treasury, FRANCHISE_ID } = await loadFixture(deploySystemFixture);
            
            await complianceManager.connect(kycAdmin).setKYCStatus(investor1.address, KYC_STATUS.Verified);

            const tokensToBuy = 100;
            // Precio correcto: (totalValue * tokenAmount) / maxSupply = (100000e6 * 100) / 10000 = 1000e6
            const paymentAmount = ethers.parseUnits("1000", 6);

            await paymentToken.connect(owner).transfer(investor1.address, paymentAmount);
            await paymentToken.connect(investor1).approve(await complianceManager.getAddress(), paymentAmount);
            await complianceManager.connect(investor1).purchaseTokens(FRANCHISE_ID, tokensToBuy, paymentAmount);

            expect(await franchiseTokenizer.balanceOf(investor1.address, FRANCHISE_ID)).to.equal(tokensToBuy);
            expect(await paymentToken.balanceOf(treasury.address)).to.equal(paymentAmount);
        });
    });

    describe("Dividend Distribution Workflow", function () {
        it("Debería distribuir y permitir reclamar dividendos correctamente", async function () {
            // --- 1. Preparación (Arrange) ---
            const { 
                complianceManager, franchiseTokenizer, dividendDistributor, paymentToken, 
                owner, kycAdmin, franchiseManager, investor1, investor2, FRANCHISE_ID 
            } = await loadFixture(deploySystemFixture);

            // Damos KYC y fondos a dos inversores para simular un escenario real
            await complianceManager.connect(kycAdmin).setKYCStatus(investor1.address, KYC_STATUS.Verified);
            await complianceManager.connect(kycAdmin).setKYCStatus(investor2.address, KYC_STATUS.Verified);
            
            const pricePerToken = ethers.parseUnits("10", 6); // (100000e6 totalValue / 10000 maxSupply)
            
            // Compra de Investor 1 (750 tokens)
            await paymentToken.connect(owner).transfer(investor1.address, pricePerToken * BigInt(750));
            await paymentToken.connect(investor1).approve(await complianceManager.getAddress(), pricePerToken * BigInt(750));
            await complianceManager.connect(investor1).purchaseTokens(FRANCHISE_ID, 750, pricePerToken * BigInt(750));
            
            // Compra de Investor 2 (250 tokens)
            await paymentToken.connect(owner).transfer(investor2.address, pricePerToken * BigInt(250));
            await paymentToken.connect(investor2).approve(await complianceManager.getAddress(), pricePerToken * BigInt(250));
            await complianceManager.connect(investor2).purchaseTokens(FRANCHISE_ID, 250, pricePerToken * BigInt(250));

            // --- 2. Ejecución (Act) ---

            // El manager deposita los dividendos
            const dividendAmount = ethers.parseUnits("10000", 6); // $10,000 en dividendos
            await paymentToken.connect(owner).transfer(franchiseManager.address, dividendAmount);
            await paymentToken.connect(franchiseManager).approve(await dividendDistributor.getAddress(), dividendAmount);
            await dividendDistributor.connect(franchiseManager).depositDividends(FRANCHISE_ID, dividendAmount);
            
            // Avanzamos el tiempo para que el intervalo de 30 días haya pasado
            const THIRTY_DAYS_IN_SECS = 30 * 24 * 60 * 60;
            await time.increase(THIRTY_DAYS_IN_SECS + 1);

            // Simulamos la ejecución de Chainlink Automation
            await dividendDistributor.performUpkeep(ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [FRANCHISE_ID]));
            
            await dividendDistributor.connect(investor1).claimDividend(FRANCHISE_ID);
            await dividendDistributor.connect(investor2).claimDividend(FRANCHISE_ID);

            // --- 3. Verificación (Assert) ---
            
            // Verificamos que los balances sean los correctos según su participación (75% / 25%)
            expect(await paymentToken.balanceOf(investor1.address)).to.equal(ethers.parseUnits("7500", 6));
            expect(await paymentToken.balanceOf(investor2.address)).to.equal(ethers.parseUnits("2500", 6));
            
            // Verificamos que no se puede reclamar dos veces (no hay dividendos pendientes)
            await expect(
                dividendDistributor.connect(investor1).claimDividend(FRANCHISE_ID)
            ).to.be.revertedWith("DividendDistributor: No accrued dividends to claim");
        });
    });
});