# Web3 Wallet Integration Fixes — Bugfix Design

## Overview

Este documento formaliza el diseño técnico para corregir tres bugs en la capa de integración Web3 del componente `AccountAbstractionDemo.tsx`. Los bugs afectan: (1) la detección y bloqueo ante cambios de red, (2) el ciclo de vida de los estados de carga durante transacciones asíncronas, y (3) la detección de rechazo de firma por el usuario.

La estrategia de corrección es **mínima y quirúrgica**: se introduce un hook `useTransactionHandler` para encapsular la lógica de escritura de contratos, y se añaden `useChainId` / `useSwitchChain` de Wagmi v2 para el guard de red. No se modifica la lógica de lectura de contratos ni la estructura de la UI.

**Stack:** Next.js 16 (App Router), Wagmi v2.19.5, Viem v2.47.0, RainbowKit v2.2.10, TanStack Query v5  
**Red objetivo:** Base Sepolia (chainId: 84532)  
**Archivo principal:** `frontend/app/AccountAbstractionDemo.tsx`  
**Hook nuevo:** `frontend/app/hooks/useTransactionHandler.ts`

---

## Glossary

- **Bug_Condition (C)**: La condición que activa el bug — red incorrecta, `isInvesting` reseteado prematuramente, o error de rechazo no detectado.
- **Property (P)**: El comportamiento correcto esperado cuando la condición de bug se cumple.
- **Preservation**: Comportamientos existentes que NO deben cambiar tras la corrección.
- **`useChainId`**: Hook de Wagmi v2 que retorna el `chainId` activo de la wallet conectada, reactivo a cambios de red.
- **`useSwitchChain`**: Hook de Wagmi v2 que expone `switchChain({ chainId })` para solicitar al usuario cambiar de red.
- **`useWaitForTransactionReceipt`**: Hook de Wagmi v2 que suscribe al estado de confirmación on-chain de un hash de transacción.
- **`UserRejectedRequestError`**: Clase de error de Viem v2 que representa el rechazo explícito de una firma por el usuario en su wallet.
- **`writeContractAsync`**: Variante async de `useWriteContract` que retorna una Promise con el hash, permitiendo `await` y manejo de errores en el catch.
- **`isInvesting`**: Estado booleano de React que controla el bloqueo de botones durante una operación de escritura.
- **Race condition (Bug 2)**: Situación en `handleDemoSetup` donde dos `writeContract` se disparan sin esperar confirmación entre sí.
- **Base Sepolia**: Red de prueba L2 de Coinbase, chainId 84532, única red soportada por los contratos desplegados.

---

## Bug Details

### Bug 1 — Cambio de red no manejado

La aplicación no detecta ni reacciona cuando la wallet del usuario está conectada a una red distinta a Base Sepolia. Los handlers `handleInvest`, `handleClaim` y `handleDemoSetup` no verifican el `chainId` antes de enviar transacciones, lo que puede resultar en llamadas a contratos en redes incorrectas o errores silenciosos.

**Formal Specification:**
```
FUNCTION isBugCondition_NetworkChange(chainId)
  INPUT: chainId of type number
  OUTPUT: boolean

  RETURN chainId ≠ 84532
END FUNCTION
```

**Ejemplos:**
- Usuario en Ethereum Mainnet (chainId: 1) hace clic en "Comprar Fracción" → la tx se intenta enviar a Mainnet → falla silenciosamente o gasta gas en la red equivocada.
- Usuario en Polygon (chainId: 137) ejecuta `handleClaim` → el contrato `DividendDistributor` no existe en esa red → error de contrato no encontrado.
- Usuario en Base Sepolia (chainId: 84532) → comportamiento correcto, sin cambios.

---

### Bug 2 — Estados de loading/pending incorrectos

`isInvesting` se resetea a `false` en el bloque `finally` del try/catch, que se ejecuta en cuanto `writeContract` despacha la transacción a la wallet — no cuando la transacción es confirmada on-chain. Adicionalmente, `handleDemoSetup` llama a `writeContract` dos veces de forma síncrona sin esperar confirmación entre llamadas.

**Formal Specification:**
```
FUNCTION isBugCondition_LoadingState(txState)
  INPUT: txState = {
    writeContractCalled: boolean,
    isWaitingForTx: boolean,
    isInvesting: boolean
  }
  OUTPUT: boolean

  RETURN txState.writeContractCalled = true
     AND txState.isWaitingForTx = true
     AND txState.isInvesting = false  // reseteado prematuramente por finally
END FUNCTION
```

**Ejemplos:**
- `handleInvest` llama a `writeContract` → el `finally` ejecuta `setIsInvesting(false)` → el botón se desbloquea → `useWaitForTransactionReceipt` sigue en `isLoading: true` → UI inconsistente.
- `handleDemoSetup` llama a `writeContract` (mint) → inmediatamente llama a `writeContract` (setKYCStatus) → la wallet recibe dos solicitudes simultáneas → race condition, la segunda puede fallar o sobreescribir el estado de la primera.
- `handleInvest` lanza excepción síncrona (ej. `totalPrice > 3000`) → el `return` dentro del try evita el `finally` → `isInvesting` queda en `true` indefinidamente. *(Nota: en el código actual el `return` está antes del `finally`, por lo que sí se ejecuta, pero el flujo es frágil y propenso a errores en refactors.)*

---

### Bug 3 — Detección incorrecta de rechazo de firma

En Wagmi v2 con Viem, los errores de rechazo de firma son instancias de `UserRejectedRequestError` de Viem. El patrón actual `e.code === 4001` es la API de EIP-1193 directa (ethers.js / MetaMask legacy) y no es confiable en el contexto de Wagmi v2/Viem, donde los errores son objetos tipados.

**Formal Specification:**
```
FUNCTION isBugCondition_UserRejection(error)
  INPUT: error of type unknown
  OUTPUT: boolean

  // Condición de bug: el error ES un rechazo de usuario pero NO es detectado
  RETURN error instanceof UserRejectedRequestError
     AND NOT (error.message?.includes('User rejected') OR error.code === 4001)
     // En Wagmi v2/Viem, UserRejectedRequestError puede no tener .code === 4001
     // ni el mensaje exacto 'User rejected'
END FUNCTION
```

**Ejemplos:**
- Usuario rechaza firma en MetaMask → Viem lanza `UserRejectedRequestError` → `e.code` es `undefined` o no es `4001` → el catch muestra "Error al procesar la inversión" en lugar de "Transacción cancelada por el usuario."
- Usuario rechaza en WalletConnect → mismo comportamiento incorrecto.
- Usuario confirma la firma → no hay error → comportamiento correcto, sin cambios.

---

## Expected Behavior

### Preservation Requirements

**Comportamientos que NO deben cambiar:**
- Cuando el usuario está en Base Sepolia y ejecuta `handleInvest` con allowance suficiente, la transacción `purchaseTokens` se envía correctamente.
- Cuando el usuario está en Base Sepolia y ejecuta `handleInvest` sin allowance, se envía primero `approve` al contrato `mUSDC`.
- Cuando el usuario está en Base Sepolia y ejecuta `handleClaim`, se envía `claimDividend` al `DividendDistributor`.
- Cuando una transacción es confirmada on-chain, se muestra el mensaje de éxito y el enlace a BaseScan.
- Cuando el usuario no está conectado, se muestra el botón de conexión de wallet.
- Cuando el modo demo no está activo y el usuario no tiene KYC, se bloquea la compra.
- Todos los `useReadContract` (franchiseInfo, kycStatus, allowance, mUSDCBalance, etc.) continúan funcionando sin cambios.

**Scope:**
Todos los inputs que NO activen las condiciones de bug (red correcta, transacción confirmada, firma aceptada) deben producir exactamente el mismo comportamiento que el código original.

---

## Hypothesized Root Cause

### Bug 1
1. **Ausencia de guard de red**: No se importa ni usa `useChainId` en el componente. No existe ninguna comparación entre el chainId activo y `84532` antes de ejecutar handlers de escritura.
2. **Sin integración de `useSwitchChain`**: No hay mecanismo para solicitar al usuario cambiar de red automáticamente.

### Bug 2
1. **`writeContract` es fire-and-forget**: La versión no-async de `useWriteContract` no retorna una Promise. El `finally` se ejecuta inmediatamente después del dispatch, no después de la confirmación on-chain.
2. **`useWaitForTransactionReceipt` no controla `isInvesting`**: El estado `isInvesting` es gestionado localmente en el handler, desacoplado del ciclo de vida real de la transacción.
3. **`handleDemoSetup` sin secuenciación**: Dos llamadas a `writeContract` consecutivas sin `await` entre ellas crean una race condition.

### Bug 3
1. **Patrón de detección legacy**: `e.code === 4001` es la API de EIP-1193 directa. En Wagmi v2, los errores de Viem son objetos tipados con su propia jerarquía de clases.
2. **`e.message?.includes('User rejected')` es frágil**: El mensaje puede variar entre wallets y versiones de Viem.
3. **Solución correcta**: `import { UserRejectedRequestError } from 'viem'` y usar `error instanceof UserRejectedRequestError`.

---

## Correctness Properties

Property 1: Bug Condition — Network Guard Blocks Wrong-Chain Transactions

_For any_ state where `isBugCondition_NetworkChange(chainId)` returns true (chainId ≠ 84532), the fixed component SHALL block all write handlers (`handleInvest`, `handleClaim`, `handleDemoSetup`), display a network warning banner, and offer a "Switch to Base Sepolia" button that invokes `switchChain({ chainId: 84532 })`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition — isInvesting Stays True Until On-Chain Confirmation

_For any_ transaction state where `writeContractAsync` has been called and `useWaitForTransactionReceipt` reports `isLoading: true`, the fixed component SHALL keep `isInvesting` as `true` until `isSuccess` or `isError` is reported by `useWaitForTransactionReceipt`, never resetting it prematurely in a `finally` block.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 3: Bug Condition — Sequential Execution in handleDemoSetup

_For any_ execution of `handleDemoSetup`, the fixed function SHALL await the on-chain confirmation of the `mint` transaction before dispatching the `setKYCStatus` transaction, eliminating the race condition between consecutive `writeContract` calls.

**Validates: Requirements 2.5**

Property 4: Bug Condition — UserRejectedRequestError Detection

_For any_ error where `error instanceof UserRejectedRequestError` (from Viem) returns true, the fixed handlers SHALL display "Transacción cancelada por el usuario." and reset `isInvesting` to `false`, regardless of whether `error.code` equals `4001` or `error.message` contains 'User rejected'.

**Validates: Requirements 2.7, 2.8**

Property 5: Preservation — Correct-Chain Behavior Unchanged

_For any_ state where `isBugCondition_NetworkChange(chainId)` returns false (chainId === 84532), the fixed component SHALL produce exactly the same behavior as the original component for all write operations, preserving the full transaction flow (approve → purchaseTokens, claimDividend, mint + setKYCStatus).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

---

## Fix Implementation

### Arquitectura de la solución

Se introduce un hook `useTransactionHandler` que encapsula:
- `writeContractAsync` (variante async de `useWriteContract`)
- Gestión centralizada de `isInvesting` ligada al ciclo de vida real de la tx
- Detección de `UserRejectedRequestError`
- Exposición de `hash` para `useWaitForTransactionReceipt`

El componente `AccountAbstractionDemo` añade el guard de red usando `useChainId` y `useSwitchChain`.

---

### Archivo 1: `frontend/app/hooks/useTransactionHandler.ts` (nuevo)

**Propósito:** Encapsular la lógica de escritura de contratos con gestión correcta del ciclo de vida.

```typescript
import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { UserRejectedRequestError } from 'viem';
import type { Abi, ContractFunctionArgs, ContractFunctionName } from 'viem';

interface TransactionHandlerOptions {
  onSuccess?: (hash: `0x${string}`) => void;
  onError?: (message: string) => void;
  onUserRejected?: () => void;
}

export function useTransactionHandler(options: TransactionHandlerOptions = {}) {
  const [isInvesting, setIsInvesting] = useState(false);
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isWaitingForTx, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  // isInvesting se controla externamente por el caller, pero el hook
  // expone helpers para el patrón correcto
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
    // NO hay finally aquí: isInvesting se resetea cuando isSuccess/isError
    // se detecta en el componente via useEffect
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
```

**Nota de diseño:** `writeContractAsync` (en lugar de `writeContract`) retorna una `Promise<Hash>`, lo que permite `await` real y captura de errores en el `catch`. El `isInvesting` se resetea a `false` solo en el `catch` (error antes de enviar) o cuando `useWaitForTransactionReceipt` reporta `isSuccess`/`isError` (via `useEffect` en el componente).

---

### Archivo 2: `frontend/app/AccountAbstractionDemo.tsx` (modificaciones)

#### Cambio 1 — Importaciones

```typescript
// Añadir:
import { useChainId, useSwitchChain } from 'wagmi';
import { UserRejectedRequestError } from 'viem';
import { baseSepolia } from 'wagmi/chains';

// Reemplazar useWriteContract por writeContractAsync:
// Antes:
const { writeContract, data: hash } = useWriteContract();
// Después (o usar el hook useTransactionHandler):
const { writeContractAsync } = useWriteContract();
```

#### Cambio 2 — Guard de red (Bug 1)

```typescript
const chainId = useChainId();
const { switchChain } = useSwitchChain();
const isWrongNetwork = chainId !== baseSepolia.id; // baseSepolia.id === 84532

// En el JSX, añadir banner de red incorrecta:
{isWrongNetwork && isConnected && (
  <div className="p-4 rounded-2xl border bg-orange-500/10 border-orange-500/20 text-orange-400 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <ShieldAlert size={16} />
      <span className="text-xs font-bold uppercase tracking-wider">
        Red incorrecta. Por favor cambia a Base Sepolia.
      </span>
    </div>
    <button
      onClick={() => switchChain({ chainId: baseSepolia.id })}
      className="text-xs font-black uppercase tracking-widest bg-orange-500/20 hover:bg-orange-500/40 px-3 py-1 rounded-lg transition-all"
    >
      Cambiar Red
    </button>
  </div>
)}

// En cada handler, añadir guard al inicio:
const handleInvest = async () => {
  if (!address || !franchiseInfo) return;
  if (isWrongNetwork) {
    setStatusMessage({ text: 'Red incorrecta. Cambia a Base Sepolia.', type: 'error' });
    return;
  }
  // ... resto del handler
};
```

#### Cambio 3 — Gestión correcta de isInvesting (Bug 2)

```typescript
// Reemplazar writeContract por writeContractAsync en todos los handlers
// El patrón correcto:

const handleInvest = async () => {
  if (!address || !franchiseInfo || isWrongNetwork) return;
  setIsInvesting(true);
  setStatusMessage({ text: 'Iniciando transacción...', type: 'info' });
  try {
    // ... validaciones ...
    
    if (!allowance || allowance < totalPrice) {
      setStatusMessage({ text: 'Esperando aprobación de mUSDC...', type: 'info' });
      await writeContractAsync({
        address: MUSDC_ADDRESS,
        abi: MUSDC_ABI,
        functionName: 'approve',
        args: [COMPLIANCE_MANAGER_ADDRESS, parseUnits('1000000', 18)],
      });
      // isInvesting permanece true, el useEffect de isWaitingForTx lo manejará
      return;
    }

    setStatusMessage({ text: 'Por favor firma la compra en tu wallet...', type: 'info' });
    await writeContractAsync({
      address: COMPLIANCE_MANAGER_ADDRESS,
      abi: COMPLIANCE_ABI,
      functionName: 'purchaseTokens',
      args: [BigInt(currentFranchiseId), BigInt(purchaseQuantity), totalPrice],
    });
    // isInvesting permanece true hasta confirmación on-chain
  } catch (error: unknown) {
    if (error instanceof UserRejectedRequestError) {
      setStatusMessage({ text: 'Transacción cancelada por el usuario.', type: 'error' });
    } else {
      setStatusMessage({ text: 'Error al procesar la inversión.', type: 'error' });
    }
    setIsInvesting(false); // Solo se resetea aquí (error antes de enviar o rechazo)
  }
  // SIN finally: isInvesting se resetea via useEffect cuando isWaitingForTx termina
};

// useEffect para resetear isInvesting cuando la tx confirma o falla on-chain:
useEffect(() => {
  if (!isWaitingForTx && hash) {
    setIsInvesting(false);
    if (/* isSuccess */ true) {
      setStatusMessage({ text: '¡Transacción exitosa!', type: 'success' });
      refetchAllowance();
      refetchFranchise();
      refetchKYC();
      refetchDividends();
    }
  }
}, [isWaitingForTx, hash]);
```

#### Cambio 4 — handleDemoSetup secuencial (Bug 2, race condition)

```typescript
const handleDemoSetup = async () => {
  if (!address || isWrongNetwork) return;
  setIsInvesting(true);
  setStatusMessage({ text: 'Configurando entorno de demo...', type: 'info' });
  try {
    setStatusMessage({ text: 'Acuñando mUSDC de prueba...', type: 'info' });
    // AWAIT la primera transacción antes de enviar la segunda
    await writeContractAsync({
      address: MUSDC_ADDRESS,
      abi: MUSDC_ABI,
      functionName: 'mint',
      args: [address, parseUnits('1000', 18)],
    });
    // Esperar confirmación on-chain de mint antes de continuar
    // (useWaitForTransactionReceipt se actualiza reactivamente)
    // Para secuenciación explícita, usar waitForTransactionReceipt de viem directamente
    // o estructurar el flujo en dos pasos separados con estado intermedio.

    setStatusMessage({ text: 'Verificando KYC en Demo...', type: 'info' });
    await writeContractAsync({
      address: COMPLIANCE_MANAGER_ADDRESS,
      abi: COMPLIANCE_ABI,
      functionName: 'setKYCStatus',
      args: [address, 2],
    });
  } catch (error: unknown) {
    if (error instanceof UserRejectedRequestError) {
      setStatusMessage({ text: 'Configuración cancelada por el usuario.', type: 'error' });
    } else {
      setStatusMessage({ text: 'Error en configuración de demo.', type: 'error' });
    }
    setIsInvesting(false);
  }
  // SIN finally
};
```

**Nota sobre secuenciación en handleDemoSetup:** `writeContractAsync` con `await` garantiza que la wallet procesa la primera solicitud antes de recibir la segunda. Sin embargo, `await writeContractAsync` resuelve cuando el hash es retornado (tx enviada a mempool), no cuando es confirmada on-chain. Para confirmación on-chain entre pasos, se puede usar `waitForTransactionReceipt` del cliente Viem directamente, o dividir el flujo en dos handlers separados activados por el estado de la tx. La solución mínima (await del hash) ya elimina la race condition de la wallet.

#### Cambio 5 — Detección de UserRejectedRequestError (Bug 3)

```typescript
// Antes (en todos los handlers):
if (e.message?.includes('User rejected') || e.code === 4001) { ... }

// Después:
import { UserRejectedRequestError } from 'viem';

if (error instanceof UserRejectedRequestError) {
  setStatusMessage({ text: 'Transacción cancelada por el usuario.', type: 'error' });
} else {
  setStatusMessage({ text: 'Error al procesar la inversión.', type: 'error' });
}
```

---

## Testing Strategy

### Validation Approach

La estrategia sigue dos fases: primero, ejecutar tests exploratorios en el código **sin corregir** para confirmar o refutar el análisis de causa raíz; luego, verificar que el fix funciona (fix checking) y que no rompe comportamientos existentes (preservation checking).

---

### Exploratory Bug Condition Checking

**Goal:** Demostrar los bugs en el código original antes de aplicar el fix.

**Test Plan:** Usar mocks de Wagmi y Viem para simular los escenarios de bug. Ejecutar en el código sin corregir para observar los fallos.

**Test Cases:**

1. **Network Guard Missing**: Renderizar el componente con `useChainId` mockeado a `1` (Mainnet) → hacer clic en "Comprar Fracción" → verificar que `writeContract` es llamado (bug: no debería serlo). Fallará en código sin corregir porque no hay guard.

2. **isInvesting Reset Prematuro**: Mockear `writeContract` para que resuelva inmediatamente → verificar que `isInvesting` es `false` mientras `isWaitingForTx` es `true`. Fallará en código sin corregir porque el `finally` resetea antes de la confirmación.

3. **Race Condition en handleDemoSetup**: Mockear `writeContract` con un delay → verificar que se llama dos veces simultáneamente. Confirmará la race condition en código sin corregir.

4. **UserRejectedRequestError no detectado**: Mockear `writeContract` para lanzar `new UserRejectedRequestError({})` → verificar que el mensaje mostrado es "Transacción cancelada por el usuario." Fallará en código sin corregir porque `e.code === 4001` no matchea.

**Expected Counterexamples:**
- `writeContract` es invocado con chainId incorrecto.
- `isInvesting` es `false` mientras `isWaitingForTx` es `true`.
- `writeContract` es llamado dos veces sin esperar confirmación.
- El mensaje de error es "Error al procesar la inversión." en lugar del mensaje de rechazo.

---

### Fix Checking

**Goal:** Verificar que para todos los inputs donde la condición de bug se cumple, el código corregido produce el comportamiento esperado.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition_NetworkChange(state.chainId) DO
  result := render_fixed(state)
  ASSERT result.handlers_blocked = true
  ASSERT result.warning_banner_visible = true
END FOR

FOR ALL txState WHERE isBugCondition_LoadingState(txState) DO
  result := handleInvest_fixed(txState)
  ASSERT result.isInvesting = true WHILE result.isWaitingForTx = true
END FOR

FOR ALL error WHERE error instanceof UserRejectedRequestError DO
  result := handleError_fixed(error)
  ASSERT result.statusMessage = "Transacción cancelada por el usuario."
  ASSERT result.isInvesting = false
END FOR
```

---

### Preservation Checking

**Goal:** Verificar que para todos los inputs donde la condición de bug NO se cumple, el código corregido produce el mismo resultado que el original.

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition_NetworkChange(state.chainId) DO
  ASSERT handleInvest_original(state) = handleInvest_fixed(state)
  ASSERT handleClaim_original(state) = handleClaim_fixed(state)
END FOR

FOR ALL error WHERE NOT (error instanceof UserRejectedRequestError) DO
  ASSERT handleError_original(error) = handleError_fixed(error)
END FOR
```

**Testing Approach:** Property-based testing es recomendado para preservation checking porque:
- Genera automáticamente muchos estados de wallet (chainId, address, allowance, kycStatus).
- Captura edge cases que tests manuales podrían omitir.
- Provee garantías fuertes de que el comportamiento es idéntico para inputs no-buggy.

**Test Cases:**
1. **Correct Network Preservation**: Con chainId === 84532, verificar que `handleInvest` envía `purchaseTokens` exactamente igual que el original.
2. **Approve Flow Preservation**: Con allowance insuficiente y chainId correcto, verificar que se envía `approve` primero.
3. **Claim Preservation**: Con dividendos pendientes y chainId correcto, verificar que `claimDividend` se envía correctamente.
4. **Non-Rejection Error Preservation**: Con un error genérico (no `UserRejectedRequestError`), verificar que el mensaje es "Error al procesar la inversión."

---

### Unit Tests

- Test del guard de red: `isWrongNetwork` es `true` cuando `chainId !== 84532`, `false` cuando `chainId === 84532`.
- Test de `handleInvest` con red incorrecta: verifica que `writeContractAsync` no es llamado.
- Test de `handleInvest` con red correcta y allowance suficiente: verifica que `writeContractAsync` es llamado con los args correctos.
- Test de `isInvesting` lifecycle: verifica que permanece `true` mientras `isWaitingForTx` es `true`.
- Test de `handleDemoSetup` secuencial: verifica que el segundo `writeContractAsync` no se llama hasta que el primero resuelve.
- Test de detección de `UserRejectedRequestError`: verifica el mensaje correcto.
- Test de error genérico: verifica el mensaje de error genérico.

### Property-Based Tests

- Generar chainIds aleatorios: para cualquier `chainId !== 84532`, los handlers deben estar bloqueados.
- Generar estados de transacción aleatorios: `isInvesting` debe ser `true` si y solo si `isWaitingForTx` es `true` o `writeContractAsync` fue llamado y no ha resuelto.
- Generar errores aleatorios: solo `UserRejectedRequestError` debe producir el mensaje de cancelación; todos los demás deben producir el mensaje genérico.
- Generar allowances aleatorias: para cualquier `allowance < totalPrice`, el primer `writeContractAsync` debe ser `approve`; para `allowance >= totalPrice`, debe ser `purchaseTokens`.

### Integration Tests

- Flujo completo de inversión en Base Sepolia: connect wallet → verify KYC → approve mUSDC → purchaseTokens → confirmación on-chain → mensaje de éxito.
- Flujo de cambio de red: conectar en Mainnet → ver banner de red incorrecta → hacer clic en "Cambiar Red" → verificar que `switchChain` es invocado con `84532`.
- Flujo de rechazo: iniciar inversión → rechazar en wallet → verificar mensaje "Transacción cancelada por el usuario." y botón desbloqueado.
- Flujo de demo setup: ejecutar `handleDemoSetup` → verificar que mint confirma antes de setKYCStatus → ambas transacciones exitosas.
