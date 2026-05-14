# Green Theme & Animations Update

## Overview
Actualización completa del esquema de colores de azul/cyan a verde/emerald en toda la aplicación, con animaciones elegantes y llamativas en las tarjetas.

## Cambios de Color

### Página Explore (ExploreSection.tsx)

#### Hero Section
- ✅ Línea decorativa: `cyan-400` → `emerald-400`
- ✅ Texto "TOKENIZED ASSET ECOSYSTEM": `cyan-400` → `emerald-400`
- ✅ Gradiente "digital liquidity": `cyan-400 to blue-500` → `emerald-400 to green-500`
- ✅ Punto animado KYC Status: `cyan-400` → `emerald-400`

#### Asset Cards
**High-Yield Franchises:**
- Tag: `cyan-400` → `emerald-400`
- Accent color: `#00d1ff` → `#10b981`
- Glow & borders: cyan → emerald

**CrowToken & Governance:**
- Tag: `purple-400` → `emerald-400`
- Accent color: `#a855f7` → `#10b981`
- Glow & borders: purple → emerald

**Dividend Engine:**
- Mantiene `emerald-400` (ya estaba en verde)

#### Impact Metrics Panel
- Iconos: `cyan-400` → `emerald-400`
- Backgrounds: `cyan-400/10` → `emerald-400/10`
- Borders: `cyan-400/20` → `emerald-400/20`
- Hover text color: → `emerald-400`

#### CTA Banner
- Borde gradiente: `cyan-500/40 via blue-600/20 to purple-500/40` → `emerald-500/40 via green-600/20 to emerald-500/40`
- Glow orbs: cyan y purple → emerald y green
- Icono Zap: `cyan-400` → `emerald-400`
- Texto "READY TO TOKENIZE": `cyan-400` → `emerald-400`
- Gradiente "Own a piece": `cyan-400 to blue-500` → `emerald-400 to green-500`
- Botón "View Whitepaper": `cyan-400` → `emerald-400`
- Botón "Contact Sales" hover: `cyan-400` → `emerald-400`

### Página Portfolio (PortfolioSection.tsx)
- ✅ Todos los elementos cyan cambiados a cyan (se mantiene para diferenciación)
- ✅ Elementos morados cambiados a cyan
- ✅ Fondo de tarjetas: `rgba(10, 10, 10, 0.6)` → `rgba(41, 53, 48, 0.4)` (verde oscuro translúcido)

## Animaciones Elegantes

### Asset Cards - Efectos en Hover

#### 1. **Transformación Principal**
```css
transform: translateY(-12px) scale(1.02)
transition: 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) /* bounce effect */
```

#### 2. **Borde Animado**
- Borde superior con gradiente que se intensifica
- Overlay con gradiente diagonal que aparece suavemente
- Cambio de color del borde principal al color de acento

#### 3. **Glow Orb Mejorado**
- Tamaño aumentado: 32px → 48px
- Transición más lenta: 700ms
- Efecto de escala desde 0.8

#### 4. **Particle Effect**
- 3 partículas animadas con `animate-ping`
- Diferentes duraciones: 2s, 2.5s, 3s
- Delays escalonados: 0s, 0.3s, 0.6s
- Posiciones estratégicas en la tarjeta

#### 5. **Tag Badge**
- Escala: 1 → 1.1
- Shadow aumentado
- Bounce effect con cubic-bezier

#### 6. **Icono**
- Rotación: 0deg → 12deg
- Escala: 1 → 1.1
- Icono interno también escala 1.1x
- Bounce effect

#### 7. **Código Blueprint**
- Slide desde la derecha: `translateX(4px) → translateX(0)`
- Transición: 700ms

#### 8. **Tech Stack Pills**
- Animación escalonada con delay: `idx * 50ms`
- Background más opaco
- Bordes más visibles
- Texto más brillante

#### 9. **Data Point**
- Texto se desliza a la derecha: `translateX(1px)`
- Valor escala: 1.05x
- Borde superior más visible

#### 10. **Arrow Icon**
- Slide desde la derecha: `translateX(4px) → translateX(0)`
- Rotación: 0deg → 45deg
- Icono interno contra-rotación: -45deg
- Bounce effect

### Impact Metrics - Efectos en Hover

#### Panel Completo
- Borde: `white/5` → `emerald-400/20`
- Shadow: `0_0_40px_rgba(16,185,129,0.1)`

#### Cada Métrica
- Escala: 1 → 1.05
- Bounce effect
- Cursor pointer

#### Iconos
- Rotación: 0deg → 12deg
- Escala: 1 → 1.1
- Background más intenso
- Border más visible
- Shadow añadido

#### Texto
- Label: `white/30` → `emerald-400/70`
- Value: `white` → `emerald-400`
- Sub: `white/30` → `white/50`
- Slide a la derecha: `translateX(1px)`

## Timing Functions

### Cubic Bezier Bounce
```css
cubic-bezier(0.34, 1.56, 0.64, 1)
```
- Usado para: transformaciones principales, escalas, rotaciones
- Efecto: bounce suave y elegante

### Duraciones
- Transformaciones principales: 600ms - 700ms
- Opacidades: 500ms - 700ms
- Colores: 300ms
- Delays escalonados: 50ms por elemento

## Paleta de Colores Verde

### Primarios
- `emerald-400`: `#34d399` - Acentos principales
- `emerald-500`: `#10b981` - Backgrounds y glows
- `green-500`: `#22c55e` - Gradientes secundarios
- `green-600`: `#16a34a` - Gradientes intermedios

### Transparencias
- `emerald-400/10`: Backgrounds sutiles
- `emerald-400/20`: Borders y containers
- `emerald-400/40`: Borders intensos
- `emerald-400/70`: Texto hover

## Resultado Visual

### Antes
- Esquema azul/cyan/morado fragmentado
- Animaciones básicas de translate
- Sin efectos de partículas
- Transiciones lineales

### Después
- Esquema verde/emerald cohesivo
- Animaciones complejas multi-capa
- Efectos de partículas animadas
- Bounce effects elegantes
- Rotaciones y escalas coordinadas
- Delays escalonados para fluidez
- Glow effects intensificados

## Archivos Modificados
1. `frontend/app/components/ExploreSection.tsx` - Colores y animaciones completas
2. `frontend/app/components/PortfolioSection.tsx` - Colores actualizados previamente

## Experiencia de Usuario
- ✨ Animaciones suaves y elegantes
- 🎯 Feedback visual claro en hover
- 🎨 Paleta de colores cohesiva
- ⚡ Efectos de partículas llamativos
- 🔄 Rotaciones y escalas coordinadas
- 💚 Tema verde consistente en toda la app
