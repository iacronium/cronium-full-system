import axios from 'axios';

// Capa de Configuración — Axios apuntando directamente al nodo RPC de Sepolia Base
export const sepoliaRpc = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper para construir payloads JSON-RPC 2.0
let rpcId = 0;
export const buildRpcPayload = (method: string, params: unknown[] = []) => ({
  jsonrpc: '2.0' as const,
  method,
  params,
  id: ++rpcId,
});

// Interceptor global de errores con retry automático en 429
sepoliaRpc.interceptors.response.use(
  (response) => {
    if (response.data?.error) {
      const rpcError = response.data.error;
      console.error('[RPC Error]', rpcError.code, rpcError.message);
      return Promise.reject(new Error(`RPC Error: ${rpcError.message}`));
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const config = error.config as typeof error.config & { _retryCount?: number };

    // Retry automático en 429 (rate limit) con backoff exponencial — máx 3 intentos
    if (status === 429) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      if (config._retryCount <= 3) {
        const delay = Math.min(1000 * 2 ** config._retryCount, 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sepoliaRpc(config);
      }
    }

    // Solo loguear errores que no sean 429 silenciados
    if (status !== 429) {
      console.error('[Network Error]', status, error.message);
    }
    return Promise.reject(error);
  }
);
