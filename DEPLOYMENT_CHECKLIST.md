# Checklist de Despliegue a Producción — Cronium RWA Platform

> **Red objetivo:** Base Sepolia (chainId: 84532)  
> **Stack:** Next.js 16 · Wagmi v2 · Viem v2 · RainbowKit v2 · Hardhat · Solidity 0.8.20  
> **Última actualización:** Abril 2026

Marca cada ítem con `[x]` antes de considerar el despliegue completo.
Los ítems marcados con ⚠️ son **bloqueantes** — no continuar sin resolverlos.

---

## 1. Seguridad de Secretos y Variables de Entorno

### 1.1 Rotación de claves comprometidas ⚠️

- [ ] **CRÍTICO — Rotar `YOUR_PRIVATE_KEY` inmediatamente.**  
  La clave privada `21e21e4d4340e19e2b6c366b867833a13128aafcd1fb198e8b699fa6994f9e7e` está expuesta en el archivo `.env` del repositorio. Transferir todos los fondos de esa cuenta a una wallet nueva antes de cualquier despliegue.

- [ ] **CRÍTICO — Rotar `YOUR_INFURA_KEY`.**  
  La clave `bff268cc83774460b46b982f4a918cb4` está expuesta. Revocarla en el dashboard de Infura y generar una nueva.

- [ ] **CRÍTICO — Rotar `YOUR_BASESCAN_API_KEY`.**  
  La clave `9CYRREUIP1E31KSUAJE581327Y53ERDKIC` está expuesta. Revocarla en Basescan y generar una nueva.

- [x] Verificar que `.env` está en `.gitignore` raíz — conflicto de merge resuelto, `.env` y `.env.*` ignorados.

- [x] Verificar que `frontend/.env.local` está en `frontend/.gitignore` (ya configurado con `.env*`).

### 1.2 Variables de entorno del frontend (Vercel / plataforma de despliegue)

Configurar las siguientes variables en el panel de la plataforma de despliegue. **Nunca** commitear estos valores.

| Variable | Descripción | Ejemplo / Valor actual |
|---|---|---|
| `NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS` | Dirección del contrato FranchiseTokenizer | `0xAb59a3e3Ae08359139D457975579dA2fdeb0ff5f` |
| `NEXT_PUBLIC_COMPLIANCE_MANAGER_ADDRESS` | Dirección del contrato ComplianceManager | `0x9Ea652E99B9D488e53e418726642d872824c75D4` |
| `NEXT_PUBLIC_DIVIDEND_DISTRIBUTOR_ADDRESS` | Dirección del contrato DividendDistributor | `0xC8e3575e66FB54d0B00237f9b17dc6e05BF8d4B1` |
| `NEXT_PUBLIC_MUSDC_ADDRESS` | Dirección del contrato MockERC20 (mUSDC) | `0x70Fef40966f45fA2cdf2c241c247D806B9E24d61` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Project ID de WalletConnect Cloud | Obtener en cloud.walletconnect.com |
| `NEXT_PUBLIC_RPC_URL` | Endpoint RPC de Base Sepolia | `https://base-sepolia.infura.io/v3/<NEW_KEY>` |

- [ ] Todas las variables `NEXT_PUBLIC_*` configuradas en el entorno de producción.
- [x] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` apunta a un proyecto real (no `demo_project_id`).  
  Corregido en `providers.tsx` — ahora lanza un error explícito al arrancar si la variable no está definida.
- [x] `NEXT_PUBLIC_RPC_URL` apunta al nuevo endpoint de Infura con la clave rotada — variable externalizada en `providers.tsx`, con fallback al nodo público solo para desarrollo local.

### 1.3 Variables de entorno del contrato (Hardhat)

Configurar en el entorno de CI/CD o en un `.env` local **nunca commiteado**:

| Variable | Descripción |
|---|---|
| `YOUR_PRIVATE_KEY` | Clave privada del deployer (sin prefijo `0x`) — **NUEVA, rotada** |
| `YOUR_INFURA_KEY` | API key de Infura — **NUEVA, rotada** |
| `YOUR_BASESCAN_API_KEY` | API key de Basescan — **NUEVA, rotada** |

- [x] Crear un archivo `.env.example` en la raíz con las claves vacías como documentación — creado en `.env.example`.

---

## 2. Despliegue de Contratos Inteligentes

### 2.1 Pre-despliegue

- [ ] Resolver el conflicto de merge en `.gitignore` raíz (hay marcadores `<<<<<<<` sin resolver).
- [ ] Ejecutar el test suite completo y confirmar que pasa:
  ```bash
  npx hardhat test
  ```
- [ ] Confirmar que la cuenta deployer tiene suficiente ETH en Base Sepolia para el gas de los 4 contratos.  
  Estimado: ~0.01 ETH para los 4 despliegues + configuración de roles.
- [ ] Confirmar que `hardhat.config.js` apunta a la URL de Infura con la nueva clave:
  ```
  url: `https://base-sepolia.infura.io/v3/${YOUR_INFURA_KEY}`
  ```

### 2.2 Ejecución del despliegue

- [ ] Ejecutar el script de despliegue:
  ```bash
  npx hardhat run scripts/deploy_mvp.js --network baseSepolia
  ```
- [ ] Guardar las 4 direcciones de contratos que imprime el script al finalizar:
  - `FranchiseTokenizer`: `___________________________`
  - `ComplianceManager`: `___________________________`
  - `DividendDistributor`: `___________________________`
  - `PaymentToken (mUSDC)`: `___________________________`
- [ ] Confirmar que el script completó la fase de configuración post-despliegue:
  - `MINTER_ROLE` otorgado a `ComplianceManager` ✓
  - `demoModeActive` configurado según el entorno (ver sección 4) ✓

### 2.3 Verificación en Basescan ⚠️

Verificar los 4 contratos en [https://sepolia.basescan.org](https://sepolia.basescan.org) para que el código fuente sea público y auditable.

- [ ] Verificar `FranchiseTokenizer`:
  ```bash
  npx hardhat verify --network baseSepolia <FRANCHISE_TOKENIZER_ADDRESS> "ipfs://cronium-meta/"
  ```
  Confirmar en: `https://sepolia.basescan.org/address/<FRANCHISE_TOKENIZER_ADDRESS>#code`

- [ ] Verificar `ComplianceManager`:
  ```bash
  npx hardhat verify --network baseSepolia <COMPLIANCE_MANAGER_ADDRESS> \
    <FRANCHISE_TOKENIZER_ADDRESS> \
    <MUSDC_ADDRESS> \
    <TREASURY_ADDRESS>
  ```
  Confirmar en: `https://sepolia.basescan.org/address/<COMPLIANCE_MANAGER_ADDRESS>#code`

- [ ] Verificar `DividendDistributor`:
  ```bash
  npx hardhat verify --network baseSepolia <DIVIDEND_DISTRIBUTOR_ADDRESS> \
    <FRANCHISE_TOKENIZER_ADDRESS> \
    <MUSDC_ADDRESS> \
    3600
  ```
  Confirmar en: `https://sepolia.basescan.org/address/<DIVIDEND_DISTRIBUTOR_ADDRESS>#code`

- [ ] Verificar `MockERC20 (mUSDC)`:
  ```bash
  npx hardhat verify --network baseSepolia <MUSDC_ADDRESS> "Mock USDC" "mUSDC"
  ```
  Confirmar en: `https://sepolia.basescan.org/address/<MUSDC_ADDRESS>#code`

- [ ] Cada contrato muestra el badge verde **"Contract Source Code Verified"** en Basescan.
- [ ] El ABI publicado en Basescan coincide con los ABIs en `frontend/app/config/contracts.ts`.

### 2.4 Validación on-chain post-despliegue

Ejecutar estas verificaciones manualmente en Basescan (pestaña "Read Contract") o via `hardhat console`:

- [ ] `FranchiseTokenizer.nextFranchiseId()` retorna `> 0` (hay al menos una franquicia creada).
- [ ] `FranchiseTokenizer.hasRole(MINTER_ROLE, <COMPLIANCE_MANAGER_ADDRESS>)` retorna `true`.
- [ ] `ComplianceManager.demoModeActive()` retorna el valor esperado para el entorno.
- [ ] `DividendDistributor.interval()` retorna `3600` (1 hora en segundos).
- [ ] Las 4 direcciones en `frontend/.env.local` (o variables de producción) coinciden exactamente con las direcciones desplegadas.

---

## 3. Build y Despliegue del Frontend

### 3.1 Build de producción

- [x] Actualizar `frontend/app/layout.tsx` — metadata actualizado a "Cronium RWA Platform" con `metadataBase`.
- [ ] Ejecutar el build de producción sin errores:
  ```bash
  cd frontend && npm run build
  ```
- [ ] Confirmar que el build no tiene errores de TypeScript ni de Next.js.
- [ ] Ejecutar el test suite del frontend:
  ```bash
  cd frontend && npx vitest run
  ```
  Confirmar: 14/14 tests pasan.

### 3.2 Configuración de Next.js para producción

- [x] Headers de seguridad configurados en `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- [x] `images.remotePatterns` configurado en `next.config.ts` para `avatars.githubusercontent.com` y `upload.wikimedia.org`.

### 3.3 Verificación del frontend desplegado

- [ ] La app carga sin errores en consola del navegador.
- [ ] `WalletBalance` muestra el balance ETH correctamente (confirma que el RPC endpoint funciona).
- [ ] El banner de red incorrecta aparece al conectar una wallet en Mainnet.
- [ ] El banner desaparece al cambiar a Base Sepolia (chainId 84532).
- [ ] El botón "Cambiar Red" invoca el cambio de red correctamente.
- [ ] "Comprar Fracción" muestra el flujo de aprobación cuando `allowance = 0`.
- [ ] "Claim Rewards" está deshabilitado cuando `pendingDividend = 0`.
- [ ] El enlace "Ver en BaseScan" abre la transacción correcta tras una tx exitosa.

---

## 4. Configuración del Modo Demo

El contrato `ComplianceManager` tiene un flag `demoModeActive` que bypasea la verificación KYC. Definir explícitamente su estado antes del despliegue.

- [ ] **Decidir el estado del modo demo para producción:**
  - `true` → Cualquier usuario puede comprar sin KYC (apropiado para testnet pública / demo)
  - `false` → Solo usuarios con `kycStatus = 2` pueden comprar (apropiado para producción real)

- [ ] Si `demoModeActive = false`, confirmar que existe un flujo de verificación KYC funcional antes de lanzar.

- [ ] Si se necesita cambiar el estado post-despliegue, usar la función `setDemoMode(bool)` del `ComplianceManager` desde la cuenta owner:
  ```bash
  npx hardhat console --network baseSepolia
  > const cm = await ethers.getContractAt("ComplianceManager", "<ADDRESS>")
  > await cm.setDemoMode(false)
  ```

---

## 5. Monitoreo Post-Despliegue

- [ ] Configurar alertas en Basescan para las 4 direcciones de contratos (pestaña "Watch Address").
- [ ] Verificar que el nodo RPC de Infura tiene rate limits adecuados para el tráfico esperado.
- [ ] Confirmar que `refetchOnWindowFocus: false` está activo en `providers.tsx` para evitar llamadas RPC excesivas.
- [ ] Revisar los logs de la plataforma de despliegue (Vercel / Railway) tras las primeras 24h para detectar errores de hidratación SSR o fallos de RPC.

---

## Resumen de Direcciones Desplegadas

Completar tras el despliegue exitoso:

| Contrato | Dirección | Basescan |
|---|---|---|
| FranchiseTokenizer | `___________________________` | [Ver]() |
| ComplianceManager | `___________________________` | [Ver]() |
| DividendDistributor | `___________________________` | [Ver]() |
| MockERC20 (mUSDC) | `___________________________` | [Ver]() |
| Deployer / Treasury | `___________________________` | [Ver]() |

---

*Generado automáticamente a partir del análisis del código fuente del proyecto.*
