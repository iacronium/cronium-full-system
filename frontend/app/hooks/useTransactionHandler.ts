import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { UserRejectedRequestError } from 'viem';

interface TransactionHandlerOptions {
  onSuccess?: (hash: `0x${string}`) => void;
  onError?: (message: string) => void;
  onUserRejected?: () => void;
}

export function useTransactionHandler(options: TransactionHandlerOptions = {}) {
  const [isInvesting, setIsInvesting] = useState(false);
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isWaitingForTx, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  const execute = useCallback(async (
    contractCall: Parameters<typeof writeContractAsync>[0]
  ): Promise<`0x${string}` | null> => {
    setIsInvesting(true);
    try {
      const txHash = await writeContractAsync(contractCall);
      return txHash;
    } catch (error: unknown) {
      if (error instanceof UserRejectedRequestError) {
        options.onUserRejected?.();
      } else {
        options.onError?.('Error al procesar la transacción.');
      }
      setIsInvesting(false);
      return null;
    }
    // NO finally here: isInvesting is reset when isSuccess/isError is detected
    // in the component via useEffect
  }, [writeContractAsync, options]);

  return {
    execute,
    isInvesting,
    setIsInvesting,
    hash,
    isWaitingForTx,
    isSuccess,
    isError,
  };
}
