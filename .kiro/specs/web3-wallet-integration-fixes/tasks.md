# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - Network Guard Missing / isInvesting Reset Prematuro / UserRejectedRequestError No Detectado
  - **CRITICAL**: Estos tests DEBEN FALLAR en el código sin corregir — el fallo confirma que los bugs existen
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: Los tests codifican el comportamiento esperado — validarán el fix cuando pasen tras la implementación
  - **GOAL**: Exponer contraejemplos que demuestren la existencia de los tres bugs
  - **Setup**: Instalar vitest + @testing-library/react + @testing-library/user-event + wagmi test utils si no existen
    - `cd frontend && npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom`
    - Crear `frontend/vitest.config.ts` con environment `jsdom` y setup para mocks de Wagmi
  - **Crear** `frontend/app/__tests__/bugConditions.test.tsx`

  **Sub-test 1.1 — Bug 1: Network Guard Missing**
  - **Scoped PBT Approach**: Scope the property to chainId values ≠ 84532 (e.g., 1, 137, 56, 42161)
  - Mockear `useChainId` de Wagmi para retornar `1` (Ethereum Mainnet)
  - Mockear `useWriteContract` para exponer un spy en `writeContract`
  - Renderizar `AccountAbstractionDemo` con wallet conectada
  - Simular clic en "Comprar Fracción" (handleInvest) y en "Claim Rewards" (handleClaim)
  - **ASSERT**: `writeContract` spy ES llamado (bug: no debería serlo con red incorrecta)
  - **ASSERT**: No se muestra banner de advertencia de red incorrecta (bug: debería mostrarse)
  - **EXPECTED OUTCOME**: Test FALLA — confirma que no hay guard de red en el código original
  - Documentar contraejemplo: "Con chainId=1, handleInvest llama a writeContract sin verificar la red"
  - _Requirements: 1.1, 1.2, 1.3_

  **Sub-test 1.2 — Bug 2: isInvesting Reset Prematuro**
  - **Scoped PBT Approach**: Caso concreto — writeContract resuelve inmediatamente pero isWaitingForTx sigue en true
  - Mockear `useWriteContract` para que `writeContract` resuelva síncronamente (simula dispatch a wallet)
  - Mockear `useWaitForTransactionReceipt` para retornar `{ isLoading: true }` (tx pendiente on-chain)
  - Renderizar `AccountAbstractionDemo` con chainId=84532 y wallet conectada
  - Simular clic en "Comprar Fracción" y esperar que `writeContract` sea llamado
  - **ASSERT**: `isInvesting` es `false` mientras `isWaitingForTx` es `true` (bug: debería ser `true`)
  - **EXPECTED OUTCOME**: Test FALLA — confirma el reset prematuro por el bloque `finally`
  - Documentar contraejemplo: "isInvesting=false mientras isWaitingForTx=true tras writeContract"
  - _Requirements: 1.4, 1.5_

  **Sub-test 1.3 — Bug 2: Race Condition en handleDemoSetup**
  - Mockear `useWriteContract` con un spy que registra el orden y timing de llamadas
  - Simular que `writeContract` tiene un delay de 100ms (simula procesamiento de wallet)
  - Renderizar `AccountAbstractionDemo` y simular clic en el botón de demo setup (ShieldAlert icon)
  - **ASSERT**: `writeContract` es llamado dos veces de forma simultánea (sin await entre llamadas)
  - **EXPECTED OUTCOME**: Test FALLA — confirma la race condition en el código original
  - Documentar contraejemplo: "writeContract(mint) y writeContract(setKYCStatus) se llaman sin esperar confirmación"
  - _Requirements: 1.5_

  **Sub-test 1.4 — Bug 3: UserRejectedRequestError No Detectado**
  - Importar `UserRejectedRequestError` de `viem`
  - Mockear `useWriteContract` para que `writeContract` lance `new UserRejectedRequestError({ cause: undefined })`
  - Mockear `useChainId` para retornar `84532` (red correcta, para aislar el bug 3)
  - Renderizar `AccountAbstractionDemo` con allowance suficiente y simular clic en "Comprar Fracción"
  - **ASSERT**: El mensaje de estado mostrado es "Error al procesar la inversión." (bug: debería ser "Transacción cancelada por el usuario.")
  - **EXPECTED OUTCOME**: Test FALLA — confirma que `e.code === 4001` no detecta `UserRejectedRequestError`
  - Documentar contraejemplo: "UserRejectedRequestError lanzado → mensaje genérico mostrado en lugar del mensaje de cancelación"
  - Run tests on UNFIXED code: `cd frontend && npx vitest run __tests__/bugConditions.test.tsx`
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.7, 1.8_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Comportamiento en Base Sepolia (chainId=84532) No Debe Cambiar
  - **IMPORTANT**: Follow observation-first methodology
  - **Crear** `frontend/app/__tests__/preservation.test.tsx`

  **Observaciones en código sin corregir (chainId=84532, comportamiento correcto):**
  - Observar: Con chainId=84532 y allowance suficiente, `writeContract` es llamado con `purchaseTokens`
  - Observar: Con chainId=84532 y allowance insuficiente, `writeContract` es llamado con `approve` primero
  - Observar: Con chainId=84532 y dividendos pendientes, `writeContract` es llamado con `claimDividend`
  - Observar: Con error genérico (no UserRejectedRequestError), el mensaje es "Error al procesar la inversión."
  - Observar: Con usuario no conectado, no se llama a `writeContract`
  - Observar: Con KYC no verificado y demo mode inactivo, no se llama a `writeContract`

  **Sub-test 2.1 — Preservation: Flujo de inversión con allowance suficiente**
  - Mockear `useChainId` → `84532`, `allowance` → `parseUnits('1000000', 18)`, `kycStatus` → `2`
  - Mockear `isDemoMode` → `true` (para simplificar el test de preservación)
  - Simular clic en "Comprar Fracción"
  - **ASSERT**: `writeContract`/`writeContractAsync` es llamado con `functionName: 'purchaseTokens'`
  - **ASSERT**: Los args incluyen `franchiseId`, `purchaseQuantity`, y `totalPrice` correctos
  - Verify test PASSES on UNFIXED code (confirma baseline)
  - _Requirements: 3.1_

  **Sub-test 2.2 — Preservation: Flujo de approve cuando allowance es insuficiente**
  - Mockear `useChainId` → `84532`, `allowance` → `BigInt(0)`, `kycStatus` → `2`, `isDemoMode` → `true`
  - Simular clic en "Comprar Fracción"
  - **ASSERT**: `writeContract`/`writeContractAsync` es llamado con `functionName: 'approve'` (no `purchaseTokens`)
  - Verify test PASSES on UNFIXED code
  - _Requirements: 3.2_

  **Sub-test 2.3 — Preservation: Flujo de claim de dividendos**
  - Mockear `useChainId` → `84532`, `pendingDividend` → `parseUnits('10', 18)`, `currentCycle` → `BigInt(1)`
  - Simular clic en "Claim Rewards"
  - **ASSERT**: `writeContract`/`writeContractAsync` es llamado con `functionName: 'claimDividend'`
  - Verify test PASSES on UNFIXED code
  - _Requirements: 3.3_

  **Sub-test 2.4 — Preservation: Error genérico no confundido con rechazo de usuario**
  - Mockear `useWriteContract` para lanzar `new Error('Network error')` (no UserRejectedRequestError)
  - Mockear `useChainId` → `84532`
  - Simular clic en "Comprar Fracción"
  - **ASSERT**: El mensaje mostrado es "Error al procesar la inversión." (no el mensaje de cancelación)
  - Verify test PASSES on UNFIXED code
  - _Requirements: 3.1, 3.2_

  **Sub-test 2.5 — Preservation: KYC bloqueado cuando demo mode inactivo**
  - Mockear `useChainId` → `84532`, `isDemoMode` → `false`, `kycStatus` → `0` (no verificado)
  - Simular clic en "Comprar Fracción"
  - **ASSERT**: `writeContract`/`writeContractAsync` NO es llamado
  - **ASSERT**: El mensaje mostrado contiene "KYC Requerido"
  - Verify test PASSES on UNFIXED code
  - _Requirements: 3.6_

  - Run preservation tests on UNFIXED code: `cd frontend && npx vitest run __tests__/preservation.test.tsx`
  - **EXPECTED OUTCOME**: Tests PASAN (confirma el baseline de comportamiento a preservar)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for web3-wallet-integration-fixes (Bug 1 + Bug 2 + Bug 3)

  - [x] 3.1 Crear hook `useTransactionHandler` (nuevo archivo)
    - Crear `frontend/app/hooks/useTransactionHandler.ts`
    - Importar `useState`, `useCallback` de React
    - Importar `useWriteContract`, `useWaitForTransactionReceipt` de `wagmi`
    - Importar `UserRejectedRequestError` de `viem`
    - Definir interfaz `TransactionHandlerOptions` con callbacks `onSuccess`, `onError`, `onUserRejected`
    - Implementar `execute(contractCall)` que usa `writeContractAsync` con `await`
    - En el `catch`: detectar `UserRejectedRequestError` con `instanceof` y llamar al callback correspondiente
    - Resetear `isInvesting` a `false` solo en el `catch` (NO en `finally`)
    - Exponer `{ execute, isInvesting, setIsInvesting, hash, isWaitingForTx, isSuccess, isError }`
    - _Bug_Condition: isBugCondition_LoadingState donde finally resetea isInvesting prematuramente_
    - _Bug_Condition: isBugCondition_UserRejection donde error instanceof UserRejectedRequestError no es detectado_
    - _Expected_Behavior: isInvesting permanece true hasta isSuccess/isError de useWaitForTransactionReceipt_
    - _Expected_Behavior: UserRejectedRequestError detectado con instanceof, mensaje "Transacción cancelada por el usuario."_
    - _Preservation: Comportamiento de writeContractAsync con args correctos no cambia_
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.2 Añadir guard de red en `AccountAbstractionDemo.tsx` (Bug 1)
    - Añadir imports: `useChainId`, `useSwitchChain` de `wagmi`; `baseSepolia` de `wagmi/chains`
    - Añadir `const chainId = useChainId()` y `const { switchChain } = useSwitchChain()`
    - Añadir `const isWrongNetwork = chainId !== baseSepolia.id` (baseSepolia.id === 84532)
    - Añadir banner de advertencia en el JSX (antes del grid principal):
      ```tsx
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
      ```
    - Añadir guard `if (isWrongNetwork) { setStatusMessage(...); return; }` al inicio de `handleInvest`, `handleClaim` y `handleDemoSetup`
    - _Bug_Condition: isBugCondition_NetworkChange(chainId) donde chainId ≠ 84532_
    - _Expected_Behavior: handlers bloqueados, banner visible, botón "Cambiar Red" invoca switchChain({ chainId: 84532 })_
    - _Preservation: Con chainId=84532, todos los handlers continúan funcionando igual_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Migrar de `writeContract` a `writeContractAsync` y corregir ciclo de vida de `isInvesting` (Bug 2)
    - Reemplazar `const { writeContract, data: hash } = useWriteContract()` por `const { writeContractAsync, data: hash } = useWriteContract()`
    - En `handleInvest`: reemplazar `writeContract({...})` por `await writeContractAsync({...})`; eliminar bloque `finally`; resetear `isInvesting(false)` solo en el `catch`
    - En `handleClaim`: reemplazar `writeContract({...})` por `await writeContractAsync({...})`; eliminar bloque `finally`; resetear `isInvesting(false)` solo en el `catch`
    - En `handleDemoSetup`: reemplazar ambas llamadas a `writeContract` por `await writeContractAsync({...})` secuenciales; eliminar bloque `finally`; resetear `isInvesting(false)` solo en el `catch`
    - Añadir `useEffect` para resetear `isInvesting` cuando `useWaitForTransactionReceipt` reporta `isSuccess` o `isError`:
      ```typescript
      useEffect(() => {
        if (!isWaitingForTx && hash) {
          setIsInvesting(false);
        }
      }, [isWaitingForTx, hash]);
      ```
    - _Bug_Condition: isBugCondition_LoadingState donde finally resetea isInvesting antes de confirmación on-chain_
    - _Bug_Condition: handleDemoSetup llama writeContract dos veces sin await (race condition)_
    - _Expected_Behavior: isInvesting=true mientras isWaitingForTx=true; handleDemoSetup secuencial_
    - _Preservation: Los args de writeContractAsync son idénticos a los de writeContract originales_
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 3.4 Reemplazar detección de rechazo de firma con `instanceof UserRejectedRequestError` (Bug 3)
    - Añadir import: `import { UserRejectedRequestError } from 'viem'` en `AccountAbstractionDemo.tsx`
    - En `handleInvest` catch: reemplazar `if (e.message?.includes('User rejected') || e.code === 4001)` por `if (error instanceof UserRejectedRequestError)`
    - En `handleClaim` catch: aplicar el mismo reemplazo
    - En `handleDemoSetup` catch: aplicar el mismo reemplazo con mensaje "Configuración cancelada por el usuario."
    - Asegurar que el tipo del parámetro catch es `unknown` (no `any`) para type safety
    - _Bug_Condition: isBugCondition_UserRejection donde error instanceof UserRejectedRequestError pero e.code !== 4001_
    - _Expected_Behavior: error instanceof UserRejectedRequestError → "Transacción cancelada por el usuario." + isInvesting=false_
    - _Preservation: Errores genéricos (no UserRejectedRequestError) siguen mostrando "Error al procesar la inversión."_
    - _Requirements: 2.7, 2.8_

  - [x] 3.5 Verify bug condition exploration tests now pass (fix checking)
    - **Property 1: Expected Behavior** - Network Guard / isInvesting Lifecycle / UserRejectedRequestError Detection
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Los tests de task 1 codifican el comportamiento esperado; cuando pasan, confirman que el fix es correcto
    - Run: `cd frontend && npx vitest run __tests__/bugConditions.test.tsx`
    - **EXPECTED OUTCOME**: Tests PASAN (confirma que los tres bugs están corregidos)
    - Si algún test falla, revisar la implementación del fix correspondiente antes de continuar
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.6 Verify preservation tests still pass (no regressions)
    - **Property 2: Preservation** - Comportamiento en Base Sepolia No Cambia
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `cd frontend && npx vitest run __tests__/preservation.test.tsx`
    - **EXPECTED OUTCOME**: Tests PASAN (confirma que no hay regresiones)
    - Confirmar que todos los flujos de preservación siguen funcionando tras el fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `cd frontend && npx vitest run`
  - Verificar que `bugConditions.test.tsx` pasa (fix checking — los tres bugs corregidos)
  - Verificar que `preservation.test.tsx` pasa (preservation checking — sin regresiones)
  - Verificar que el build de TypeScript no tiene errores: `cd frontend && npx tsc --noEmit`
  - Verificar que el linter no reporta errores nuevos: `cd frontend && npx eslint app/AccountAbstractionDemo.tsx app/hooks/useTransactionHandler.ts`
  - Si algún test falla o hay errores de compilación, resolver antes de marcar como completo
  - Asegurarse de que todos los tests pasan; consultar al usuario si surgen dudas sobre el comportamiento esperado
