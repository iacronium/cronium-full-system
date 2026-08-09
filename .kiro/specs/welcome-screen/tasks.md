# Implementation Plan: Welcome Screen

## Overview

Implementar la Welcome Screen de Cronium como página pública en la ruta `/`, reemplazando `app/page.tsx`. El plan sigue un orden incremental: primero la infraestructura (esquemas, tipos, hooks), luego los componentes visuales de menor a mayor complejidad, después el ensamblaje de la página y finalmente la configuración de NextAuth.js v5. Cada tarea termina integrada en el componente padre correspondiente.

---

## Tasks

- [ ] 1. Instalar dependencias y preparar estructura de archivos
  - Instalar `fast-check` como devDependency: `npm install --save-dev fast-check`
  - Instalar `next-auth` v5 (Auth.js): `npm install next-auth@beta`
  - Instalar `react-hook-form`: `npm install react-hook-form @hookform/resolvers`
  - Crear las carpetas vacías necesarias para los módulos de la feature:
    - `frontend/app/welcome/components/`
    - `frontend/app/welcome/hooks/`
    - `frontend/app/welcome/schemas/`
    - `frontend/app/welcome/__tests__/`
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 2. Esquema Zod y tipos de datos
  - [ ] 2.1 Crear `frontend/app/welcome/schemas/registration.ts`
    - Exportar `registrationSchema` con los campos `fullName`, `email`, `password`, `confirmPassword`
    - Incluir la función `sanitize` que elimina caracteres de control (U+0000–U+001F)
    - Aplicar `.transform(sanitize).pipe(...)` en `fullName` y `email`
    - Exportar `loginSchema` y los tipos `RegistrationFormData`, `LoginFormData`
    - _Requirements: 4.3, 4.4, 4.5, 8.1, 8.2, 8.3_

  - [ ]* 2.2 Escribir property tests para el esquema Zod
    - **Property 3: Validación de email — aceptación universal** — cualquier email RFC válido debe pasar sin error en el campo `email`
    - **Property 4: Validación de contraseña — rechazo de strings inválidos** — cualquier contraseña que viole al menos una regla debe ser rechazada con mensaje descriptivo
    - **Property 5: Igualdad de contraseñas** — el refine de `confirmPassword` pasa si y solo si `p1 === p2`
    - **Property 8: Sanitización de caracteres de control** — `sanitize(input)` nunca produce un string con code point < U+0020
    - **Property 9: Invariante de truncado** — `fullName` truncado a 120 chars y `email` a 254 chars cumplen el invariante de longitud
    - Archivo: `frontend/app/welcome/__tests__/registration.schema.test.ts`
    - Configurar fast-check con `{ numRuns: 100, verbose: true }`
    - _Requirements: 4.3, 4.4, 4.5, 8.1, 8.2_

- [ ] 3. Custom hook `useScrollVideo`
  - [ ] 3.1 Crear `frontend/app/welcome/hooks/useScrollVideo.ts`
    - Implementar la función `scrollToTime(p, d)` pura que retorna `p * d`
    - Implementar `lerp(current, target, alpha)` con tipo `(a: number, b: number, α: number) => number`
    - Implementar el hook con la firma `UseScrollVideoOptions → UseScrollVideoReturn`
    - Loop `requestAnimationFrame` que aplica `lerp(video.currentTime, targetTime, lerpAlpha)` a 60fps
    - `IntersectionObserver` sobre `sectionRef` para pausar/reanudar el loop rAF
    - Handler `onScroll` que calcula `rawProgress = clamp((scrollY - sectionTop) / sectionHeight, 0, 1)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.4, 6.5, 9.2_

  - [ ]* 3.2 Escribir property tests para `useScrollVideo`
    - **Property 1: Mapeo de scroll a currentTime** — `scrollToTime(p, d) === p * d` para cualquier `p ∈ [0,1]` y `d > 0`
    - **Property 2: Invariante de lerp** — `lerp(current, target, α)` retorna un valor en `(current, target)` cuando `current !== target`, y converge hacia `target` en aplicaciones sucesivas
    - Archivo: `frontend/app/welcome/__tests__/useScrollVideo.test.ts`
    - Exportar `scrollToTime` y `lerp` como funciones puras separadas (no solo internas al hook) para poder testearlas directamente
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Checkpoint — Verificar lógica pura antes de componentes visuales
  - Asegurarse de que todos los tests de esquemas y del hook pasen. Consultar al usuario si hay dudas sobre el comportamiento esperado.

- [ ] 5. Componentes visuales base (sin estado)
  - [ ] 5.1 Crear `frontend/app/welcome/components/GradientOverlay.tsx`
    - Componente sin props, `position: absolute`, `inset-0`, `z-10`
    - Degradado vertical: `transparent 0%` → `rgba(15, 17, 23, 0.4) 40%` → `rgba(0, 0, 0, 0.85) 100%`
    - Degradado horizontal: `rgba(15, 17, 23, 0.4)` en bordes → `transparent` en el centro
    - Usar `pointer-events: none` para no bloquear interacción con capas superiores
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ] 5.2 Crear `frontend/app/welcome/components/VideoBackground.tsx`
    - Props: `VideoBackgroundProps` con `webmSrc`, `mp4Src`, `posterSrc`, `videoRef`, `className?`
    - Atributos fijos: `autoPlay muted loop playsInline preload="none"`
    - Primer `<source>` con `type="video/webm"`, segundo con `type="video/mp4"`
    - Detectar `prefers-reduced-motion: reduce` con `useMediaQuery`; si activo, renderizar `<Image>` poster con `priority` en lugar del `<video>`
    - Aplicar `will-change: transform` al contenedor wrapper (no al `<video>`)
    - Aplicar `object-fit: cover`, `object-position: center center`, `w-full h-full`
    - Handler `onError` que activa fallback de imagen poster de alta resolución
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.4, 6.6_

  - [ ]* 5.3 Escribir tests de ejemplo para `VideoBackground`
    - Verificar presencia de atributos `autoplay`, `muted`, `loop`, `playsInline`, `preload="none"` en el DOM
    - Verificar que el primer `<source>` sea WebM y el segundo MP4
    - Verificar que con `prefers-reduced-motion: reduce`, se renderice `<img>` (poster) y no `<video>`
    - Verificar que el handler `onError` activa el fallback poster
    - Archivo: `frontend/app/welcome/__tests__/VideoBackground.test.tsx`
    - _Requirements: 1.1, 1.4, 1.5, 6.1_

  - [ ] 5.4 Crear `frontend/app/welcome/components/KycNotice.tsx`
    - Componente sin props con contenido estático
    - Fondo `rgba(0, 0, 245, 0.08)`, borde `rgba(0, 0, 245, 0.3)`, border-radius `radius-sm` (12px)
    - Ícono de shield (Lucide `ShieldCheck`) + texto "Necesitarás verificar tu identidad (KYC) para adquirir tokens"
    - Tipografía Body Small (12px, weight 500) en `#0000F5`
    - _Requirements: 4.2_

  - [ ] 5.5 Crear `frontend/app/welcome/components/HeroContent.tsx`
    - Props: `HeroContentProps` con `scrollProgress: number`
    - Opacidad del bloque calculada como `1 - scrollProgress * 1.5` (desaparece al scrollear)
    - Headline, subheadline, lista de features con íconos Lucide
    - Badge "Powered by Base Network" con estilos Pending badge del design system
    - `hidden md:flex` (oculto en mobile, visible en desktop)
    - _Requirements: 7.1_

- [ ] 6. Componentes de autenticación
  - [ ] 6.1 Crear `frontend/app/welcome/components/WalletAuthButton.tsx`
    - Usar `useConnectModal` de `@rainbow-me/rainbowkit` (no `<ConnectButton>`)
    - Props: `WalletAuthButtonProps` con `onConnected?: (address: string) => void`
    - Suscribirse a `useAccount` de wagmi; cuando `isConnected` cambia a `true`, llamar `onConnected(address)`
    - Estilo: botón secundario glassmorphic Nova (fondo `rgba(255,255,255,0.08)`, borde `rgba(255,255,255,0.2)`, border-radius 18px, height 48px)
    - Ícono de wallet + texto "Conectar Wallet"
    - Badge "Red no soportada" cuando `chain` no es soportada (`useNetwork`)
    - Área táctil mínima 44×44px
    - _Requirements: 7.5_

  - [ ] 6.2 Crear `frontend/app/auth.ts` y `frontend/app/api/auth/[...nextauth]/route.ts`
    - `auth.ts` en la raíz del directorio `frontend/`: configuración NextAuth.js v5 con Google Provider
    - Callback `session` que expone `token.sub` como `session.user.id`
    - `pages.signIn: '/'`, `pages.newUser: '/dashboard'`
    - `route.ts`: exportar `{ GET, POST }` desde `handlers` del `auth.ts`
    - Variables de entorno requeridas: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
    - _Requirements: 9.4_

  - [ ] 6.3 Crear `frontend/app/welcome/components/GoogleAuthButton.tsx`
    - Props: `GoogleAuthButtonProps` con `onSuccess?: () => void`
    - Llamar `signIn('google', { callbackUrl: '/dashboard' })` de `next-auth/react`
    - Manejo de error con toast: "No se pudo conectar con Google. Intenta de nuevo."
    - Estilo: botón secundario glassmorphic con logo SVG de Google + texto "Continuar con Google"
    - Área táctil mínima 44×44px
    - _Requirements: 7.5_

- [ ] 7. `OnboardingAnimator` y `RegistrationForm`
  - [ ] 7.1 Crear `frontend/app/welcome/components/OnboardingAnimator.tsx`
    - Props: `OnboardingAnimatorProps` con `children: React.ReactNode`, `reducedMotion: boolean`
    - Leer `sessionStorage.getItem('onboarding-animated')` al montar; si existe, mostrar hijos visibles sin animar
    - Al animarse por primera vez, escribir `sessionStorage.setItem('onboarding-animated', '1')`
    - Variantes Framer Motion exactas del diseño: `containerVariants` (stagger 80ms), `itemVariants` (fadeInUp 300ms), `kycVariants` (scaleY 400ms delay 400ms)
    - Si `reducedMotion === true`, saltarse animaciones y renderizar hijos directamente visibles
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Escribir tests para `OnboardingAnimator`
    - **Property 7: Idempotencia de la animación de onboarding** — para N ≥ 1 eventos de focus en la misma sesión, `sessionStorage.setItem` es llamado exactamente una vez
    - Test de ejemplo: con `prefers-reduced-motion: reduce`, los hijos son visibles sin animación
    - Test de ejemplo: segunda instancia en misma sesión (sessionStorage ya tiene la clave) no anima
    - Archivo: `frontend/app/welcome/__tests__/OnboardingAnimator.test.tsx`
    - _Requirements: 5.4, 5.5_

  - [ ] 7.3 Crear `frontend/app/welcome/components/RegistrationForm.tsx`
    - Props: `RegistrationFormProps` con `onSuccess`, `onSwitchToLogin`
    - Usar `react-hook-form` con `zodResolver(registrationSchema)`
    - Campos con atributos `autocomplete` correctos: `fullName` → `name`, `email` → `email`, `password` → `new-password`, `confirmPassword` → `new-password`
    - Toggle show/hide en campos `password` y `confirmPassword` (alterna `type="password"` / `type="text"`, ícono Lucide `Eye` / `EyeOff`)
    - Mensajes de error inline debajo de cada campo en `< 100ms` (validación síncrona Zod en `onSubmit`)
    - Color de error `#DC2626` con ícono `AlertCircle`
    - Al submit válido: deshabilitar botón, mostrar spinner, proteger contra envíos duplicados con `isSubmitting`
    - Foco automático al primer campo con error (`setFocus` de react-hook-form)
    - Wrappear el contenido con `<OnboardingAnimator>` pasando `reducedMotion`
    - Incluir `<KycNotice>` wrapeado en el `motion.div` con `kycVariants`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 8.4, 8.5_

  - [ ]* 7.4 Escribir tests de ejemplo y property tests para `RegistrationForm`
    - **Property 6: Idempotencia de envío de formulario** — N ≥ 2 clics mientras `isSubmitting` es true invocan el handler de API exactamente una vez
    - Test de ejemplo: todos los campos y atributos `autocomplete` presentes en el DOM
    - Test de ejemplo: toggle de visibilidad de contraseña (type password → text)
    - Test de ejemplo: estado de carga tras submit válido (botón disabled, spinner visible)
    - Test de ejemplo: `KycNotice` visible en modo register
    - Test de ejemplo: mensajes de error inline aparecen tras submit inválido
    - Archivo: `frontend/app/welcome/__tests__/RegistrationForm.test.tsx`
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 4.8, 8.4, 8.5_

- [ ] 8. Checkpoint — Verificar componentes individuales
  - Asegurarse de que todos los tests pasan hasta este punto. Consultar al usuario si hay dudas sobre validación, animaciones o autenticación.

- [ ] 9. `RegistrationPanel` y ensamblaje de la página
  - [ ] 9.1 Crear `frontend/app/welcome/components/RegistrationPanel.tsx`
    - Props: `RegistrationPanelProps` con `mode: 'register' | 'login'`, `onModeChange`
    - Tab selector accesible (`role="tablist"`, `aria-selected`) con tabs "Crear cuenta" | "Iniciar sesión"
    - Renderizar `<RegistrationForm>` o formulario de login según `mode`
    - Divider "o continúa con" con líneas decorativas
    - Renderizar `<WalletAuthButton>` y `<GoogleAuthButton>`
    - Renderizar `<KycNotice>` únicamente cuando `mode === 'register'`
    - Estilos Glass Card del design system: `rgba(255,255,255,0.08)` + `backdrop-filter: blur(10px)`, borde `rgba(255,255,255,0.47)`, shadow Premium, border-radius `radius-xl` (32px)
    - `w-full md:w-[420px]` con padding 24px
    - _Requirements: 4.1, 4.2, 7.2, 7.3_

  - [ ] 9.2 Crear `frontend/app/page.tsx` (WelcomeScreen — reemplaza el existente)
    - Componente servidor con `'use client'` solo donde sea necesario (leer sesión con `auth()` de NextAuth en el servidor; redirigir a `/dashboard` si ya autenticado)
    - `useRef` para `videoRef` y `sectionRef`
    - Usar `useScrollVideo({ videoRef, sectionRef })` para obtener `scrollProgress`
    - Detectar `prefers-reduced-motion` con `useReducedMotion()` de Framer Motion
    - Layout: `relative h-screen overflow-hidden` con `<VideoBackground>` en `z-0`, `<GradientOverlay>` en `z-10`
    - Layout desktop (md+): grid 2 columnas — `<HeroContent>` izquierda (60%), `<RegistrationPanel>` derecha (40%) en `z-30`
    - Layout mobile: `<RegistrationPanel>` centrado, sobre el video, con overlay semi-transparente
    - Estado `mode` ('register' | 'login') manejado con `useState`
    - URL del video NYC de Pexels como `webmSrc` y `mp4Src` (constante pública)
    - _Requirements: 1.1, 1.2, 3.1, 7.1, 7.6, 9.4_

- [ ] 10. Middleware de protección de rutas
  - Crear `frontend/middleware.ts`
  - Usar el helper `auth` de NextAuth v5 como middleware
  - Rutas protegidas (requieren sesión): `/dashboard`, `/portfolio`, `/marketplace`, `/admin`
  - La ruta `/` es pública (no protegida)
  - Exportar `config.matcher` para excluir archivos estáticos (`/_next/`, `/api/auth/`)
  - _Requirements: 9.4_

- [ ] 11. Checkpoint final — Integración completa
  - Verificar que `npm run build` (Next.js) no produce errores de tipos
  - Verificar que `npx vitest --run` ejecuta todos los tests sin fallos
  - Verificar que la ruta `/` renderiza la WelcomeScreen correctamente
  - Verificar que al autenticarse con wallet o Google se redirige a `/dashboard`
  - Consultar al usuario si hay dudas antes de considerar la feature completa.

---

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad completa
- `fast-check` está configurado con `numRuns: 100` para cobertura estadística suficiente
- Las funciones puras `scrollToTime` y `lerp` deben exportarse desde `useScrollVideo.ts` además de usarse internamente
- NextAuth.js v5 es `next-auth@beta` — verificar compatibilidad con la versión de Next.js (16.1.6)
- El `auth.ts` va en la raíz de `frontend/` (mismo nivel que `package.json`), no dentro de `app/`
- Las variables de entorno de NextAuth deben añadirse a `frontend/.env.local`
- `react-hook-form` y `@hookform/resolvers` no están en `package.json` — deben instalarse en la tarea 1
- Property 10 (área táctil mínima 44×44px) se valida mediante tests de ejemplo/integración con Testing Library, no como property test de fast-check, dado que requiere métricas del DOM renderizado

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "5.1", "5.2", "5.4"] },
    { "id": 2, "tasks": ["5.3", "5.5", "6.1", "6.2"] },
    { "id": 3, "tasks": ["6.3", "7.1"] },
    { "id": 4, "tasks": ["7.2", "7.3"] },
    { "id": 5, "tasks": ["7.4", "9.1"] },
    { "id": 6, "tasks": ["9.2"] }
  ]
}
```
