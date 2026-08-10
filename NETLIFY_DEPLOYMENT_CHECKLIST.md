# 🚀 Checklist de Despliegue a Netlify

## ✅ Estado Actual de Verificación Local

### Base de Datos
- [x] Prisma 6.19.3 instalado correctamente
- [x] Schema Prisma sincronizado con SQLite
- [x] Seed data ejecutado con éxito:
  - ✅ Franquicia "Cronium Burger #1" creada (ID: 1)
  - ✅ Usuario demo registrado con KYC aprobado

### Build Frontend
- [x] Next.js build completado exitosamente
- [x] Compilación en 24.1s (Turbopack)
- [x] TypeScript tipado correctamente (9.7s)
- [x] Rutas generadas:
  - ✅ `/` (static homepage)
  - ✅ `/api/ccip/order` (dynamic - CCIP orders)
  - ✅ `/api/franchises` (dynamic - franchise data)
  - ✅ `/api/user` (dynamic - user data)
  - ✅ `/design-preview` (static)
  - ✅ `/nova` (static design showcase)

---

## 📋 Preparación para Netlify

### Paso 1: Preparar Base de Datos en Producción

#### Opción A: Usar Neon (Recomendado - FREE TIER)
1. Ir a https://neon.tech
2. Registrarse (libre)
3. Crear nuevo proyecto PostgreSQL
4. Copiar connection string: `postgresql://user:password@host/dbname?sslmode=require`

#### Opción B: Usar Vercel Postgres
1. Ir a https://vercel.com/dashboard
2. Storage → Postgres → Create database
3. Copiar connection string

### Paso 2: Actualizar Prisma para Producción

**Archivo: `frontend/prisma/schema.prisma`**

Cambiar:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

A:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Paso 3: Configurar en Netlify

1. **Ir a**: https://netlify.com → Site settings → Build & deploy → Environment

2. **Agregar variable**: DATABASE_URL
   - Value: `postgresql://user:password@neon.tech/cronium_prod?sslmode=require`

3. **Mantener estas variables** (ya están configuradas):
```
NEXT_PUBLIC_FRANCHISE_TOKENIZER_ADDRESS=0xAC566fADcD8fE13A67307d13B994e89bf368447b
NEXT_PUBLIC_COMPLIANCE_MANAGER_ADDRESS=0x0101d356313142a5F6063BFED81C57D836a9EabC
NEXT_PUBLIC_DIVIDEND_DISTRIBUTOR_ADDRESS=0x36fe4A50e2aFfBE9D3d03A8b355bc59676D1EEB9
NEXT_PUBLIC_MUSDC_ADDRESS=0x5d22C60eFCb70cA752E718187D7C7C1D2a045410
NEXT_PUBLIC_RPC_URL=https://base-sepolia.g.alchemy.com/v2/pVGZiqtnbazA9X4jImXiU
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=355ef360811aef78c8bdf2dfddcad778
NEXT_PUBLIC_CCIP_SENDER_ADDRESS=0xaeB7dF9dD6268d38f6e30286A6D0885b85737f9F
NEXT_PUBLIC_ETH_SEPOLIA_USDC_ADDRESS=0x5d22C60eFCb70cA752E718187D7C7C1D2a045410
NEXT_PUBLIC_ETH_SEPOLIA_LINK_ADDRESS=0x779877A7B0D9E8603169DdbD7836e478b4624789
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/XsVbHiLZ2kp78VJvghxYL
```

### Paso 4: Actualizar netlify.toml

El archivo actual está bien, pero agregar post-build hook:

**Archivo: `frontend/netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NPM_FLAGS = "--legacy-peer-deps"
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Ejecutar migraciones después del build
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Paso 5: Crear Archivo de Configuración de Prisma

**Crear: `frontend/prisma.config.ts`** (reemplazo para deprecated package.json prisma)

```typescript
import { defineConfig } from 'prisma-schema-generator';

export default defineConfig({
  seed: 'prisma/seed.ts',
  client: {
    previewFeatures: ['jsonProtocol'],
  },
});
```

---

## 🔗 Pasos de Conexión en Netlify

### Opción 1: Conectar GitHub Directamente

1. **Ir a**: https://netlify.com
2. **Click**: "Add new site" → "Import an existing project"
3. **Seleccionar**: GitHub → `cronium-full-system` → main branch
4. **Configuración automática**:
   - Build command: `npm run build` (desde netlify.toml)
   - Publish directory: `.next`
   - Ejecuta desde: `frontend/` directory

### Opción 2: Usar Netlify CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Conectar repo
netlify connect

# O desplegar directamente
netlify deploy --prod --dir=frontend/.next
```

---

## 📊 Verificación en Netlify

### Después del Deployment

1. **Abrir sitio en navegador**
   - URL: `https://your-app.netlify.app`
   - Verificar que se carga sin errores

2. **Verificar Deployment Verification System**
   - Abrir DevTools (F12)
   - Console tab
   - Debe mostrar: `[Verification] Deployment verified successfully`
   - Sin errores de RPC

3. **Verificar API Endpoints**
   - Ir a: `https://your-app.netlify.app/api/franchises`
   - Respuesta esperada: JSON array con franquicia creada
   - Status: 200

4. **Verificar Database**
   - Los datos de seed deben ser accesibles en las API

5. **Verificar Web3 Connection**
   - Conectar MetaMask
   - Debe conectarse sin errores
   - Mostrar dirección de wallet

### Monitoreo Continuo

En Netlify → Site settings → Notifications:
- ✅ Enable build notifications
- ✅ Enable deployment notifications
- ✅ Setup Slack integration (opcional)

---

## 🛠️ Troubleshooting en Netlify

### Build Falla: "Command failed with exit code 1"

**Solución**:
1. Verificar logs completos en Netlify dashboard
2. Comúnmente: falta instalar dependencias
3. Agregár: `npm install` antes de build

### Error: "DATABASE_URL not found"

**Solución**:
1. Ir a Site settings → Environment
2. Verificar que DATABASE_URL está configurada
3. Usar formato: `postgresql://...` (no SQLite)

### Error: "Prisma engines binaries missing"

**Solución**:
```bash
# En package.json scripts, agregar:
"postinstall": "prisma generate"
```

### Página carga pero sin datos

**Solución**:
1. Verificar que seed se ejecutó
2. Ver logs: `npx prisma db seed` en local
3. Ejecutar migraciones: `npx prisma migrate deploy`

---

## ✨ Verificación Final (Antes de Deployment)

- [ ] PostgreSQL database creada en Neon/Vercel
- [ ] Connection string copiada
- [ ] DATABASE_URL configurada en Netlify env vars
- [ ] Prisma schema actualizado para PostgreSQL
- [ ] netlify.toml está en `frontend/` directory
- [ ] Build local completa sin errores: `npm run build`
- [ ] Seed data se ejecuta correctamente: `npx prisma db seed`
- [ ] Todas las variables de entorno están en Netlify
- [ ] GitHub repo está actualizado con cambios

---

## 🚀 Comandos Rápidos

```bash
# Verificar locally
cd frontend
npx prisma db push  # Sincronizar schema
npx prisma db seed  # Cargar datos
npm run build       # Build producción
npm start          # Iniciar servidor

# En Netlify (automático)
# Build: npm run build
# Deploy: .next directory
```

---

## 📞 Soporto y Debugging

### Logs en Netlify
- Site → Deploys → Click en deployment → View logs

### Prisma Debug
```bash
export DEBUG="prisma*"
npm run build
```

### Database Query Debug
```bash
npx prisma studio  # UI para consultar BD
```

---

## ✅ Post-Deployment Tasks

1. **Monitoreo**:
   - [ ] Setup Sentry error tracking
   - [ ] Setup Datadog/LogRocket
   - [ ] Configure alerts

2. **Optimización**:
   - [ ] Enable CDN caching
   - [ ] Configure image optimization
   - [ ] Setup domain personalizado

3. **Seguridad**:
   - [ ] Enable HTTPS (automático)
   - [ ] Configure CORS headers
   - [ ] Setup API rate limiting

4. **Backups**:
   - [ ] Enable automated PostgreSQL backups
   - [ ] Test restore procedures

---

## 📝 Notas Importantes

1. **Evitar SQLite en Producción**: PostgreSQL es obligatorio para Netlify
2. **Migraciones**: Usar `prisma migrate deploy` en producción
3. **Seed**: Ejecutar solo en desarrollo o usando script especial
4. **Node Version**: Usar Node 20 (configurado en netlify.toml)
5. **Build Time**: Esperar hasta 10 minutos en primer deploy

---

**Estado Actual**: ✅ LISTO PARA DESPLIEGUE EN NETLIFY
**Próximo Paso**: Configurar PostgreSQL database en Neon/Vercel

