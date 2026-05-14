// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockCCIPRouter
 * @notice Mock del router CCIP de Chainlink para tests locales con Hardhat.
 * Simula el envío y recepción de mensajes CCIP sin necesidad de infraestructura real.
 *
 * Uso en tests:
 *  1. Desplegar MockCCIPRouter.
 *  2. Usar su dirección como `_ccipRouter` en Sender y Receiver.
 *  3. Llamar a `simulateMessageReceived(receiver, message)` para simular
 *     la entrega de un mensaje desde la cadena origen.
 */
contract MockCCIPRouter is IRouterClient {
    /// @notice Fee fijo simulado en LINK (0.1 LINK = 0.1 * 10^18)
    uint256 public constant MOCK_FEE = 0.1 ether;

    /// @notice Último messageId generado (para verificación en tests)
    bytes32 public lastMessageId;

    /// @notice Contador de mensajes enviados
    uint256 public messageCount;

    /// @notice Último mensaje enviado (para inspección en tests)
    Client.EVM2AnyMessage public lastMessage;

    /// @notice Último destino al que se envió un mensaje
    uint64 public lastDestinationChainSelector;

    // ============================================
    // EVENTS
    // ============================================

    event MessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed sender,
        bytes data
    );

    event MessageDelivered(
        bytes32 indexed messageId,
        address indexed receiver,
        uint64 sourceChainSelector
    );

    // ============================================
    // IRouterClient IMPLEMENTATION
    // ============================================

    /**
     * @notice Siempre retorna true — todas las cadenas son "soportadas" en el mock
     */
    function isChainSupported(uint64 /*destChainSelector*/) external pure override returns (bool) {
        return true;
    }

    /**
     * @notice Retorna el fee fijo simulado
     */
    function getFee(
        uint64 /*destinationChainSelector*/,
        Client.EVM2AnyMessage memory /*message*/
    ) external pure override returns (uint256) {
        return MOCK_FEE;
    }

    /**
     * @notice Simula el envío de un mensaje CCIP
     * @dev Cobra el fee en LINK del sender, genera un messageId determinístico,
     * y almacena el mensaje para inspección en tests.
     * NO entrega el mensaje automáticamente — usar simulateMessageReceived() para eso.
     */
    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable override returns (bytes32 messageId) {
        // Cobrar fee en LINK si se especificó feeToken
        if (message.feeToken != address(0)) {
            IERC20(message.feeToken).transferFrom(msg.sender, address(this), MOCK_FEE);
        }

        // Generar messageId determinístico basado en el estado actual
        messageId = keccak256(
            abi.encodePacked(
                block.timestamp,
                msg.sender,
                destinationChainSelector,
                messageCount,
                message.data
            )
        );

        lastMessageId = messageId;
        lastMessage = message;
        lastDestinationChainSelector = destinationChainSelector;
        messageCount++;

        emit MessageSent(messageId, destinationChainSelector, msg.sender, message.data);
    }

    // ============================================
    // TEST HELPERS
    // ============================================

    /**
     * @notice Simula la entrega de un mensaje CCIP a un contrato receiver
     * @dev Llama directamente a ccipReceive() en el receiver con el mensaje construido.
     * Usar en tests para simular el flujo completo end-to-end.
     * @param receiver Dirección del CCIPTokenPurchaseReceiver
     * @param messageId ID del mensaje (usar lastMessageId del envío previo)
     * @param sourceChainSelector Chain selector de la cadena origen simulada
     * @param senderAddress Dirección del sender en la cadena origen
     * @param data Payload del mensaje (mismo que se envió)
     */
    function simulateMessageReceived(
        address receiver,
        bytes32 messageId,
        uint64 sourceChainSelector,
        address senderAddress,
        bytes calldata data
    ) external {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(senderAddress),
            data: data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        IAny2EVMMessageReceiver(receiver).ccipReceive(message);

        emit MessageDelivered(messageId, receiver, sourceChainSelector);
    }

    /**
     * @notice Retira LINK acumulado de fees (para reutilizar en tests)
     * @param linkToken Dirección del token LINK
     * @param to Dirección destino
     */
    function withdrawFees(address linkToken, address to) external {
        uint256 balance = IERC20(linkToken).balanceOf(address(this));
        if (balance > 0) {
            IERC20(linkToken).transfer(to, balance);
        }
    }
}
