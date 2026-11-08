# MI BOWLING · Acceso por correo · LAB A2

Orden: BOWLING-AUTH-CORREO-LAB-A2-20261108
Base recuperada: PR #13, checkpoint A1 1c979156cab2f4faab99171e083d1a91c24f0d5c.
Rama: feature/auth-correo-lab-20261108.
Estado: código con dobles ficticios, sin usuarios, envíos reales ni servicios desplegados.
Protección: main y PR #1, #8, #10 y #12 sin cambios ni fusiones.

## Implementación preparada

- auth-supabase-adapter.js: login con contraseña y sesión emitida; usuario validado mediante getUser() remoto; alta pendiente de confirmación; resend signup; recuperación y actualización de contraseña; cierre de sesión.
- auth-lab.js: pantallas login, crear cuenta, confirmar/reenvío, recuperar, nueva contraseña. Estados desacoplados del marcador. Nunca abre partidas hasta verificar sesión remota y documentos privados.
- auth-boot.js: configuración exterior, HTTPS, clave publicable, URLs de regreso exactas del mismo origen, SDK oficial inyectado y flujo PKCE. En A2 el registro real está deshabilitado (allowSignUp:false).
- auth-private-repository.js: documentos personal y league separados por UUID, filtros de propietario y revisión optimista. Liga Nacional no se suma a estadísticas personales de otros jugadores.
- index.html y sw.js: solo recursos de acceso; app.js antiguo no se carga desde la nueva pantalla.
- docs/sql/BOWLING_AUTH_RLS_A1_REVIEW_ONLY.sql: propuesta SQL con RLS y permisos de propietario, no ejecutada.

## Reglas de cuenta y protección

1. Registro con email y contraseña de al menos 12 caracteres. El proveedor debe devolver un alta SIN sesión; si devuelve sesión prematura se cierra y bloquea hasta exigir confirmación.
2. Confirmación pendiente con reenvío de mensaje, enfriamiento local de 60 segundos y límites de frecuencia obligatorios en el servidor. Nunca se identifica automáticamente una cuenta solo por recibir el evento SIGNED_IN.
3. Login: signInWithPassword debe entregar una sesión válida, seguido de getUser() al servidor para verificar email confirmado y UUID; se consultan únicamente documentos RLS del mismo propietario.
4. Recuperación: resetPasswordForEmail con redirección aprobada; evento PASSWORD_RECOVERY muestra formulario específico. updateUser exige otra verificación remota. Después se cierra la sesión y se requiere nuevo inicio.
5. Cancelación y cierre: invalidación de la sesión y respuestas tardías, sin mostrar puntuaciones de otra cuenta. Sin servidor, formulario bloqueado.
6. Usuarios nuevos: cero partidas, cero bolas y estadísticas vacías; Liga Nacional en documento independiente de personal.

## Preparación de conexión real (NO EJECUTAR EN A2)

- Obtener autorización para proyecto Supabase aislado con región EU, identidad Email/Password, Confirm email habilitado, Site URL, redirecciones explícitas y SMTP.
- Fijar y auditar versión exacta de @supabase/supabase-js, guardar package-lock y generar bundle estático del SDK oficial (no usar CDN sin versión).
- Inyectar fuera del repositorio URL HTTPS, clave PUBLICABLE de frontend (sb_publishable_...), rutas exactas de confirmación y recuperación. Nunca usar service_role ni sb_secret.
- Validar experimentalmente el callback PKCE. El borrador utiliza sessionStorage para la sesión y el verificador: **un enlace de correo que abre otra pestaña o una PWA de iPhone puede perder el verificador**, por lo que ESTA DECISIÓN ES UN BLOQUEO hasta diseñar y probar la solución cross-tab.
- Aplicar RLS exclusivamente en entorno autorizado y ejecutar pruebas de SELECT, INSERT y UPDATE con propietarios A/B/C más usuario anónimo.
- Solo entonces conectar persistencia de partidas y bolas a documentos privados; diseñar copia y restauración de JSON antiguos y PDF IndexedDB; no asignar automáticamente partidas previas a cuentas nuevas.
- Validar Safari/iPhone físico, sesión expirada, recuperación, cambio de cuenta y navegación offline. Sin confirmación de estas pruebas, no abrir marcador ni publicar.

## Pruebas

- tests/auth-lab.test.cjs: autenticación simulada, verificación por servidor, fallos, aislamiento A/B, cierre, contrato RLS.
- tests/auth-email-flows.test.cjs: email pendiente, reenvío, rechazo de alta sin confirmación obligatoria, recuperación y cambio de contraseña, redirecciones y arranque PKCE simulado.
- tests/auth-browser-mock.html y tests/auth-browser-email.html: pruebas Chromium de formularios, estados y usuarios falsos.
- tests/auth-browser-smoke.cjs: anchuras 390, 768 y 1440 px, denegación cuando no hay proveedor y ninguna partida cargada.
- GitHub Actions: .github/workflows/auth-correo-lab.yml.
- Estas pruebas NO validan emails reales, una base Supabase real ni políticas RLS ejecutadas. Son pruebas de código con proveedores ficticios.

## Documentación oficial consultada

https://supabase.com/docs/guides/auth/passwords
https://supabase.com/docs/reference/javascript/auth-resend
https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
https://supabase.com/docs/reference/javascript/auth-getuser
https://supabase.com/docs/guides/auth/sessions/pkce-flow
https://supabase.com/docs/guides/auth/redirect-urls

Checkpoint final: se registrará el SHA verificado del laboratorio A2. No fusionar ni desplegar sin autorización.
