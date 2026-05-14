// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CCIPTokenPurchaseSender
 * @author Cronium Team
 * @notice Contrato desplegado en la cadena ORIGEN (ej. Ethereum Sepolia).
 * Permite a inversores de otras redes enviar una solicitud de compra de tokens
 * de franquicia a Base Sepolia mediante Chainlink CCIP.
 *
 * Flujo:
 *  1. El usuario aprueba este contrato para gastar su USDC (token de pago).
 *  2. El usuario aprueba este contrato para gastar LINK (para pagar fees CCIP).
 *  3. El usuario llama a `sendPurchaseRequest(...)`.
 *  4. Este contrato transfiere el USDC del usuario a sí mismo, construye el
 *     mensaje CCIP y lo envía al CCIPTokenPurchaseReceiver en Base Sepolia.
 *  5. El receiver ejecuta la compra en nombre del usuario.
 */
contract CCIPTokenPurchaseSender is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Router CCIP de la cadena origen
    IRouterClient public immutable ccipRouter;

    /// @notice Token LINK usado para pagar fees CCIP
    IERC20 public immutable linkToken;

    /// @notice Token de pago (USDC) en la cadena origen
    IERC20 public immutable paymentToken;

    /// @notice Chain selector de Base Sepolia (destino)
    uint64 public immutable destinationChainSelector;

    /// @notice Dirección del CCIPTokenPurchaseReceiver en Base Sepolia
    address public receiverContract;

    /// @notice Gas limit para la ejecución en la cadena destino
    uint256 public destinationGasLimit;

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitido cuando se envía una solicitud de compra cross-chain
     * @param messageId ID del mensaje CCIP generado por el router
     * @param buyer Dirección del comprador en la cadena origen
     * @param franchiseId ID de la franquicia a comprar
     * @param tokenAmount Cantidad de tokens a comprar
     * @param paymentAmount Monto de USDC enviado
     * @param ccipFee Fee LINK pagado al router CCIP
     */
    event PurchaseRequestSent(
        bytes32 indexed messageId,
        address indexed buyer,
        uint256 indexed franchiseId,
        uint256 tokenAmount,
        uint256 paymentAmount,
        uint256 ccipFee
    );

    /**
     * @notice Emitido cuando se actualiza el contrato receiver
     * @param oldReceiver Dirección anterior
     * @param newReceiver Nueva dirección
     */
    event ReceiverContractUpdated(address indexed oldReceiver, address indexed newReceiver);

    /**
     * @notice Emitido cuando se actualiza el gas limit de destino
     * @param oldLimit Límite anterior
     * @param newLimit Nuevo límite
     */
    event DestinationGasLimitUpdated(uint256 oldLimit, uint256 newLimit);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Inicializa el contrato sender
     * @param _ccipRouter Dirección del router CCIP en la cadena origen
     * @param _linkToken Dirección del token LINK en la cadena origen
     * @param _paymentToken Dirección del USDC en la cadena origen
     * @param _destinationChainSelector Chain selector de Base Sepolia
     * @param _receiverContract Dirección del receiver en Base Sepolia
     */
    constructor(
        address _ccipRouter,
        address _linkToken,
        address _paymentToken,
        uint64 _destinationChainSelector,
        address _receiverContract
    ) Ownable(msg.sender) {
        require(_ccipRouter != address(0), "CCIPSender: Router cannot be zero");
        require(_linkToken != address(0), "CCIPSender: LINK cannot be zero");
        require(_paymentToken != address(0), "CCIPSender: PaymentToken cannot be zero");
        require(_destinationChainSelector != 0, "CCIPSender: Invalid chain selector");
        require(_receiverContract != address(0), "CCIPSender: Receiver cannot be zero");

        ccipRouter = IRouterClient(_ccipRouter);
        linkToken = IERC20(_linkToken);
        paymentToken = IERC20(_paymentToken);
        destinationChainSelector = _destinationChainSelector;
        receiverContract = _receiverContract;
        destinationGasLimit = 300_000; // Gas suficiente para purchaseTokens + KYC check
    }

    // ============================================
    // MAIN FUNCTION
    // ============================================

    /**
     * @notice Envía una solicitud de compra de tokens de franquicia a Base Sepolia
     * @dev El usuario debe haber aprobado previamente:
     *   - `paymentAmount` de USDC a este contrato
     *   - Suficiente LINK a este contrato (usar `estimateFee` para calcular)
     * El USDC se transfiere a este contrato y se incluye en el mensaje CCIP.
     * El receiver en Base Sepolia ejecutará la compra usando sus propios fondos USDC.
     * @param franchiseId ID de la franquicia a comprar
     * @param tokenAmount Cantidad de tokens a comprar
     * @param paymentAmount Monto de USDC a pagar (debe cubrir el precio de los tokens)
     */
    function sendPurchaseRequest(
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 paymentAmount
    ) external nonReentrant returns (bytes32 messageId) {
        require(franchiseId > 0, "CCIPSender: Invalid franchise ID");
        require(tokenAmount > 0, "CCIPSender: Token amount must be positive");
        require(paymentAmount > 0, "CCIPSender: Payment amount must be positive");

        // Transferir USDC del usuario a este contrato
        paymentToken.safeTransferFrom(msg.sender, address(this), paymentAmount);

        // Construir el payload: (buyer, franchiseId, tokenAmount, paymentAmount)
        bytes memory data = abi.encode(msg.sender, franchiseId, tokenAmount, paymentAmount);

        // Construir el mensaje CCIP (solo datos, sin transferencia de tokens on-chain)
        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiverContract),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0), // Sin token transfers CCIP
            feeToken: address(linkToken),                 // Pagar fees con LINK
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: destinationGasLimit})
            )
        });

        // Calcular y cobrar el fee CCIP
        uint256 fee = ccipRouter.getFee(destinationChainSelector, ccipMessage);
        require(
            linkToken.balanceOf(address(this)) >= fee,
            "CCIPSender: Insufficient LINK for fees"
        );

        // Aprobar al router para gastar LINK
        linkToken.forceApprove(address(ccipRouter), fee);

        // Enviar el mensaje CCIP
        messageId = ccipRouter.ccipSend(destinationChainSelector, ccipMessage);

        emit PurchaseRequestSent(
            messageId,
            msg.sender,
            franchiseId,
            tokenAmount,
            paymentAmount,
            fee
        );
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Estima el fee LINK necesario para enviar una solicitud de compra
     * @param franchiseId ID de la franquicia
     * @param tokenAmount Cantidad de tokens
     * @param paymentAmount Monto de pago
     * @return fee Cantidad de LINK necesaria para el mensaje CCIP
     */
    function estimateFee(
        uint256 franchiseId,
        uint256 tokenAmount,
        uint256 paymentAmount
    ) external view returns (uint256 fee) {
        bytes memory data = abi.encode(msg.sender, franchiseId, tokenAmount, paymentAmount);

        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(receiverContract),
            data: data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: address(linkToken),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: destinationGasLimit})
            )
        });

        fee = ccipRouter.getFee(destinationChainSelector, ccipMessage);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Actualiza la dirección del contrato receiver en Base Sepolia
     * @param _newReceiver Nueva dirección del receiver
     */
    function setReceiverContract(address _newReceiver) external onlyOwner {
        require(_newReceiver != address(0), "CCIPSender: Receiver cannot be zero");
        emit ReceiverContractUpdated(receiverContract, _newReceiver);
        receiverContract = _newReceiver;
    }

    /**
     * @notice Actualiza el gas limit para la ejecución en destino
     * @param _newGasLimit Nuevo gas limit (mínimo 100_000)
     */
    function setDestinationGasLimit(uint256 _newGasLimit) external onlyOwner {
        require(_newGasLimit >= 100_000, "CCIPSender: Gas limit too low");
        emit DestinationGasLimitUpdated(destinationGasLimit, _newGasLimit);
        destinationGasLimit = _newGasLimit;
    }

    /**
     * @notice Deposita LINK en el contrato para pagar fees CCIP
     * @dev Alternativa a que el usuario apruebe LINK directamente
     * @param amount Cantidad de LINK a depositar
     */
    function depositLinkFees(uint256 amount) external {
        require(amount > 0, "CCIPSender: Amount must be positive");
        linkToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Retira LINK del contrato (solo owner)
     * @param amount Cantidad de LINK a retirar
     */
    function withdrawLink(uint256 amount) external onlyOwner {
        require(amount > 0, "CCIPSender: Amount must be positive");
        linkToken.safeTransfer(owner(), amount);
    }

    /**
     * @notice Retira USDC del contrato en caso de emergencia (solo owner)
     * @dev Solo debería usarse si hay fondos atascados
     * @param amount Cantidad de USDC a retirar
     */
    function emergencyWithdrawPaymentToken(uint256 amount) external onlyOwner {
        require(amount > 0, "CCIPSender: Amount must be positive");
        paymentToken.safeTransfer(owner(), amount);
    }
}
