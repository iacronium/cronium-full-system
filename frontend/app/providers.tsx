'use client';

import { RainbowKitProvider, darkTheme, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { coinbaseWallet, metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { baseSepolia, sepolia } from 'wagmi/chains';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { ReactNode, useState } from 'react';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  // In production this must be set — get a project ID at https://cloud.walletconnect.com
  // For local development the WalletConnect wallet option will be unavailable but MetaMask still works.
  console.warn(
    '[providers] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. ' +
    'WalletConnect connections will be unavailable. ' +
    'Add it to frontend/.env.local for full wallet support.'
  );
}

// Coinbase Wallet is listed first as the recommended option (native Base network wallet).
// MetaMask and WalletConnect follow as additional options.
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        coinbaseWallet,
        metaMaskWallet,
        ...(projectId ? [walletConnectWallet] : []),
      ],
    },
  ],
  { appName: 'Cronium RWA', projectId: projectId || 'dev_placeholder' }
);

// Use a dedicated RPC endpoint in production (NEXT_PUBLIC_RPC_URL).
// Falls back to the public Base Sepolia node for local development only —
// the public node has aggressive rate limits and should not be used in production.
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
const ethSepoliaRpcUrl = process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';

const wagmiConfig = createConfig({
  // Both chains are valid: Base Sepolia (native) and Ethereum Sepolia (via CCIP).
  chains: [baseSepolia, sepolia],
  connectors,
  transports: {
    // Reduce polling interval to 30 seconds (default is 4s)
    [baseSepolia.id]: http(rpcUrl, { 
      batch: true,  // Batch multiple requests into one
      retryCount: 2,
      timeout: 10_000,
    }),
    [sepolia.id]: http(ethSepoliaRpcUrl, { 
      batch: true,
      retryCount: 2,
      timeout: 10_000,
    }),
  },
  ssr: true, // Required for Next.js app router
  multiInjectedProviderDiscovery: true, // Allow injected providers (Coinbase, MetaMask extensions)
  // Reduce block polling frequency
  pollingInterval: 30_000, // Poll every 30 seconds instead of default 4s
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutos de cache (aumentado de 1 min)
        gcTime: 1000 * 60 * 10, // Mantener en cache 10 minutos
        retry: 2, // Reducido de 3 a 2 reintentos
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex + Math.random() * 500, 30_000), // Exponential backoff con jitter
        refetchOnWindowFocus: false, // Evita refetch innecesario al cambiar de pestaña
        refetchOnMount: false, // No refetch automático al montar
        refetchOnReconnect: false, // No refetch automático al reconectar
      },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#0000F5', accentColorForeground: '#FFFFFF' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
