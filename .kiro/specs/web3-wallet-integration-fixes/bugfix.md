# Bugfix Requirements Document

## Introduction

La aplicación React/Next.js integrada con contratos inteligentes en Base Sepolia presenta tres comportamientos incorrectos o incompletos en su capa de integración Web3 (Wagmi v2, Viem v2, RainbowKit). Los bugs afectan: (1) la reacción de la app ante cambios de red en la wallet del usuario, (2) el ciclo de vida de los estados de carga durante transacciones asíncronas, y (3) la detección de errores cuando el usuario rechaza una firma. Estos defectos degradan la experiencia de usuario y pueden provocar llamadas a contratos en redes incorrectas o estados de UI inconsistentes.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Cambio de red no manejado**

1.1 CUANDO el usuario cambia de red en su wallet (ej. de Mainnet a Base Sepolia o viceversa) ENTONCES la aplicación no detecta el cambio de cadena y continúa ejecutando llamadas a contratos con la configuración de red anterior.

1.2 CUANDO la red activa en la wallet no es Base Sepolia (chainId: 84532) ENTONCES la aplicación no bloquea ni advierte al usuario, permitiendo que los handlers `handleInvest`, `handleClaim` y `handleDemoSetup` intenten enviar transacciones a la red incorrecta.

1.3 CUANDO el usuario está en una red incorrecta ENTONCES la UI no muestra ningún indicador de red incompatible ni ofrece la opción de cambiar a Base Sepolia automáticamente.

**Bug 2 — Estados de loading/pending incorrectos en transacciones**

1.4 CUANDO `writeContract` es invocado en `handleInvest`, `handleClaim` o `handleDemoSetup` ENTONCES el bloque `finally` del try/catch resetea `isInvesting` a `false` inmediatamente, antes de que la transacción sea confirmada on-chain, dejando la UI en estado desbloqueado mientras la transacción aún está pendiente.

1.5 CUANDO `handleDemoSetup` es ejecutado ENTONCES llama a `writeContract` dos veces de forma consecutiva sin esperar confirmación entre llamadas, causando una race condition donde la segunda transacción puede enviarse antes de que la primera sea procesada por la wallet.

1.6 CUANDO `writeContract` lanza una excepción síncrona (ej. validación fallida antes de enviar) ENTONCES `isInvesting` queda en `true` indefinidamente porque el `finally` solo se ejecuta en el flujo del try/catch, pero el estado de `isWaitingForTx` no refleja correctamente el fin del proceso.

**Bug 3 — Detección incorrecta de rechazo de firma por el usuario**

1.7 CUANDO el usuario rechaza una firma en su wallet mientras se ejecuta `handleInvest` o `handleClaim` ENTONCES el catch intenta detectar el rechazo con `e.message?.includes('User rejected') || e.code === 4001`, pero en Wagmi v2 con Viem los errores de rechazo son instancias de `UserRejectedRequestError` de Viem, por lo que la condición no se cumple de forma confiable.

1.8 CUANDO el rechazo del usuario no es detectado correctamente ENTONCES la aplicación muestra el mensaje genérico "Error al procesar la inversión" en lugar de "Transacción cancelada por el usuario", confundiendo al usuario sobre la causa del fallo.

---

### Expected Behavior (Correct)

**Bug 1 — Cambio de red**

2.1 CUANDO el usuario cambia de red en su wallet ENTONCES la aplicación SHALL detectar el cambio mediante `useChainId` y compararlo con el chainId esperado (84532 — Base Sepolia).

2.2 CUANDO la red activa no es Base Sepolia ENTONCES la aplicación SHALL bloquear los handlers de escritura (`handleInvest`, `handleClaim`, `handleDemoSetup`) y mostrar un mensaje de advertencia indicando la red incorrecta.

2.3 CUANDO la red activa no es Base Sepolia y el usuario lo solicita ENTONCES la aplicación SHALL ofrecer cambiar automáticamente a Base Sepolia mediante `useSwitchChain`.

**Bug 2 — Estados de loading/pending**

2.4 CUANDO `writeContract` es invocado exitosamente ENTONCES `isInvesting` SHALL permanecer en `true` hasta que `useWaitForTransactionReceipt` reporte que la transacción ha sido confirmada (`isSuccess`) o ha fallado (`isError`), no hasta que el try/catch finalice.

2.5 CUANDO `handleDemoSetup` necesita ejecutar múltiples transacciones ENTONCES la aplicación SHALL ejecutarlas de forma secuencial, esperando la confirmación on-chain de cada una antes de enviar la siguiente, eliminando la race condition.

2.6 CUANDO `writeContract` lanza una excepción síncrona antes de enviar la transacción ENTONCES `isInvesting` SHALL ser reseteado a `false` correctamente en el bloque catch, sin depender del flujo de `useWaitForTransactionReceipt`.

**Bug 3 — Detección de rechazo de firma**

2.7 CUANDO el usuario rechaza una firma en su wallet ENTONCES la aplicación SHALL detectar el rechazo verificando si el error es una instancia de `UserRejectedRequestError` importada de `viem` (o usando el helper `isUserRejectedError` de Wagmi/Viem).

2.8 CUANDO el rechazo del usuario es detectado correctamente ENTONCES la aplicación SHALL mostrar el mensaje "Transacción cancelada por el usuario." y resetear `isInvesting` a `false`.

---

### Unchanged Behavior (Regression Prevention)

3.1 CUANDO el usuario está conectado a Base Sepolia y ejecuta `handleInvest` con allowance suficiente ENTONCES la aplicación SHALL CONTINUE TO enviar la transacción `purchaseTokens` al contrato `ComplianceManager` y mostrar el estado de confirmación.

3.2 CUANDO el usuario está conectado a Base Sepolia y ejecuta `handleInvest` sin allowance suficiente ENTONCES la aplicación SHALL CONTINUE TO enviar primero la transacción `approve` al contrato `mUSDC` antes de proceder con la compra.

3.3 CUANDO el usuario está conectado a Base Sepolia y ejecuta `handleClaim` con dividendos pendientes ENTONCES la aplicación SHALL CONTINUE TO enviar la transacción `claimDividend` al contrato `DividendDistributor`.

3.4 CUANDO una transacción es confirmada on-chain ENTONCES la aplicación SHALL CONTINUE TO mostrar el mensaje de éxito y el enlace a BaseScan con el hash de la transacción.

3.5 CUANDO el usuario no está conectado ENTONCES la aplicación SHALL CONTINUE TO mostrar el botón de conexión de wallet en lugar del botón de inversión.

3.6 CUANDO el modo demo no está activo y el usuario no tiene KYC verificado ENTONCES la aplicación SHALL CONTINUE TO bloquear la compra y mostrar el mensaje de KYC requerido.

3.7 CUANDO `useReadContract` obtiene datos de los contratos (franchiseInfo, kycStatus, allowance, etc.) ENTONCES la aplicación SHALL CONTINUE TO renderizar los valores correctos en la UI sin cambios en la lógica de lectura.

---

## Bug Condition Pseudocode

### Bug 1 — Cambio de red

```pascal
FUNCTION isBugCondition_NetworkChange(chainId)
  INPUT: chainId of type number
  OUTPUT: boolean
  
  RETURN chainId ≠ 84532  // No es Base Sepolia
END FUNCTION

// Property: Fix Checking
FOR ALL state WHERE isBugCondition_NetworkChange(state.chainId) DO
  ASSERT handlers_are_blocked(state)
  ASSERT warning_message_is_visible(state)
END FOR

// Property: Preservation Checking
FOR ALL state WHERE NOT isBugCondition_NetworkChange(state.chainId) DO
  ASSERT F(state) = F'(state)  // Comportamiento idéntico al original
END FOR
```

### Bug 2 — Estados de loading/pending

```pascal
FUNCTION isBugCondition_LoadingState(txState)
  INPUT: txState = { writeContractCalled: bool, isWaitingForTx: bool, isInvesting: bool }
  OUTPUT: boolean
  
  RETURN txState.writeContractCalled = true
     AND txState.isWaitingForTx = true
     AND txState.isInvesting = false  // Bug: se reseteó prematuramente
END FUNCTION

// Property: Fix Checking
FOR ALL txState WHERE isBugCondition_LoadingState(txState) DO
  result ← handleInvest'(txState)
  ASSERT result.isInvesting = true WHILE result.isWaitingForTx = true
END FOR
```

### Bug 3 — Rechazo de firma

```pascal
FUNCTION isBugCondition_UserRejection(error)
  INPUT: error of type unknown
  OUTPUT: boolean
  
  RETURN error instanceof UserRejectedRequestError  // Viem v2
END FUNCTION

// Property: Fix Checking
FOR ALL error WHERE isBugCondition_UserRejection(error) DO
  result ← handleError'(error)
  ASSERT result.statusMessage = "Transacción cancelada por el usuario."
  ASSERT result.isInvesting = false
END FOR
```
