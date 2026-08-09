# Requirements Document

## Introduction

La **Welcome Screen** de Cronium es la página de entrada pública de la plataforma de tokenización de activos del mundo real (RWA) en Web3/FinTech. Su objetivo es convertir visitantes en usuarios registrados mediante una experiencia visual premium: fondo de video urbano sincronizado con el scroll, composición estilo Netflix con capas de degradado, un módulo de registro nativo con validación en cliente, y animaciones de onboarding que captan la atención al inicio del flujo. La pantalla debe ser completamente responsiva, cumplir con los estándares de rendimiento críticos para conversión y alinearse con el design system Nova (glassmorphism, electric blue `#0000F5`, paleta oscura con acentos dorados existentes en el proyecto).

---

## Glossary

- **Welcome_Screen**: Página pública de bienvenida/landing ubicada en la ruta raíz `/` de la aplicación Next.js 14.
- **Video_Background**: Elemento `<video>` con secuencia de ciudad estilo Nueva York, que actúa como capa de fondo visual de pantalla completa.
- **Scroll_Controller**: Módulo que calcula la posición de scroll del usuario y la traduce en un progreso de reproducción del video (`currentTime`).
- **Gradient_Overlay**: Capa CSS posicionada sobre el video con degradados negros/oscuros para garantizar legibilidad de los elementos superpuestos.
- **Registration_Form**: Formulario nativo de la vista con campos de email, contraseña y nombre completo para registrar nuevos usuarios en la plataforma Cronium.
- **Form_Validator**: Módulo de validación en cliente (Zod) que verifica los datos del formulario antes de enviarlos al servidor.
- **Onboarding_Animator**: Secuencia de animación (Framer Motion) que se activa al inicio del proceso de registro para captar la atención del usuario.
- **KYC_Notice**: Componente de aviso informativo que indica al usuario que deberá completar un proceso de verificación de identidad (KYC) para adquirir tokens.
- **Performance_Optimizer**: Conjunto de técnicas aplicadas al video y los assets para garantizar tiempos de carga óptimos.
- **Nova_Design_System**: Sistema de diseño del proyecto con glassmorphism, electric blue `#0000F5`, paleta oscura `#0F1117`/`#141A26` y acentos dorados `#D4AF37`.

---

## Requirements

### Requirement 1: Fondo de Video Inmersivo

**User Story:** Como visitante de Cronium, quiero ver un fondo de video urbano estilo Nueva York moderno y minimalista, para que la primera impresión de la plataforma transmita sofisticación y confianza financiera.

#### Acceptance Criteria

1. THE `Video_Background` SHALL reproducirse en modo `autoplay`, `muted`, `loop` y `playsInline` al cargar la página.
2. THE `Video_Background` SHALL ocupar el 100% del ancho y alto del viewport (`100vw × 100vh`) sin barras de desplazamiento visibles.
3. THE `Video_Background` SHALL aplicar `object-fit: cover` para mantener la proporción del video sin distorsión en cualquier resolución.
4. WHEN el dispositivo del usuario tiene `prefers-reduced-motion: reduce`, THE `Video_Background` SHALL mostrar un fotograma estático (poster) en lugar de reproducir el video.
5. IF el navegador no soporta el elemento `<video>`, THEN THE `Welcome_Screen` SHALL mostrar una imagen de fondo de alta resolución como fallback.

---

### Requirement 2: Animación Sincronizada con Scroll (Scroll-Bound Animation)

**User Story:** Como visitante, quiero que el video de fondo avance conforme hago scroll, para experimentar una navegación fluida y cinematográfica al estilo de los sitios premium de tecnología.

#### Acceptance Criteria

1. WHEN el usuario hace scroll hacia abajo, THE `Scroll_Controller` SHALL avanzar el `currentTime` del `Video_Background` de forma proporcional a la posición de scroll dentro de la sección hero.
2. WHEN el usuario hace scroll hacia arriba, THE `Scroll_Controller` SHALL retroceder el `currentTime` del `Video_Background` de forma proporcional.
3. THE `Scroll_Controller` SHALL mapear el rango de scroll de `0%` a `100%` de la sección hero a la duración completa del video, de `0s` a `videoDuration` segundos.
4. THE `Scroll_Controller` SHALL aplicar una función de suavizado (`ease-out` o `lerp`) para que la transición de frames sea fluida y sin saltos bruscos.
5. WHILE el usuario hace scroll dentro de la sección hero, THE `Scroll_Controller` SHALL actualizar el `currentTime` a una frecuencia mínima de 60fps usando `requestAnimationFrame`.
6. WHERE el dispositivo del usuario es móvil con soporte táctil, THE `Scroll_Controller` SHALL responder al evento de scroll táctil con la misma sincronización.

---

### Requirement 3: Composición de Capas y Degradados (Netflix-Style)

**User Story:** Como visitante, quiero que el texto y los controles sean completamente legibles sobre el video de fondo, para poder entender la propuesta de valor de Cronium sin esfuerzo visual.

#### Acceptance Criteria

1. THE `Gradient_Overlay` SHALL posicionarse sobre el `Video_Background` usando `position: absolute` con `z-index` superior al video e inferior al contenido interactivo.
2. THE `Gradient_Overlay` SHALL aplicar un degradado vertical desde `transparent` en la parte superior hasta `rgba(0, 0, 0, 0.85)` en la parte inferior, cubriendo al menos el 60% de la altura del viewport desde la base.
3. THE `Gradient_Overlay` SHALL aplicar un degradado horizontal sutil desde `rgba(15, 17, 23, 0.4)` en los bordes laterales hacia `transparent` en el centro.
4. THE `Welcome_Screen` SHALL asegurar que el contraste de texto superpuesto sobre el video cumpla un ratio mínimo de 4.5:1 (WCAG AA) en las zonas donde aparezcan textos principales.
5. WHERE el modo oscuro del sistema operativo está activo, THE `Gradient_Overlay` SHALL mantener la misma intensidad de oscurecimiento sin modificarse.

---

### Requirement 4: Módulo de Registro con Aviso KYC

**User Story:** Como visitante interesado en Cronium, quiero registrarme directamente desde la pantalla de bienvenida, para iniciar mi acceso a la plataforma de tokenización sin navegar a páginas adicionales.

#### Acceptance Criteria

1. THE `Registration_Form` SHALL incluir los campos: nombre completo (`fullName`), correo electrónico (`email`), contraseña (`password`) y confirmación de contraseña (`confirmPassword`).
2. THE `Registration_Form` SHALL mostrar el `KYC_Notice` como componente informativo visible dentro del formulario, indicando que se requerirá verificación de identidad para adquirir tokens.
3. WHEN el usuario envía el formulario, THE `Form_Validator` SHALL validar que el campo `email` tenga formato RFC 5321 válido antes de procesar el envío.
4. WHEN el usuario envía el formulario, THE `Form_Validator` SHALL validar que el campo `password` tenga un mínimo de 8 caracteres, al menos una letra mayúscula, una letra minúscula y un carácter especial.
5. WHEN el usuario envía el formulario, THE `Form_Validator` SHALL validar que `confirmPassword` sea idéntico a `password`.
6. IF algún campo del formulario falla la validación, THEN THE `Registration_Form` SHALL mostrar un mensaje de error descriptivo adjunto al campo correspondiente en menos de 100ms tras el intento de envío.
7. WHEN todos los campos superan la validación, THE `Registration_Form` SHALL deshabilitar el botón de envío y mostrar un indicador de carga hasta recibir respuesta del servidor.
8. THE `Registration_Form` SHALL implementar protección básica contra envíos duplicados, ignorando clics adicionales mientras una solicitud está en vuelo.

---

### Requirement 5: Animación de Onboarding al Inicio del Registro

**User Story:** Como visitante, quiero ver una animación atractiva cuando comienzo a registrarme, para que el proceso de incorporación se sienta dinámico y memorable desde el primer momento.

#### Acceptance Criteria

1. WHEN el usuario hace foco en el primer campo del `Registration_Form` por primera vez en la sesión, THE `Onboarding_Animator` SHALL activar una secuencia de animación de entrada de los elementos del formulario.
2. THE `Onboarding_Animator` SHALL animar cada campo del formulario con una transición `fadeInUp` (opacidad `0→1` y traslación `Y: 20px→0`) con una duración de 300ms y un `stagger` de 80ms entre campos.
3. THE `Onboarding_Animator` SHALL animar el `KYC_Notice` con un efecto de revelado (`clipPath` o `scaleY`) con una duración de 400ms tras completar la animación de los campos.
4. WHEN la animación de onboarding ha sido activada una vez en la sesión, THE `Onboarding_Animator` SHALL no re-ejecutar la animación de entrada si el usuario cambia de campo dentro del mismo formulario.
5. WHERE el dispositivo del usuario tiene `prefers-reduced-motion: reduce`, THE `Onboarding_Animator` SHALL mostrar todos los campos del formulario directamente visibles sin animación.

---

### Requirement 6: Rendimiento y Optimización de Assets

**User Story:** Como visitante de Cronium, quiero que la pantalla de bienvenida cargue rápidamente, para que el tiempo de carga no sea un obstáculo para completar mi registro.

#### Acceptance Criteria

1. THE `Performance_Optimizer` SHALL servir el `Video_Background` en formato WebM con códec VP9 como fuente primaria, con MP4/H.264 como fallback para compatibilidad.
2. THE `Performance_Optimizer` SHALL implementar lazy loading del video usando el atributo `preload="none"` hasta que el `Scroll_Controller` haya iniciado su primera observación del viewport.
3. WHEN el Largest Contentful Paint (LCP) es medido en condiciones de red 4G simulada, THE `Welcome_Screen` SHALL alcanzar un LCP inferior a 2.5 segundos.
4. THE `Performance_Optimizer` SHALL aplicar `will-change: transform` exclusivamente a los elementos animados durante el scroll para minimizar repaints en el hilo principal.
5. IF el navegador soporta la API `IntersectionObserver`, THEN THE `Scroll_Controller` SHALL usar `IntersectionObserver` para pausar la sincronización del video cuando la sección hero no es visible en el viewport.
6. THE `Performance_Optimizer` SHALL servir todos los assets estáticos (poster, imágenes) con dimensiones optimizadas usando el componente `<Image>` de Next.js con `priority` en el poster del hero.

---

### Requirement 7: Diseño Responsivo

**User Story:** Como visitante desde cualquier dispositivo, quiero que la pantalla de bienvenida sea funcional y visualmente coherente, para tener una experiencia óptima independientemente de si accedo desde desktop o móvil.

#### Acceptance Criteria

1. THE `Welcome_Screen` SHALL implementar un layout de una sola columna en viewports menores a 768px de ancho, y un layout de dos columnas (contenido + formulario) en viewports de 768px o más.
2. THE `Registration_Form` SHALL ocupar el 100% del ancho disponible en viewports móviles (< 768px) con padding horizontal mínimo de 16px.
3. THE `Registration_Form` SHALL tener una anchura máxima de 420px en viewports de escritorio (≥ 1024px).
4. WHILE el viewport tiene menos de 768px de ancho, THE `Video_Background` SHALL mantener `object-position: center center` para enfocar el elemento central del video.
5. THE `Welcome_Screen` SHALL garantizar que todos los elementos interactivos (botones, inputs) tengan un área táctil mínima de 44×44px en dispositivos móviles.
6. WHEN el viewport cambia de orientación en un dispositivo móvil, THE `Welcome_Screen` SHALL recalcular las dimensiones de la sección hero y actualizar el `Scroll_Controller` sin requerir un refresco de página.

---

### Requirement 8: Validación y Seguridad en el Cliente

**User Story:** Como usuario de Cronium, quiero que mis datos sean validados antes de enviarse al servidor, para recibir feedback inmediato sobre errores y reducir el riesgo de envíos maliciosos.

#### Acceptance Criteria

1. THE `Form_Validator` SHALL sanitizar todos los campos de texto eliminando caracteres de control (código Unicode < U+0020, excluido espacio) antes de la validación.
2. THE `Form_Validator` SHALL truncar el campo `fullName` a un máximo de 120 caracteres y el campo `email` a 254 caracteres, acorde al límite RFC 5321, en el momento de la validación.
3. THE `Form_Validator` SHALL implementar el esquema de validación usando la librería Zod (ya disponible en el proyecto) para garantizar consistencia con el resto de validaciones del frontend.
4. THE `Registration_Form` SHALL marcar los campos `email`, `password` y `confirmPassword` con el atributo `autocomplete` apropiado (`email`, `new-password`, `new-password`) para facilitar gestores de contraseñas.
5. THE `Registration_Form` SHALL incluir el campo `password` con `type="password"` y un control de visibilidad (toggle show/hide) para mejorar la usabilidad sin comprometer la seguridad.
6. IF el usuario intenta enviar el formulario con el campo `email` que contiene un dominio de correo desechable conocido, THEN THE `Form_Validator` SHALL mostrar una advertencia, sin bloquear el envío.

---

### Requirement 9: Arquitectura Modular y Mantenibilidad del Código

**User Story:** Como desarrollador del equipo de Cronium, quiero que el código de la welcome screen esté organizado en componentes modulares con comentarios claros, para poder mantener y escalar la funcionalidad sin introducir deuda técnica.

#### Acceptance Criteria

1. THE `Welcome_Screen` SHALL estructurarse en componentes React independientes con responsabilidad única: `VideoBackground`, `ScrollController`, `GradientOverlay`, `RegistrationForm`, `KycNotice`, y `OnboardingAnimator`.
2. THE `Scroll_Controller` SHALL encapsularse como un custom hook de React (`useScrollVideo`) que reciba una referencia al elemento de video y devuelva el progreso normalizado del scroll como estado.
3. THE `Form_Validator` SHALL definirse como un esquema Zod exportado en un archivo separado (`schemas/registration.ts`) reutilizable en el backend cuando se implemente la validación del servidor.
4. THE `Welcome_Screen` SHALL ubicarse en la ruta `app/welcome/page.tsx` siguiendo la convención de App Router de Next.js 14, con un componente `layout.tsx` propio si requiere metadatos distintos al layout global.
5. WHEN se añade un nuevo campo al `Registration_Form`, THE `Form_Validator` SHALL requerir únicamente la modificación del esquema Zod y el componente de campo correspondiente, sin cambios en la lógica de envío.
