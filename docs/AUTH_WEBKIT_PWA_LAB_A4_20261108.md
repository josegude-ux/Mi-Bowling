# MI BOWLING · Autenticación · WebKit, Safari emulado y PWA aislada · LAB A4

**Orden:** BOWLING-AUTH-WEBKIT-PWA-LAB-A4-20261108  
**Fecha:** 8 noviembre 2026  
**PR:** #13 · `feature/auth-correo-lab-20261108` (borrador, no fusionada)  
**Origen verificado:** A3 `7478cb43d1d6f7c61871f86fb100dc69b05f544f` y `docs/AUTH_CALLBACK_SAFARI_PWA_LAB_A3_20261108.md`  
**Código A4 validado:** `baf62f08acb1e8c09b5ac6415ca63fa1ddc67289`  
**Pruebas CI correctas:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42521259980

## Resultado técnico

- [x] **Motor WebKit auténtico en Linux** (Playwright **1.65.0**, navegador WebKit **27.2** descargado por CI). Esto supera la cobertura anterior limitada a Chromium, **pero no equivale a un iPhone ni a la aplicación Safari nativa en un dispositivo físico**.
- [x] Dispositivo **iPhone 13 Pro Max emulado**, Safari/WebKit táctil, disposición apaisada, tablet 768 px y escritorio 1440 px; no hay desbordamiento horizontal, controles con alto mínimo de 44 px, navegación por teclado y etiquetas accesibles.
- [x] Pruebas con **dos contextos WebKit independientes sobre el mismo origen HTTPS local**: uno representa la PWA instalada, otro Safari abierto desde Apple Mail/Gmail. Los datos de sesión y el verificador PKCE ficticios del contexto PWA permanecen intactos; el navegador receptor no los ve.
- [x] Confirmación de correo: **token_hash de un solo uso** validado por un servidor **ficticio** al pulsar «Verificar enlace». Nunca se consume automáticamente al cargar; se limpia el fragmento antes de la verificación y se cierra la sesión temporal sin abrir puntuaciones.
- [x] Recuperación de contraseña: token de recuperación, validación remota ficticia, campos accesibles de nueva contraseña, rechazo de contraseñas diferentes, actualización autorizada y cierre obligatorio de sesión.
- [x] Expiración/reutilización, URL con parámetros manipulados, `access_token` no admitido, duplicados, redirección extraña y ausencia de backend: quedan bloqueados.
- [x] Volver atrás, salir y regresar a la página no reactivan tokens ni formularios de recuperación.
- [x] Cambios de seguridad: `parseAndScrub` falla cerrado si `history.replaceState` no puede limpiar la URL; `pagehide` invalida el estado y limpia datos del formulario; una respuesta asíncrona de verificación de usuario recibida tras cerrar no puede escribir una contraseña.
- [x] Comprobación de que la credencial del enlace **no** se transmite en la ruta de las peticiones HTTPS ni en cabeceras Referer; el alojamiento de la prueba escucha únicamente `127.0.0.1` usando un certificado temporal.
- [x] La página de retorno **nunca carga `app.js`**, no realiza migraciones ni lee cuentas o puntuaciones reales.

## Ejecución reproducible

**CI existente:** `.github/workflows/auth-correo-lab.yml` mantiene los tests Node y Chromium de A1–A3.  
**Nuevo job independiente:** `webkit-ios-lab` en Ubuntu 24.04, Node 22.

Instalación de pruebas (solo en runner CI, sin cambios de dependencias de la aplicación):

```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --package-lock=false --ignore-scripts playwright@1.65.0
./node_modules/.bin/playwright install --with-deps webkit
node tests/auth-webkit-a4.test.cjs
```

El runner genera certificado HTTPS temporal mediante OpenSSL. El servidor de pruebas no se conecta a Supabase. El navegador usa `ignoreHTTPSErrors` **solo en el entorno de loopback con certificado autogenerado**; nunca se introduce esta excepción en la aplicación real.

Pruebas adicionales en `tests/auth-callback.test.cjs`: simulan fallo al limpiar URL y `pagehide` durante promesas pendientes de `verifyOtp` y `getUser`; verifican que no se autoriza acceso ni cambio de contraseña tras abandonar la página.

## Evidencias recuperables

- **Run SUCCESS:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42521259980
- Artefacto **`mi-bowling-auth-webkit-a4`**: capturas `webkitiPhone13ProMax-email.png`, `webkitiPhone13ProMax-password-changed.png`, `webkit-iPhoneLandscape-email.png`, `webkit-tablet-email.png`, `webkit-desktop-email.png`.
- Artefacto **`mi-bowling-auth-callback-lab`**: capturas adicionales Chromium en diferentes tamaños.
- El job `auth-lab` y el job `webkit-ios-lab` concluyeron **success** en el mismo commit A4.

## Limitaciones y riesgos no cerrados

1. **Safari/iPhone físico** (Apple Mail, Gmail y PWA instalada, con distintas rutas de retorno): no se ha probado. WebKit Playwright simula el motor e interacciones, no la instalación PWA nativa de iOS.
2. **Supabase Auth real, entrega de correo y SMTP**: no autorizados ni probados. Las plantillas A3 no están instaladas; la validación `verifyOtp` solo ha usado dobles.
3. La limpieza de sesión desde `pagehide` es **mejor esfuerzo** si se está descargando la página: no debe tratarse como revocación garantizada del lado servidor. La recuperación sigue necesitando controles, expiración y verificación remota reales.
4. Sesiones realmente compartidas/no compartidas entre Safari y PWA, ciclos de actualización, rutas bajo subcarpetas de hosting, modo offline y límites nativos de WebKit: pendiente de piloto autorizado.
5. **Privacidad real de partidas/bolas/PDF y Liga Nacional**: todavía requiere persistencia RLS verificada de servidor. No basta autenticación por email ni perfiles locales.
6. **Compatibilidad con main:** el último `main` comprobado en la fase A4 es `85f09e9082512f111a70d9739964126688fc23cb` (portada VISURA + calendario CP-018), no integrado en PR #13. Mantener intactas PR #1, #8, #10 y #12.

## Reglas de continuidad

- Mantener PR #13 en borrador, sin merge ni despliegue.
- No crear proyectos o cuentas Supabase ni enviar mensajes reales sin autorización expresa.
- Siguiente acción recomendada: probar permisos RLS y almacenamiento de puntuaciones con un backend **ficticio** y después revisar integración visual con `main` actual en rama aislada.
- Con autorización futura, realizar piloto real Safari/iPhone, callbacks HTTPS exactos con plantillas instaladas y usuarios de prueba, antes de abrir cuentas reales.

**Estado:** LAB A4 validado con WebKit/Chromium y datos ficticios; **producción y cuentas reales intactas**.
