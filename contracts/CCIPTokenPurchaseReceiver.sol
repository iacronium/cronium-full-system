// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IComplianceManager.sol";

/**
 * @title CCIPTokenPurchaseReceiver
 * @author Cronium Team
 * @notice Contrato desplegado en BASE SEPOLIA (cadena destino).
 * Recibe mensajes CCIP desde otras redes y ejecuta la compra de tokens
 * de franquicia en nombre del inversor cross-chain.
 *
 * Flujo completo:
 *  1. El CCIPTokenPurchaseSender en la cadena origen envía un mensaje CCIP
 *     con payload: (buyer, franchiseId, tokenAmount, paymentAmount).
 *  2. El router CCIP de Base Sepolia llama a ccipReceive() en este contrato.
 *  3. Este contrato verifica que el sender está en la allowlist.
 *  4. Llama a ComplianceManager.purchaseTokensFor(buyer, ...) usando su
 *     propio balance de USDC como liquidez.
 *  5. Los tokens ERC1155 se mintean directamente al `buyer` en Base Sepolia.
 *
 * Gestión de liquidez:
 *  - El owner deposita USDC en este contrato para cubrir las compras.
 *  - El USDC del usuario en la cadena origen queda en el CCIPTokenPurchaseSender
 *    (el owner puede retirarlo para rebalancear la liquidez).
 *
 * Gestión de errores:
 *  - Si la compra falla (sin liquidez, KYC no verificado, etc.), el mensaje
 *    se marca como fallido pero NO se revierte (evita que el router reintente).
 *  - El owner puede reembolsar manualmente al buyer si es necesario.
 *
 * Nota sobre KYC:
 *  - En modo demo (demoModeActive = true en ComplianceManager), cualquier
 *    dirección puede comprar sin verificación KYC.
 *  - En producción, el buyer debe estar KYC verificado en Base Sepolia.
 */
contract CCIPTokenPurchaseReceiver is CCIPReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Referencia al ComplianceManager en Base Sepolia
    IComplianceManager public complianceManager;

    /// @notice Token de pago (USDC) en Base Sepolia
    IERC20 public immutable paymentToken;

    /// @notice Mapping de contratos sender autorizados por chain selector
    /// chainSelector => senderAddress => isAllowed
    mapping(uint64 => mapping(address => bool)) public allowedSenders;

    // ============================================
    // STRUCTS
    // ============================================

    /**
     * @notice Registro de una compra ejecutada via CCIP
     * @param buyer Dirección del comprador (en la cadena origen)
     * @param franchiseId ID de la franquicia comprada
     * @param tokenAmount Cantidad de tokens comprados
     * @param paymentAmount Monto de USDC pagado
     * @param sourceChainSelector Chain selector de la cadena origen
     * @param timestamp Timestamp de la ejecución
     * @param success Si la compra fue exitosa
     */
    struct CrossChainPurchase {
        address buyer;
        uint256 franchiseId;
        uint256 tokenAmount;
        uint256 paymentAmount;
        uint64 sourceChainSelector;
        uint256 timestamp;
        bool success;
    }

    /// @notice Historial de compras cross-chain por messageId
    mapping(bytes32 => CrossChainPurchase) public purchaseHistory;

    /// @notice Mensajes ya procesados (protección contra replay)
    mapping(bytes32 => bool) public processedMessages;

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitido cuando se ejecuta una compra cross-chain exitosamente
     * @param messageId ID del mensaje CCIP
     * @param sourceChainSelector Chain selector de la cadena origen
     * @param buyer Dirección del comprador
     * @param franchiseId ID de la franquicia
     * @param tokenAmount Tokens comprados
     * @param paymentAmount USDC pagado
     */
    event CrossChainPurchaseExecuted(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address indexed buyer,
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 paymentAmount
    );

    /**
     * @notice Emitido cuando un mensaje CCIP falla al procesarse
     * @param messageId ID del mensaje CCIP
     * @param buyer Dirección del comprador afectado
     * @param reason Razón del fallo (bytes del error)
     */
    event CrossChainPurchaseFailed(
        bytes32 indexed messageId,
        address indexed buyer,
        bytes reason
    );

    /**
     * @notice Emitido cuando se autoriza/desautoriza un sender
     * @param chainSelector Chain selector del sender
     * @param sender Dirección del sender
     * @param allowed Si está autorizado
     */
    event SenderAllowlistUpdated(
        uint64 indexed chainSelector,
        address indexed sender,
        bool allowed
    );

    /**
     * @notice Emitido cuando se actualiza el ComplianceManager
     * @param oldManager Dirección anterior
     * @param newManager Nueva dirección
     */
    event ComplianceManagerUpdated(address indexed oldManager, address indexed newManager);

    /**
     * @notice Emitido cuando se deposita liquidez USDC
     * @param depositor Quien depositó
     * @param amount Cantidad depositada
     */
    event LiquidityDeposited(address indexed depositor, uint256 amount);

    /**
     * @notice Emitido cuando se retira liquidez USDC
     * @param amount Cantidad retirada
     */
    event LiquidityWithdrawn(uint256 amount);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Inicializa el contrato receiver
     * @param _ccipRouter Dirección del router CCIP en Base Sepolia
     * @param _complianceManager Dirección del ComplianceManager en Base Sepolia
     * @param _paymentToken Dirección del USDC en Base Sepolia
     */
    constructor(
        address _ccipRouter,
        address _complianceManager,
        address _paymentToken
    ) CCIPReceiver(_ccipRouter) Ownable(msg.sender) {
        require(_complianceManager != address(0), "CCIPReceiver: ComplianceManager cannot be zero");
        require(_paymentToken != address(0), "CCIPReceiver: PaymentToken cannot be zero");

        complianceManager = IComplianceManager(_complianceManager);
        paymentToken = IERC20(_paymentToken);
    }

    // ============================================
    // CCIP RECEIVE
    // ============================================

    /**
     * @notice Función interna llamada por el router CCIP al recibir un mensaje
     * @dev Implementa la lógica de compra cross-chain. Usa try/catch para
     * manejar fallos sin revertir el mensaje CCIP (evita que el router reintente
     * indefinidamente y bloquee el canal).
     * @param message El mensaje CCIP recibido del router
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override nonReentrant {
        bytes32 messageId = message.messageId;

        // Protección contra replay attacks
        require(!processedMessages[messageId], "CCIPReceiver: Message already processed");
        processedMessages[messageId] = true;

        // Verificar que el sender está en la allowlist
        address sender = abi.decode(message.sender, (address));
        require(
            allowedSenders[message.sourceChainSelector][sender],
            "CCIPReceiver: Sender not allowed"
        );

        // Decodificar el payload: (buyer, franchiseId, tokenAmount, paymentAmount)
        (
            address buyer,
            uint256 franchiseId,
            uint256 tokenAmount,
            uint256 paymentAmount
        ) = abi.decode(message.data, (address, uint256, uint256, uint256));

        // Registrar la compra antes de ejecutar (historial incluso si falla)
        purchaseHistory[messageId] = CrossChainPurchase({
            buyer: buyer,
            franchiseId: franchiseId,
            tokenAmount: tokenAmount,
            paymentAmount: paymentAmount,
            sourceChainSelector: message.sourceChainSelector,
            timestamp: block.timestamp,
            success: false
        });

        // Intentar ejecutar la compra — capturar errores para no revertir el mensaje CCIP
        try this._executePurchaseFor(buyer, franchiseId, tokenAmount, paymentAmount) {
            purchaseHistory[messageId].success = true;
            emit CrossChainPurchaseExecuted(
                messageId,
                message.sourceChainSelector,
                buyer,
                franchiseId,
                tokenAmount,
                paymentAmount
            );
        } catch (bytes memory reason) {
            emit CrossChainPurchaseFailed(messageId, buyer, reason);
        }
    }

    /**
     * @notice Ejecuta la compra de tokens para un buyer cross-chain
     * @dev External para poder usar try/catch desde _ccipReceive.
     * Solo puede ser llamada por este mismo contrato (self-call).
     * Aprueba el USDC al ComplianceManager y llama a purchaseTokensFor.
     * @param buyer Dirección del comprador (recibirá los tokens ERC1155)
     * @param franchiseId ID de la franquicia
     * @param tokenAmount Cantidad de tokens a comprar
     * @param paymentAmount Monto de USDC a pagar al treasury
     */
    function _executePurchaseFor(
        address buyer,
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 paymentAmount
    ) external {
        require(msg.sender == address(this), "CCIPReceiver: Only self-call allowed");
        require(buyer != address(0), "CCIPReceiver: Buyer cannot be zero");
        require(tokenAmount > 0, "CCIPReceiver: Token amount must be positive");
        require(paymentAmount > 0, "CCIPReceiver: Payment amount must be positive");

        // Verificar liquidez disponible
        require(
            paymentToken.balanceOf(address(this)) >= paymentAmount,
            "CCIPReceiver: Insufficient USDC liquidity"
        );

        // Aprobar al ComplianceManager para transferir el USDC al treasury
        paymentToken.forceApprove(address(complianceManager), paymentAmount);

        // Ejecutar la compra — los tokens se mintean directamente al buyer
        complianceManager.purchaseTokensFor(buyer, franchiseId, tokenAmount, paymentAmount);

        // Revocar cualquier aprobación residual por seguridad
        paymentToken.forceApprove(address(complianceManager), 0);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Autoriza o desautoriza un contrato sender en una cadena origen
     * @dev Solo el owner puede modificar la allowlist
     * @param chainSelector Chain selector de la cadena origen
     * @param sender Dirección del contrato CCIPTokenPurchaseSender
     * @param allowed True para autorizar, false para desautorizar
     */
    function setAllowedSender(
        uint64 chainSelector,
        address sender,
        bool allowed
    ) external onlyOwner {
        require(sender != address(0), "CCIPReceiver: Sender cannot be zero");
        allowedSenders[chainSelector][sender] = allowed;
        emit SenderAllowlistUpdated(chainSelector, sender, allowed);
    }

    /**
     * @notice Actualiza la dirección del ComplianceManager
     * @param _newComplianceManager Nueva dirección del ComplianceManager
     */
    function setComplianceManager(address _newComplianceManager) external onlyOwner {
        require(_newComplianceManager != address(0), "CCIPReceiver: ComplianceManager cannot be zero");
        emit ComplianceManagerUpdated(address(complianceManager), _newComplianceManager);
        complianceManager = IComplianceManager(_newComplianceManager);
    }

    /**
     * @notice Deposita USDC en el contrato para proveer liquidez a compras cross-chain
     * @dev Restringido al owner para evitar depósitos no autorizados que puedan
     * interferir con la contabilidad de liquidez del contrato.
     * @param amount Cantidad de USDC a depositar
     */
    function depositLiquidity(uint256 amount) external onlyOwner {
        require(amount > 0, "CCIPReceiver: Amount must be positive");
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        emit LiquidityDeposited(msg.sender, amount);
    }

    /**
     * @notice Retira USDC del contrato (solo owner)
     * @param amount Cantidad de USDC a retirar
     */
    function withdrawLiquidity(uint256 amount) external onlyOwner {
        require(amount > 0, "CCIPReceiver: Amount must be positive");
        require(
            paymentToken.balanceOf(address(this)) >= amount,
            "CCIPReceiver: Insufficient balance"
        );
        paymentToken.safeTransfer(owner(), amount);
        emit LiquidityWithdrawn(amount);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Retorna el balance de USDC disponible para compras cross-chain
     * @return Balance actual de USDC en el contrato
     */
    function availableLiquidity() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }

    /**
     * @notice Verifica si un mensaje CCIP ya fue procesado
     * @param messageId ID del mensaje CCIP
     * @return True si ya fue procesado
     */
    function isMessageProcessed(bytes32 messageId) external view returns (bool) {
        return processedMessages[messageId];
    }

    /**
     * @notice Retorna el historial de una compra cross-chain
     * @param messageId ID del mensaje CCIP
     * @return La estructura CrossChainPurchase con todos los detalles
     */
    function getPurchaseHistory(bytes32 messageId) external view returns (CrossChainPurchase memory) {
        return purchaseHistory[messageId];
    }

    /**
     * @notice Implementación de supportsInterface para CCIPReceiver
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(CCIPReceiver)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
