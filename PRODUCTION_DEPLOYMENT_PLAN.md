# Plan de Despliegue a Producción en Netlify

## 📋 Resumen Ejecutivo

Este documento proporciona un plan completo para verificar el proyecto Cronium y desplegarlo a producción en Netlify. Incluye verificación de la base de datos, configuración de variables de entorno y pasos de validación.

---

## 🔍 Problemas Identificados

### 1. **Inconsistencia en Base de Datos**
- **Problema**: `schema.prisma` usa SQLite (`file:./dev.db`), pero `.env` y `.env.local` usan PostgreSQL
- **Impacto**: La base de datos local no funcionará correctamente
- **Solución**: Necesitamos elegir una estrategia de base de datos

### 2. **Recomendación para Producción**
Para Netlify (ambiente serverless), se recomienda:
- **PostgreSQL en Neon o Vercel Postgres** (mejor para production)
- **SQLite solo para desarrollo local**

---

## ✅ PASO 1: Verificar Base de Datos Localmente

### 1.1 Verificar Instalación de Prisma

```bash
cd frontend
npm install
npx prisma --version
```

**Esperado**: Versión 6.19.3 o superior

### 1.2 Limpiar Base de Datos Anterior

```bash
# Eliminar base de datos SQLite anterior
rm -f prisma/dev.db
rm -f prisma/dev.db-journal
```

### 1.3 Crear y Migrar Base de Datos

```bash
# Crear la base de datos y ejecutar migraciones
npx prisma migrate dev --name init

# O si solo queremos sincronizar el schema (sin migraciones formales):
npx prisma db push
```

**Esperado**: Schema creado sin errores

### 1.4 Ejecutar Seed (Datos Iniciales)

```bash
# Cargar datos de prueba
npx prisma db seed
```

**Esperado**: 
```
🌱 Iniciando la carga de datos semilla (seeding)...
✅ Franquicia registrada: Cronium Burger #1 (ID: 1)
✅ Usuario demo registrado: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
🚀 Seeding completado exitosamente.
```

### 1.5 Verificar datos en la BD

```bash
# Abrir interfaz de Prisma Studio
npx prisma studio
```

**Esperado**: 
- Abrir navegador en `http://localhost:5555`
- Ver 1 Franchise y 1 User

---

## ✅ PASO 2: Verificar el Proyecto Localmente

### 2.1 Verificar Dependencias

```bash
cd frontend
npm audit
```

**Esperado**: Sin vulnerabilidades críticas (warnings OK)

### 2.2 Build Local

```bash
npm run build
```

**Esperado**:
- ✅ Build completado sin errores
- ✅ `.next` folder creado
- ⚠️ Warnings sobre dynamic imports son normales

### 2.3 Verificar ESLint

```bash
npm run lint
```

**Esperado**: Sin errores críticos (warnings de estilo OK)

### 2.4 Iniciar servidor de producción local

```bash
npm start
```

**Esperado**:
- ✅ Servidor iniciado en `http://localhost:3000`
- ✅ Página carga sin errores
- ✅ Verificación de deployment ejecutada correctamente

---

## ✅ PASO 3: Preparar Variables de Entorno para Producción

### 3.1 Crear Base de Datos PostgreSQL en Producción

**Opción A: Usar Neon (Recomendado)**

1. Ir a https://neon.tech
2. Crear cuenta gratuita
3. Crear nuevo proyecto
4. Copiar connection string: `postgresql://user:password@host/database`

**Opción B: Usar Vercel Postgres**

1. Ir a https://vercel.com/docs/storage/postgres
2. Crear desde Vercel dashboard
3. Copiar connection string

### 3.2 Actualizar Variables de Entorno en Netlify

En Netlify dashboard → Site settings → Build & deploy → Environment:

```
DATABASE_URL=postgresql://user:password@neon.tech/cronium_prod
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

---

## ✅ PASO 4: Actualizar Configuración de Prisma para Producción

### 4.1 Actualizar schema.prisma

**Cambiar de:**
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**A:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4.2 Actualizar .env.local para desarrollo

```env
# DESARROLLO - SQLite
DATABASE_URL="file:./prisma/dev.db"

# Blockchain
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

### 4.3 Crear archivo .env.production (opcional)

Para valores específicos de producción:

```env
# PRODUCCIÓN - PostgreSQL en Neon/Vercel
# Esta variable se sobrescribe desde Netlify environment variables
NODE_ENV=production
```

---

## ✅ PASO 5: Crear Build Hooks en Netlify

### 5.1 Agregar Build Script

En `netlify.toml`, actualizar para ejecutar migraciones:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NPM_FLAGS = "--legacy-peer-deps"
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Ejecutar migraciones de Prisma antes del build
[functions]
  directory = "frontend/functions"
```

### 5.2 Crear función de migración (Netlify Functions)

Crear archivo: `frontend/functions/run-migrations.js`

```javascript
exports.handler = async (event) => {
  // Esta función se ejecuta antes del build
  console.log('🔄 Ejecutando migraciones de Prisma...');
  
  const { execSync } = require('child_process');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migraciones completadas');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Migrations completed' })
    };
  } catch (error) {
    console.error('❌ Error en migraciones:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

---

## ✅ PASO 6: Verificación Final Antes de Deploy

### Checklist de Pre-Deployment

- [ ] Base de datos local funciona con `npx prisma studio`
- [ ] Seed data se cargó correctamente
- [ ] Build local completa sin errores: `npm run build`
- [ ] Proyecto se inicia sin errores: `npm start`
- [ ] ESLint pasa: `npm run lint` (sin críticos)
- [ ] Todas las variables de entorno están configuradas en Netlify
- [ ] PostgreSQL database en Neon/Vercel está lista
- [ ] Dominio personalizado configurado (opcional)
- [ ] SSL/HTTPS está habilitado (automático en Netlify)

---

## 🚀 PASO 7: Desplegar a Netlify

### 7.1 Conectar Repositorio a Netlify

1. Ir a https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Seleccionar GitHub y el repositorio `cronium-full-system`
4. Rama: `main`
5. Build command: `npm run build` (automático desde netlify.toml)
6. Publish directory: `.next` (automático)

### 7.2 Configurar Variables de Entorno en Netlify

Site settings → Build & deploy → Environment → Add environment variables

Agregar todas las variables de `PASO 3.2`

### 7.3 Deploy

```bash
# Si usas Netlify CLI (opcional)
npm install -g netlify-cli
netlify deploy --prod
```

O simplemente haz push a main en GitHub - Netlify desplegará automáticamente.

---

## ✅ PASO 8: Validación en Producción

### 8.1 Verificar Health de la Aplicación

```bash
# Reemplazar con tu URL de Netlify
curl https://tu-app.netlify.app/api/health

# Respuesta esperada:
# { "status": "healthy", "database": "connected" }
```

### 8.2 Verificar Base de Datos

```bash
# Abrir Prisma Studio en producción (SOLO EN DESARROLLO)
# NUNCA exponer esto en producción
# En su lugar, usar herramientas de administración de BD
```

### 8.3 Verificar Blockchain Connection

1. Abrir DevTools (F12)
2. Verificar que la verificación de deployment se completa
3. Verificar consola sin errores de RPC
4. Conectar wallet para verificar integración Web3

### 8.4 Monitoreo

Configurar alertas en Netlify:
- Site settings → Notifications → Build & Deploy
- Recibir notificaciones de builds fallidos

---

## 🛠️ Troubleshooting

### Error: "PRISMA_ENGINES_CHECKSUM_INVALID"

```bash
cd frontend
rm -rf node_modules .next
npm install
npm run build
```

### Error: "database is locked"

Significa que SQLite está siendo usado por múltiples procesos. Para producción, **usar PostgreSQL es obligatorio**.

### Error de conexión a PostgreSQL

Verificar:
```bash
echo $DATABASE_URL
# Debe mostrar: postgresql://user:password@host/database
```

### Build fails con "prisma generate"

```bash
npx prisma generate
npm run build
```

---

## 📊 Arquitectura de Producción Recomendada

```
┌─────────────────────────────────────────────────────┐
│                    Netlify (CDN + Hosting)           │
│  ┌───────────────────────────────────────────────┐   │
│  │  Next.js Frontend (.next)                     │   │
│  │  - Deployment Verification System ✅          │   │
│  │  - Loading Screen + Error Handling ✅         │   │
│  │  - Nova Design System ✅                      │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼───┐    ┌─────▼──────┐  ┌──▼──────────┐
    │Neon/   │    │ Alchemy    │  │ WalletConnect│
    │Vercel  │    │ RPC Base   │  │ (Bridge)    │
    │Postgres│    │ Sepolia    │  └─────────────┘
    └────────┘    └────────────┘
```

---

## 📝 Notas Importantes

1. **Seguridad**: Las keys de RPC públicas pueden limitar rate limits. Considerar usar endpoint privado
2. **Base de datos**: PostgreSQL es obligatorio en producción (no SQLite)
3. **Migrations**: Usar `prisma migrate deploy` (no `push`) en producción
4. **Backups**: Neon/Vercel ofrecen backups automáticos
5. **Monitoreo**: Usar Sentry/LogRocket para error tracking en producción

---

## ✨ Próximos Pasos

1. [ ] Ejecutar verificación local (PASO 1-2)
2. [ ] Preparar PostgreSQL (PASO 3)
3. [ ] Actualizar Prisma config (PASO 4)
4. [ ] Preparar Netlify environment (PASO 5)
5. [ ] Hacer build final local (PASO 6)
6. [ ] Desplegar a Netlify (PASO 7)
7. [ ] Verificar en producción (PASO 8)
8. [ ] Configurar monitoreo

