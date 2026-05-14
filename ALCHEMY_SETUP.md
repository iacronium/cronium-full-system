# 🚀 Configuración de Alchemy — Solución al Error 402 de Infura

## ❌ Problema Actual
Infura está devolviendo **Error 402** (Payment Required) porque alcanzaste el límite diario de 100,000 requests.

## ✅ Solución: Cambiar a Alchemy

Alchemy ofrece **300 millones de compute units por mes** en su tier gratuito, que es ~3000x más que Infura.

---

## 📋 Paso a Paso

### 1. Crear Cuenta en Alchemy

1. Ve a https://www.alchemy.com/
2. Click en **"Sign Up"** (esquina superior derecha)
3. Regístrate con email o GitHub
4. Verifica tu email

### 2. Crear App para Base Sepolia

1. En el dashboard, click **"+ Create new app"**
2. Configura:
   - **Name**: `Cronium Base Sepolia`
   - **Chain**: `Base`
   - **Network**: `Base Sepolia (testnet)`
3. Click **"Create app"**
4. Click en tu nueva app
5. Click en **"API Key"** (botón azul)
6. Copia el **HTTPS endpoint**, se ve así:
   ```
   https://base-sepolia.g.alchemy.com/v2/TU_API_KEY_AQUI
   ```

### 3. Crear App para Ethereum Sepolia

1. Click **"+ Create new app"** de nuevo
2. Configura:
   - **Name**: `Cronium Eth Sepolia`
   - **Chain**: `Ethereum`
   - **Network**: `Sepolia (testnet)`
3. Click **"Create app"**
4. Click en tu nueva app
5. Click en **"API Key"**
6. Copia el **HTTPS endpoint**, se ve así:
   ```
   https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY_AQUI
   ```

### 4. Actualizar .env.local

Abre `frontend/.env.local` y reemplaza estas líneas:

```bash
# Reemplaza esta línea:
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# Por tu endpoint de Alchemy:
NEXT_PUBLIC_RPC_URL=https://base-sepolia.g.alchemy.com/v2/TU_API_KEY_AQUI

# Reemplaza esta línea:
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Por tu endpoint de Alchemy:
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY_AQUI
```

**Ejemplo completo:**
```bash
NEXT_PUBLIC_RPC_URL=https://base-sepolia.g.alchemy.com/v2/abc123xyz789
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/abc123xyz789
```

### 5. Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C en la terminal)
# Luego reinicia:
npm run dev
```

### 6. Verificar que Funciona

1. Abre http://localhost:3000
2. Abre DevTools → Network tab
3. Filtra por `alchemy.com`
4. Deberías ver requests con **Status 200** ✅ (no más 402)

---

## 📊 Comparación: Infura vs Alchemy

| Feature | Infura Free | Alchemy Free |
|---------|-------------|--------------|
| **Requests/día** | 100,000 | ~10,000,000 |
| **Compute Units** | - | 300M/mes |
| **Rate Limit** | Estricto | Generoso |
| **WebSocket** | ✅ | ✅ |
| **Batching** | ✅ | ✅ |
| **Dashboard** | Básico | Avanzado |
| **Alertas** | Email | Email + Slack |

**Veredicto**: Alchemy es **~100x más generoso** para desarrollo.

---

## 🔍 Monitorear Uso en Alchemy

### Dashboard
1. Ve a https://dashboard.alchemy.com/
2. Selecciona tu app
3. Ve a **"Analytics"**
4. Revisa:
   - **Compute Units Used** (de 300M)
   - **Requests per Second**
   - **Request History**

### Alertas
1. Ve a **"Settings"** → **"Notifications"**
2. Configura alertas al:
   - 75% de uso
   - 90% de uso
   - 100% de uso

---

## 🆘 Troubleshooting

### "Invalid API Key"
**Causa**: API key incorrecta o mal copiada

**Solución**:
1. Verifica que copiaste el endpoint completo (incluye `/v2/`)
2. No agregues espacios al inicio o final
3. Asegúrate de usar el endpoint correcto (Base Sepolia vs Eth Sepolia)

### Sigue viendo Error 402
**Causa**: El servidor no se reinició o está usando cache

**Solución**:
1. Detén el servidor completamente (Ctrl+C)
2. Borra cache del navegador (Ctrl+Shift+Delete)
3. Reinicia: `npm run dev`
4. Recarga la página con Ctrl+F5 (hard reload)

### "Rate limit exceeded"
**Causa**: Demasiados requests por segundo (raro en tier gratuito)

**Solución**:
1. Aumenta `pollingInterval` a 60 segundos en `providers.tsx`
2. Cierra tabs duplicadas del navegador
3. Revisa que no tengas extensiones haciendo requests

---

## 💡 Tips Adicionales

### Para Desarrollo:
- ✅ Usa Alchemy (300M compute units/mes gratis)
- ✅ Mantén las optimizaciones de cache (ya implementadas)
- ✅ Cierra tabs del navegador que no uses
- ✅ Usa el botón "Refresh" manual en lugar de auto-polling

### Para Producción:
- ✅ Upgrade a Alchemy Growth ($49/mes, 1.5B compute units)
- ✅ O usa múltiples providers (load balancing)
- ✅ Implementa rate limiting en el frontend
- ✅ Usa server-side caching (Redis)

---

## 📝 Estado Actual

### ✅ Cambios Temporales Aplicados:
```bash
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org (público, rate limited)
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://rpc.sepolia.org (público, rate limited)
```

### 🎯 Próximo Paso:
Reemplazar con tus endpoints de Alchemy para tener:
- ✅ 300M compute units/mes
- ✅ Sin rate limits estrictos
- ✅ Dashboard avanzado
- ✅ Mejor performance

---

## 🔗 Links Útiles

- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [Alchemy Docs](https://docs.alchemy.com/)
- [Alchemy Pricing](https://www.alchemy.com/pricing)
- [Base Sepolia Faucet](https://faucets.chain.link/base-sepolia)
- [Eth Sepolia Faucet](https://faucets.chain.link/sepolia)

---

**Tiempo estimado**: 5-10 minutos  
**Costo**: $0 (tier gratuito)  
**Beneficio**: ~100x más requests disponibles 🚀
