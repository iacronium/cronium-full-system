const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * CCIP Test Suite — Cronium MVP
 *
 * Cubre el flujo completo cross-chain usando MockCCIPRouter:
 *   Sender (Ethereum Sepolia simulado) → MockCCIPRouter → Receiver (Base Sepolia simulado)
 *
 * Escenarios:
 *   CCIP-01  Flujo feliz end-to-end: compra cross-chain exitosa
 *   CCIP-02  Sender: revierte si no hay LINK suficiente para fees
 *   CCIP-03  Sender: revierte si franchiseId es 0
 *   CCIP-04  Sender: revierte si tokenAmount es 0
 *   CCIP-05  Sender: revierte si paymentAmount es 0
 *   CCIP-06  Receiver: revierte si el sender no está en la allowlist
 *   CCIP-07  Receiver: revierte si el mensaje ya fue procesado (replay attack)
 *   CCIP-08  Receiver: falla silenciosamente si no hay liquidez USDC (no revierte el mensaje CCIP)
 *   CCIP-09  Receiver: falla silenciosamente si el buyer no tiene KYC (modo producción)
 *   CCIP-10  Admin: solo el owner puede autorizar senders
 *   CCIP-11  Admin: solo el owner puede depositar/retirar liquidez
 *   CCIP-12  Admin: solo el owner puede actualizar el receiver en el Sender
 *   CCIP-13  estimateFee retorna el fee correcto del mock router
 *   CCIP-14  Flujo completo con demo mode activo (sin KYC)
 */
describe("CCIP Cross-Chain Purchase — Cronium MVP", function () {
    const KYC_STATUS = { None: 0, Pending: 1, Verified: 2, Rejected: 3 };

    // Chain selectors simulados (mismos valores que en deploy_ccip.js)
    const ETH_SEPOLIA_SELECTOR = 16015286601757825753n;
    const BASE_SEPOLIA_SELECTOR = 10344971235874465080n;

    // =========================================================================
    // FIXTURE
    // =========================================================================
    async function deployCCIPFixture() {
        const [owner, kycAdmin, franchiseManager, buyer, treasury, attacker] =
            await ethers.getSigners();

        // --- Tokens ---
        const MockERC20 = await ethers.getContractFactory("MockERC20");

        // USDC en la cadena origen (Ethereum Sepolia simulado) — para el Sender
        const usdcOrigin = await MockERC20.deploy("Mock USDC Origin", "mUSDC-O");
        await usdcOrigin.waitForDeployment();

        // USDC en Base Sepolia — para el Receiver (liquidez)
        const usdcDest = await MockERC20.deploy("Mock USDC Dest", "mUSDC-D");
        await usdcDest.waitForDeployment();

        // LINK en la cadena origen — para pagar fees CCIP
        const linkToken = await MockERC20.deploy("Mock LINK", "mLINK");
        await linkToken.waitForDeployment();

        // Mint fondos iniciales
        await usdcOrigin.mint(owner.address, ethers.parseUnits("1000000", 6));
        await usdcDest.mint(owner.address, ethers.parseUnits("1000000", 6));
        await linkToken.mint(owner.address, ethers.parseUnits("1000", 18));

        // --- Mock CCIP Router ---
        const MockCCIPRouter = await ethers.getContractFactory("MockCCIPRouter");
        const mockRouter = await MockCCIPRouter.deploy();
        await mockRouter.waitForDeployment();

        // --- MVP Contracts (Base Sepolia) ---
        const FranchiseTokenizer = await ethers.getContractFactory("FranchiseTokenizer");
        const franchiseTokenizer = await FranchiseTokenizer.deploy("ipfs://cronium-meta/");
        await franchiseTokenizer.waitForDeployment();

        const ComplianceManager = await ethers.getContractFactory("ComplianceManager");
        const complianceManager = await ComplianceManager.deploy(
            await franchiseTokenizer.getAddress(),
            await usdcDest.getAddress(),
            treasury.address
        );
        await complianceManager.waitForDeployment();

        // Roles MVP
        await franchiseTokenizer.grantRole(
            await franchiseTokenizer.MINTER_ROLE(),
            await complianceManager.getAddress()
        );
        await complianceManager.grantRole(
            await complianceManager.KYC_ADMIN_ROLE(),
            kycAdmin.address
        );
        await franchiseTokenizer.grantRole(
            await franchiseTokenizer.MANAGER_ROLE(),
            franchiseManager.address
        );

        // Crear franquicia de prueba
        // totalValue = 100_000 USDC (6 decimales), maxSupply = 1000
        // pricePerToken = 100_000e6 / 1000 = 100 USDC
        await franchiseTokenizer.connect(franchiseManager).createFranchise(
            "Cronium Burger #1",
            ethers.parseUnits("100000", 6),
            1000,
            franchiseManager.address
        );
        const FRANCHISE_ID = 1n;

        // --- CCIP Receiver (Base Sepolia) ---
        const CCIPReceiver = await ethers.getContractFactory("CCIPTokenPurchaseReceiver");
        const ccipReceiver = await CCIPReceiver.deploy(
            await mockRouter.getAddress(),
            await complianceManager.getAddress(),
            await usdcDest.getAddress()
        );
        await ccipReceiver.waitForDeployment();

        // Otorgar CCIP_RECEIVER_ROLE al receiver en ComplianceManager
        const CCIP_RECEIVER_ROLE = await complianceManager.CCIP_RECEIVER_ROLE();
        await complianceManager.grantRole(CCIP_RECEIVER_ROLE, await ccipReceiver.getAddress());

        // --- CCIP Sender (Ethereum Sepolia simulado) ---
        const CCIPSender = await ethers.getContractFactory("CCIPTokenPurchaseSender");
        const ccipSender = await CCIPSender.deploy(
            await mockRouter.getAddress(),
            await linkToken.getAddress(),
            await usdcOrigin.getAddress(),
            BASE_SEPOLIA_SELECTOR,
            await ccipReceiver.getAddress()
        );
        await ccipSender.waitForDeployment();

        // Autorizar el Sender en el Receiver
        await ccipReceiver.setAllowedSender(
            ETH_SEPOLIA_SELECTOR,
            await ccipSender.getAddress(),
            true
        );

        // Depositar liquidez USDC en el Receiver (para cubrir compras)
        const LIQUIDITY = ethers.parseUnits("50000", 6);
        await usdcDest.connect(owner).approve(await ccipReceiver.getAddress(), LIQUIDITY);
        await ccipReceiver.connect(owner).depositLiquidity(LIQUIDITY);

        // Depositar LINK en el Sender (para pagar fees CCIP)
        const LINK_FEES = ethers.parseUnits("10", 18);
        await linkToken.connect(owner).approve(await ccipSender.getAddress(), LINK_FEES);
        await ccipSender.connect(owner).depositLinkFees(LINK_FEES);

        // Dar USDC al buyer en la cadena origen
        await usdcOrigin.connect(owner).transfer(buyer.address, ethers.parseUnits("10000", 6));

        return {
            franchiseTokenizer, complianceManager, ccipSender, ccipReceiver,
            mockRouter, usdcOrigin, usdcDest, linkToken,
            owner, kycAdmin, franchiseManager, buyer, treasury, attacker,
            FRANCHISE_ID,
            MOCK_FEE: await mockRouter.MOCK_FEE(),
        };
    }

    // =========================================================================
    // HELPER: simula el envío completo Sender → Router → Receiver
    // =========================================================================
    async function sendAndDeliver(fixture, buyerSigner, franchiseId, tokenAmount, paymentAmount) {
        const { ccipSender, ccipReceiver, mockRouter, usdcOrigin } = fixture;

        // Aprobar USDC al Sender
        await usdcOrigin.connect(buyerSigner).approve(
            await ccipSender.getAddress(),
            paymentAmount
        );

        // Enviar la solicitud cross-chain
        const tx = await ccipSender.connect(buyerSigner).sendPurchaseRequest(
            franchiseId, tokenAmount, paymentAmount
        );
        const receipt = await tx.wait();

        // Obtener el messageId del evento
        const messageId = await mockRouter.lastMessageId();

        // Simular la entrega del mensaje al Receiver
        const payload = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256", "uint256", "uint256"],
            [buyerSigner.address, franchiseId, tokenAmount, paymentAmount]
        );
        await mockRouter.simulateMessageReceived(
            await ccipReceiver.getAddress(),
            messageId,
            ETH_SEPOLIA_SELECTOR,
            await ccipSender.getAddress(),
            payload
        );

        return { messageId, receipt };
    }

    // =========================================================================
    // CCIP-01: Flujo feliz end-to-end
    // =========================================================================
    describe("CCIP-01: Flujo feliz end-to-end", function () {
        it("Debería ejecutar una compra cross-chain completa y mintear tokens al buyer", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { franchiseTokenizer, complianceManager, ccipReceiver, usdcDest,
                    kycAdmin, buyer, treasury, FRANCHISE_ID } = fixture;

            // KYC del buyer en Base Sepolia
            await complianceManager.connect(kycAdmin).setKYCStatus(buyer.address, KYC_STATUS.Verified);

            const TOKEN_AMOUNT = 5n;
            const PAYMENT = ethers.parseUnits("500", 6); // 5 tokens × 100 USDC

            const liquidityBefore = await usdcDest.balanceOf(await ccipReceiver.getAddress());

            const { messageId } = await sendAndDeliver(fixture, buyer, FRANCHISE_ID, TOKEN_AMOUNT, PAYMENT);

            // El buyer recibió los tokens ERC1155
            expect(await franchiseTokenizer.balanceOf(buyer.address, FRANCHISE_ID)).to.equal(TOKEN_AMOUNT);

            // El treasury recibió el USDC
            expect(await usdcDest.balanceOf(treasury.address)).to.equal(PAYMENT);

            // La liquidez del receiver disminuyó en el monto pagado
            expect(await usdcDest.balanceOf(await ccipReceiver.getAddress()))
                .to.equal(liquidityBefore - PAYMENT);

            // El historial de compra está registrado y marcado como exitoso
            const history = await ccipReceiver.getPurchaseHistory(messageId);
            expect(history.success).to.be.true;
            expect(history.buyer).to.equal(buyer.address);
            expect(history.franchiseId).to.equal(FRANCHISE_ID);
            expect(history.tokenAmount).to.equal(TOKEN_AMOUNT);
            expect(history.paymentAmount).to.equal(PAYMENT);

            // El mensaje está marcado como procesado
            expect(await ccipReceiver.isMessageProcessed(messageId)).to.be.true;
        });
    });

    // =========================================================================
    // CCIP-02 a CCIP-05: Validaciones del Sender
    // =========================================================================
    describe("Sender: Validaciones de entrada", function () {
        it("CCIP-02: Revierte si no hay LINK suficiente para fees", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipSender, ccipReceiver, usdcOrigin, linkToken, owner,
                    kycAdmin, complianceManager, buyer, FRANCHISE_ID } = fixture;

            // Retirar todo el LINK del sender
            const linkBalance = await linkToken.balanceOf(await ccipSender.getAddress());
            await ccipSender.connect(owner).withdrawLink(linkBalance);

            await complianceManager.connect(kycAdmin).setKYCStatus(buyer.address, KYC_STATUS.Verified);
            const PAYMENT = ethers.parseUnits("100", 6);
            await usdcOrigin.connect(buyer).approve(await ccipSender.getAddress(), PAYMENT);

            await expect(
                ccipSender.connect(buyer).sendPurchaseRequest(FRANCHISE_ID, 1n, PAYMENT)
            ).to.be.revertedWith("CCIPSender: Insufficient LINK for fees");
        });

        it("CCIP-03: Revierte si franchiseId es 0", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipSender, usdcOrigin, buyer } = fixture;
            const PAYMENT = ethers.parseUnits("100", 6);
            await usdcOrigin.connect(buyer).approve(await ccipSender.getAddress(), PAYMENT);
            await expect(
                ccipSender.connect(buyer).sendPurchaseRequest(0n, 1n, PAYMENT)
            ).to.be.revertedWith("CCIPSender: Invalid franchise ID");
        });

        it("CCIP-04: Revierte si tokenAmount es 0", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipSender, usdcOrigin, buyer, FRANCHISE_ID } = fixture;
            const PAYMENT = ethers.parseUnits("100", 6);
            await usdcOrigin.connect(buyer).approve(await ccipSender.getAddress(), PAYMENT);
            await expect(
                ccipSender.connect(buyer).sendPurchaseRequest(FRANCHISE_ID, 0n, PAYMENT)
            ).to.be.revertedWith("CCIPSender: Token amount must be positive");
        });

        it("CCIP-05: Revierte si paymentAmount es 0", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipSender, buyer, FRANCHISE_ID } = fixture;
            await expect(
                ccipSender.connect(buyer).sendPurchaseRequest(FRANCHISE_ID, 1n, 0n)
            ).to.be.revertedWith("CCIPSender: Payment amount must be positive");
        });
    });

    // =========================================================================
    // CCIP-06 a CCIP-09: Validaciones del Receiver
    // =========================================================================
    describe("Receiver: Seguridad y manejo de errores", function () {
        it("CCIP-06: Revierte si el sender no está en la allowlist", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipReceiver, mockRouter, attacker, FRANCHISE_ID } = fixture;

            const fakeMessageId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
            const payload = ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "uint256", "uint256", "uint256"],
                [attacker.address, FRANCHISE_ID, 1n, ethers.parseUnits("100", 6)]
            );

            // El attacker no está en la allowlist
            await expect(
                mockRouter.simulateMessageReceived(
                    await ccipReceiver.getAddress(),
                    fakeMessageId,
                    ETH_SEPOLIA_SELECTOR,
                    attacker.address, // sender no autorizado
                    payload
                )
            ).to.be.revertedWith("CCIPReceiver: Sender not allowed");
        });

        it("CCIP-07: Revierte si el mismo messageId se procesa dos veces (replay attack)", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { complianceManager, kycAdmin, buyer, FRANCHISE_ID } = fixture;

            await complianceManager.connect(kycAdmin).setKYCStatus(buyer.address, KYC_STATUS.Verified);

            const PAYMENT = ethers.parseUnits("100", 6);
            const { messageId } = await sendAndDeliver(fixture, buyer, FRANCHISE_ID, 1n, PAYMENT);

            // Intentar entregar el mismo mensaje de nuevo
            const { ccipReceiver, ccipSender, mockRouter } = fixture;
            const payload = ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "uint256", "uint256", "uint256"],
                [buyer.address, FRANCHISE_ID, 1n, PAYMENT]
            );

            await expect(
                mockRouter.simulateMessageReceived(
                    await ccipReceiver.getAddress(),
                    messageId,
                    ETH_SEPOLIA_SELECTOR,
                    await ccipSender.getAddress(),
                    payload
                )
            ).to.be.revertedWith("CCIPReceiver: Message already processed");
        });

        it("CCIP-08: Falla silenciosamente si no hay liquidez USDC (no revierte el mensaje CCIP)", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipReceiver, complianceManager, usdcDest, mockRouter, ccipSender,
                    kycAdmin, buyer, owner, FRANCHISE_ID } = fixture;

            await complianceManager.connect(kycAdmin).setKYCStatus(buyer.address, KYC_STATUS.Verified);

            // Retirar toda la liquidez del receiver
            const liquidity = await ccipReceiver.availableLiquidity();
            await ccipReceiver.connect(owner).withdrawLiquidity(liquidity);
            expect(await ccipReceiver.availableLiquidity()).to.equal(0n);

            const PAYMENT = ethers.parseUnits("100", 6);
            const { messageId } = await sendAndDeliver(fixture, buyer, FRANCHISE_ID, 1n, PAYMENT);

            // El mensaje fue procesado (no revirtió) pero la compra falló
            expect(await ccipReceiver.isMessageProcessed(messageId)).to.be.true;
            const history = await ccipReceiver.getPurchaseHistory(messageId);
            expect(history.success).to.be.false;

            // El evento CrossChainPurchaseFailed fue emitido
            // (verificamos indirectamente que no se mintearon tokens)
            const { franchiseTokenizer } = fixture;
            expect(await franchiseTokenizer.balanceOf(buyer.address, FRANCHISE_ID)).to.equal(0n);
        });

        it("CCIP-09: Falla silenciosamente si el buyer no tiene KYC (modo producción)", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipReceiver, franchiseTokenizer, buyer, FRANCHISE_ID } = fixture;

            // Sin KYC y sin demo mode — la compra debe fallar silenciosamente
            const PAYMENT = ethers.parseUnits("100", 6);
            const { messageId } = await sendAndDeliver(fixture, buyer, FRANCHISE_ID, 1n, PAYMENT);

            expect(await ccipReceiver.isMessageProcessed(messageId)).to.be.true;
            const history = await ccipReceiver.getPurchaseHistory(messageId);
            expect(history.success).to.be.false;
            expect(await franchiseTokenizer.balanceOf(buyer.address, FRANCHISE_ID)).to.equal(0n);
        });
    });

    // =========================================================================
    // CCIP-10 a CCIP-12: Funciones de administración
    // =========================================================================
    describe("Admin: Control de acceso", function () {
        it("CCIP-10: Solo el owner puede autorizar/desautorizar senders en el Receiver", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipReceiver, attacker } = fixture;

            await expect(
                ccipReceiver.connect(attacker).setAllowedSender(
                    ETH_SEPOLIA_SELECTOR, attacker.address, true
                )
            ).to.be.revertedWithCustomError(ccipReceiver, "OwnableUnauthorizedAccount");
        });

        it("CCIP-11: Solo el owner puede depositar y retirar liquidez del Receiver", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipReceiver, usdcDest, attacker } = fixture;

            await expect(
                ccipReceiver.connect(attacker).withdrawLiquidity(1n)
            ).to.be.revertedWithCustomError(ccipReceiver, "OwnableUnauthorizedAccount");
        });

        it("CCIP-12: Solo el owner puede actualizar el receiver en el Sender", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipSender, attacker } = fixture;

            await expect(
                ccipSender.connect(attacker).setReceiverContract(attacker.address)
            ).to.be.revertedWithCustomError(ccipSender, "OwnableUnauthorizedAccount");
        });
    });

    // =========================================================================
    // CCIP-13: estimateFee
    // =========================================================================
    describe("CCIP-13: estimateFee", function () {
        it("Debería retornar el fee correcto del mock router", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { ccipSender, MOCK_FEE, FRANCHISE_ID } = fixture;

            const fee = await ccipSender.estimateFee(
                FRANCHISE_ID, 5n, ethers.parseUnits("500", 6)
            );
            expect(fee).to.equal(MOCK_FEE);
        });
    });

    // =========================================================================
    // CCIP-14: Flujo completo con demo mode activo
    // =========================================================================
    describe("CCIP-14: Flujo completo con demo mode activo (sin KYC)", function () {
        it("Debería completar la compra cross-chain sin KYC cuando demo mode está activo", async function () {
            const fixture = await loadFixture(deployCCIPFixture);
            const { franchiseTokenizer, complianceManager, owner, buyer, FRANCHISE_ID } = fixture;

            // Activar demo mode — cualquier buyer puede comprar sin KYC
            await complianceManager.connect(owner).setDemoMode(true);

            const TOKEN_AMOUNT = 3n;
            const PAYMENT = ethers.parseUnits("300", 6);

            const { messageId } = await sendAndDeliver(fixture, buyer, FRANCHISE_ID, TOKEN_AMOUNT, PAYMENT);

            expect(await franchiseTokenizer.balanceOf(buyer.address, FRANCHISE_ID)).to.equal(TOKEN_AMOUNT);

            const history = await fixture.ccipReceiver.getPurchaseHistory(messageId);
            expect(history.success).to.be.true;
        });
    });
});
