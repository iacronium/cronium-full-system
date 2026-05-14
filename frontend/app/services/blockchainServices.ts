import { z } from 'zod';
import { sepoliaRpc, buildRpcPayload } from '../config/api';

// ========================
// 1. Esquemas de Validación (Zod) — Contratos en tiempo de ejecución
// ========================

// Esquema genérico de respuesta JSON-RPC 2.0
const RpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.number(),
  result: z.unknown(),
});

// Balance: el nodo devuelve un hex string (ej. "0x1234")
const HexStringSchema = z.string().startsWith('0x');

// ========================
// 2. Tipos exportados
// ========================

export type BalanceData = {
  balance: string;       // en ETH (human-readable)
  balanceWei: string;    // en Wei (raw)
  symbol: string;
  network: string;
};

export type BlockNumberData = {
  blockNumber: number;
  blockHex: string;
};

export type GasPriceData = {
  gasPriceGwei: string;
  gasPriceWei: string;
};

// ========================
// 3. Utilidades de conversión
// ========================

/** Convierte un hex string de Wei a ETH con 6 decimales */
function weiHexToEth(hex: string): string {
  const wei = BigInt(hex);
  const ethWhole = wei / BigInt(1e18);
  const ethFraction = wei % BigInt(1e18);
  const fractionStr = ethFraction.toString().padStart(18, '0').slice(0, 6);
  return `${ethWhole}.${fractionStr}`;
}

/** Convierte un hex string de Wei a Gwei con 2 decimales */
function weiHexToGwei(hex: string): string {
  const wei = BigInt(hex);
  const gwei = wei / BigInt(1e9);
  const gweiRemainder = (wei % BigInt(1e9)) / BigInt(1e7);
  return `${gwei}.${gweiRemainder.toString().padStart(2, '0')}`;
}

// ========================
// 4. Servicios de Dominio — funciones asíncronas puras con JSON-RPC
// ========================

/**
 * Obtiene el balance nativo (ETH) de una wallet en Sepolia Base.
 * Método RPC: eth_getBalance
 */
export const fetchWalletBalance = async (address: string): Promise<BalanceData> => {
  const payload = buildRpcPayload('eth_getBalance', [address, 'latest']);
  const response = await sepoliaRpc.post('/', payload);

  // Validar estructura JSON-RPC 2.0
  const rpcResult = RpcResponseSchema.safeParse(response.data);
  if (!rpcResult.success) {
    console.error('[Contract Error] RPC response schema mismatch:', rpcResult.error.flatten());
    throw new Error('Error de contrato: respuesta RPC inválida');
  }

  // Validar que el result es un hex string
  const hexResult = HexStringSchema.safeParse(rpcResult.data.result);
  if (!hexResult.success) {
    console.error('[Contract Error] Balance hex mismatch:', hexResult.error.flatten());
    throw new Error('Error de contrato: formato de balance inválido');
  }

  const balanceWei = BigInt(hexResult.data).toString();
  const balanceEth = weiHexToEth(hexResult.data);

  return {
    balance: balanceEth,
    balanceWei,
    symbol: 'ETH',
    network: 'sepolia-base',
  };
};

/**
 * Obtiene el número de bloque actual.
 * Método RPC: eth_blockNumber
 */
export const fetchBlockNumber = async (): Promise<BlockNumberData> => {
  const payload = buildRpcPayload('eth_blockNumber');
  const response = await sepoliaRpc.post('/', payload);

  const rpcResult = RpcResponseSchema.safeParse(response.data);
  if (!rpcResult.success) {
    throw new Error('Error de contrato: respuesta RPC inválida');
  }

  const hexResult = HexStringSchema.safeParse(rpcResult.data.result);
  if (!hexResult.success) {
    throw new Error('Error de contrato: formato de bloque inválido');
  }

  return {
    blockNumber: Number(BigInt(hexResult.data)),
    blockHex: hexResult.data,
  };
};

/**
 * Obtiene el precio actual del gas.
 * Método RPC: eth_gasPrice
 */
export const fetchGasPrice = async (): Promise<GasPriceData> => {
  const payload = buildRpcPayload('eth_gasPrice');
  const response = await sepoliaRpc.post('/', payload);

  const rpcResult = RpcResponseSchema.safeParse(response.data);
  if (!rpcResult.success) {
    throw new Error('Error de contrato: respuesta RPC inválida');
  }

  const hexResult = HexStringSchema.safeParse(rpcResult.data.result);
  if (!hexResult.success) {
    throw new Error('Error de contrato: formato de gas inválido');
  }

  return {
    gasPriceGwei: weiHexToGwei(hexResult.data),
    gasPriceWei: BigInt(hexResult.data).toString(),
  };
};

/**
 * Obtiene el balance de un token ERC-20 para un address.
 * Método RPC: eth_call (ejecuta balanceOf(address))
 */
export const fetchTokenBalance = async (
  tokenAddress: string,
  walletAddress: string
): Promise<string> => {
  // balanceOf(address) selector = 0x70a08231 + address padded to 32 bytes
  const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = `0x70a08231${paddedAddress}`;

  const payload = buildRpcPayload('eth_call', [
    { to: tokenAddress, data },
    'latest',
  ]);

  const response = await sepoliaRpc.post('/', payload);

  const rpcResult = RpcResponseSchema.safeParse(response.data);
  if (!rpcResult.success) {
    throw new Error('Error de contrato: respuesta RPC inválida');
  }

  const hexResult = HexStringSchema.safeParse(rpcResult.data.result);
  if (!hexResult.success) {
    throw new Error('Error de contrato: formato de balance de token inválido');
  }

  return BigInt(hexResult.data).toString();
};
