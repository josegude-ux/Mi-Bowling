# MI BOWLING · LAB A3 · Correos, pestañas y Safari/iPhone PWA

**Orden de continuidad:** BOWLING-AUTH-CALLBACK-SAFARI-PWA-LAB-A3-20261108  
**Base recuperada:** PR #13, checkpoint A2 `ba5a5d54df92058cd0eaca538bf4eb903c016012`.  
**Rama:** `feature/auth-correo-lab-20261108`.  
**Estado:** implementación y pruebas solo con identidades, links, servidores y sesiones ficticios. **No se han creado servicios, proyectos, usuarios, correos reales ni publicaciones.**  
**Ramas protegidas:** `main` y PR #1/#8/#10/#12 intactas; PR #13 en borrador.

## Problema de interoperabilidad

En A2 el flujo PKCE de Supabase Auth guardaba el *code verifier* en `sessionStorage` de la pestaña inicial. Un enlace de correo puede abrirse en otra pestaña de Safari o fuera del contenedor de una PWA instalada en iOS. **No es correcto asumir** que el nuevo contexto pueda acceder al estado PKCE del anterior; transferir tokens entre contextos por URL, contraseña local o JavaScript global sería inseguro.

### Resolución de arquitectura A3

No se intenta copiar ni sincronizar el verificador PKCE. Se definen **dos plantillas de correo personalizadas**, aún no aplicadas a ningún proveedor:

- Confirmación de cuenta: `{{ .SiteURL }}/auth/callback.html#token_hash={{ .TokenHash }}&type=email`
- Recuperación de contraseña: `{{ .SiteURL }}/auth/callback.html#token_hash={{ .TokenHash }}&type=recovery`

`token_hash` es una credencial de **uso único validada por el servidor** con `auth.verifyOtp({ token_hash, type })`. Este mecanismo utiliza el navegador/contexto que recibe el enlace y **no necesita** el verificador PKCE anterior. La página de retorno tiene un cliente Auth con almacenamiento en memoria, totalmente separado de la PWA; el token no se envía por HTTP al alojamiento al estar en el fragmento (`#`). El contexto receptor nunca tiene acceso al almacenamiento de puntuaciones ni a la sesión del navegador inicial.

**No equivale a una sesión compartida entre Safari y la PWA**: al confirmar, el cliente cierra la sesión temporal y pide entrar de nuevo por correo+contraseña en MI BOWLING. Al recuperar, el cliente permite cambiar la contraseña en la ventana receptora y cierra la sesión; después el usuario entra de nuevo en la PWA. No se hace un deep link con tokens de identidad.

## Seguridad de la página de retorno

1. Página estática `auth/callback.html`, sin script externo ni SDK incluido, con `Referrer-Policy: no-referrer`, CSP restrictiva, sin `app.js`, sin usuarios reales y con acceso bloqueado si no hay proveedor autorizado.
2. Antes de cualquier operación asíncrona, `auth-email-callback.js` elimina token y parámetros de la URL usando `history.replaceState`. Solo se aceptan dos parámetros en fragmento y los tipos `email` o `recovery`, con hash SHA-256 de 64 caracteres hexadecimales. Se rechazan `?code`, `?next`, `#access_token`, duplicados y redirecciones arbitrarias.
3. Para evitar escáneres que visitan enlaces automáticamente, **NO se consume el token al cargar**. La validación exige un clic manual en «Verificar enlace».
4. Confirmación de cuenta: `verifyOtp` + `getUser` remoto y correo confirmado; se cierra la sesión temporal sin abrir puntuaciones.
5. Recuperación: `verifyOtp` de tipo recovery + `getUser` remoto, sesión temporal solo en memoria; nueva contraseña (12+ caracteres) y confirmación; antes de `updateUser` se vuelve a consultar la identidad y se valida el mismo UUID. Tiempo máximo local 10 minutos desde validación. Tras cambiar se fuerza cierre; no se abre la aplicación.
6. Cualquier fallo, URL inválida, token reutilizado o caducado, falta de backend, cambio de propietario o cierre bloquea el formulario de acceso a datos. No hay reintentos automáticos con el mismo token.
7. La respuesta de validación nunca se pasa a PR #8, #10 ni a `app.js`; Liga Nacional y estadísticas personales siguen completamente aisladas de esta página.

## Archivos creados / actualizados

| Archivo | Función |
|---|---|
| `auth-supabase-adapter.js` | Añade `verifyLinkToken` con `verifyOtp` para email/recovery y requiere sesión temporal recién emitida |
| `auth-email-callback.js` | Parseo estricto, limpieza de URL, clic explícito, validación remota, confirmación, recuperación, error, cancelación |
| `auth-link-boot.js` | Cliente callback con almacenamiento **en memoria**, sin compartir PKCE o sesión con la PWA |
| `auth/callback.html` | Página de retorno independiente, CSP, referrer no-referrer, sin marcador |
| `auth/callback-entry.js` | Arranque de la página cuando hay autorización, sin scripts inline |
| `docs/email-templates/LAB_A3_confirm_signup_REVIEW_ONLY.html` | Plantilla de confirmación, no instalada |
| `docs/email-templates/LAB_A3_reset_password_REVIEW_ONLY.html` | Plantilla de recuperación, no instalada |
| `auth-lab.css` | Formulario táctil y adaptable para el callback |
| `tests/auth-callback.test.cjs` | Pruebas de URL, tokens, aislamiento, expiración, replay y propiedad, con dos contextos simulados |
| `tests/auth-callback-browser.html`, `tests/auth-callback-browser.test.cjs` | Chromium con tres resoluciones y callback real bloqueado sin backend, más mock de confirmación y recuperación |
| `.github/workflows/auth-correo-lab.yml` | Añade pruebas y capturas de 390/768/1440 px |

## Criterios superados

- [x] Confirmación de cuenta sin necesidad de `code_verifier` original.
- [x] Recuperación sin acceso al almacenamiento original de la PWA, con propietario comprobado de nuevo.
- [x] URL saneada antes de consumir token; sin token en la dirección tras carga.
- [x] Clic explícito; visitar el enlace no consume credenciales.
- [x] Token reutilizado, expirado o manipulado bloqueado; no hay redirección abierta.
- [x] Sin mezcla entre cuentas personales ni acceso a partidas durante el callback.
- [x] Contraseña recuperada exige iniciar sesión otra vez.
- [x] Chromium 390×844, 768×1024, 1440×900: formularios y retorno simulados, responsive, sin desbordamiento.
- [x] Solo mocks: no proyecto Supabase, SQL, emails, cambios en datos o producción.

## Pendiente real: no confundir simulación con Safari físico

- [ ] Confirmar con correos reales de una cuenta ficticia **en proyecto LAB autorizado**, usando las plantillas personalizadas. Su efectividad depende de la configuración real de Auth, SMTP, Site URL y URL allowlist.
- [ ] Probar enlaces desde Apple Mail y Gmail en iPhone físico con la PWA instalada, tanto abrir en Safari como en el contexto de la PWA; en este LAB solo hemos simulado la separación del almacenamiento.
- [ ] Probar prefetch, phishing, expiración, doble clic y correo redirigido por cliente en un servicio real, manteniendo el clic explícito.
- [ ] La configuración `auth-boot.js` de A2 aún contiene un cliente PKCE para el login tradicional y el contrato de futuros correos. **Las plantillas personalizadas A3 son obligatorias** para garantizar un retorno independiente entre pestañas. No mezclar por defecto el código de `?code=` de PKCE con el callback de token_hash.
- [ ] Antes de usar las plantillas, confirmar que `{{ .SiteURL }}` es la dirección HTTPS real del LAB (sin barra final duplicada) y que resuelve `/auth/callback.html` bajo la ruta de la aplicación.
- [ ] Revisar cabeceras CSP/referrer desde el hosting real, cargar el SDK oficial con versión fija y hash de dependencias, RLS de documentos y privacidad de sesión; sin ello el callback sigue bloqueado.
- [ ] Validar cambios más recientes de main y preparar respaldos JSON/PDF antiguos para cualquier despliegue futuro, con autorización expresa.

## Documentación oficial verificada (8 noviembre 2026)

- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)

**Conclusión:** eliminada en el diseño y probada con mocks la dependencia PKCE entre contextos, pero **NO certificada** en Safari/iPhone físico ni con un servicio real. No fusionar ni publicar.
