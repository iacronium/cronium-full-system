import { useQuery } from '@tanstack/react-query';
import {
  fetchWalletBalance,
  fetchBlockNumber,
  fetchGasPrice,
  fetchTokenBalance,
} from '../services/blockchainServices';

// ========================
// Políticas de caché compartidas
// ========================
const STALE_ONE_MINUTE = 1000 * 60;
const STALE_FIFTEEN_SECONDS = 1000 * 15;

// Retroceso exponencial con jitter para no saturar el nodo RPC
const retryDelay = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex + Math.random() * 500, 30_000);

/**
 * Hook para obtener el balance nativo (ETH) de una wallet.
 * Método RPC: eth_getBalance
 */
export const useGetBalance = (address: string) => {
  return useQuery({
    queryKey: ['balance', address],
    queryFn: () => fetchWalletBalance(address),
    enabled: Boolean(address),
    staleTime: STALE_ONE_MINUTE,
    retry: 3,
    retryDelay,
  });
};

/**
 * Hook para obtener el número de bloque actual de Sepolia Base.
 * Método RPC: eth_blockNumber
 */
export const useGetBlockNumber = () => {
  return useQuery({
    queryKey: ['blockNumber'],
    queryFn: fetchBlockNumber,
    staleTime: STALE_FIFTEEN_SECONDS, // bloques cambian cada ~2s en L2
    retry: 3,
    retryDelay,
    refetchInterval: 15_000, // Refetch automático cada 15s
  });
};

/**
 * Hook para obtener el precio actual del gas en Sepolia Base.
 * Método RPC: eth_gasPrice
 */
export const useGetGasPrice = () => {
  return useQuery({
    queryKey: ['gasPrice'],
    queryFn: fetchGasPrice,
    staleTime: STALE_FIFTEEN_SECONDS,
    retry: 3,
    retryDelay,
  });
};

/**
 * Hook para obtener el balance de un token ERC-20.
 * Método RPC: eth_call (balanceOf)
 */
export const useGetTokenBalance = (tokenAddress: string, walletAddress: string) => {
  return useQuery({
    queryKey: ['tokenBalance', tokenAddress, walletAddress],
    queryFn: () => fetchTokenBalance(tokenAddress, walletAddress),
    enabled: Boolean(tokenAddress) && Boolean(walletAddress),
    staleTime: STALE_ONE_MINUTE,
    retry: 3,
    retryDelay,
  });
};
