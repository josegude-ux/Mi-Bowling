# MI BOWLING · Acceso individual con correo y contraseña · LAB A1

**Orden de continuidad:** BOWLING-AUTH-CORREO-LAB-A1-20261108  
**Situación:** primera integración de autenticación preparada en GitHub; ningún servicio, cuenta o base de datos creados; NO se ha publicado ni fusionado.  
**Base recuperada:** PR #12 en `13cba0211c162b8d36c5200e62a1a782e623f85b`, CI `42514680317` correcto.  
**Rama nueva:** `feature/auth-correo-lab-20261108`.  
**`main` observado al inicio:** `af927b807658e51c5988f36dcb1c1ca4686f105c` (cambios de icono 3D azul, separados).  
**PR #1, PR #8 y PR #10:** conservadas intactas. PR #12, también intacta.

## Cambio autorizado en el LAB

El usuario pide acceso a MI BOWLING **mediante correo y contraseña reales**, no solo selección de perfiles o PIN. Las estadísticas individuales, las bolas y las puntuaciones deberán seguir separadas. Las cuentas nuevas comenzarán sin datos. Liga Nacional seguirá siendo una sección distinta de los resultados individuales.

La identidad debe verificarse en un **servicio de autenticación**. Guardar correos y contraseñas en `localStorage` o usar PIN local como sustituto **no es una autenticación segura**. Para proteger partidas frente a otros usuarios con acceso al mismo dispositivo se requiere **almacenamiento privado, autorización de servidor y/o cifrado**. Las claves de navegador por jugador de la PR #8 separan resultados funcionalmente, pero **NO proporcionan confidencialidad**: no sirven por sí solas para cuentas seguras.

## Componentes desarrollados

| Archivo | Función |
|---|---|
| `auth-supabase-adapter.js` | Adaptador de **Supabase Auth**: login con email/contraseña, registro futuro, validación remota con `getUser()`, recuperación, cambio de contraseña y cierre |
| `auth-private-repository.js` | Acceso a documentos personales y Liga mediante cuenta verificada por servidor, revisión optimista por documento y bloqueo de propietarios incorrectos |
| `auth-lab.js` | Pantalla de identificación blanco/azul estilo VISURA INVENTA, flujo de inicio, alta y recuperación; nunca desbloquea partidas si falla identidad o repositorio |
| `auth-boot.js` | Arranque **fail-closed**: solo acepta proveedor HTTPS, clave pública de cliente y SDK oficial configurado fuera del repositorio. Sin ello, login deshabilitado. En A1 no existe `onReady` de la app. |
| `auth-lab.css` | Diseño responsive, teclados adecuados, objetivos táctiles y mensajes de bloqueo |
| `index.html` | Entrada a pantalla de login LAB, **sin cargar `app.js` ni el selector PIN antiguo** |
| `sw.js` | Recursos cacheables de la pantalla de acceso, sin precargar la aplicación de puntuaciones |
| `docs/sql/BOWLING_AUTH_RLS_A1_REVIEW_ONLY.sql` | Contrato SQL no ejecutado: tabla privada con tipos `personal` y `league`, políticas RLS para `select`, `insert`, `update` restringidas por `auth.uid() = user_id`. Sin permisos anónimos o `DELETE`. |

El código no contiene claves secretas, tokens, contraseñas ni credenciales reales. **No se crea ni se conecta ningún proyecto Supabase durante A1.** No se incluye el SDK ni configuración de proyecto en la rama; hasta disponer de un proyecto permitido, el acceso permanece deshabilitado. Aunque un proveedor fuese configurado, A1 **no carga el marcador ni escribe puntuaciones**, porque aún falta conectar y verificar la persistencia privada de todos los módulos.

## Qué significa la separación de jugadores

- **Cuenta personal:** un UUID de Auth de servidor, no una etiqueta de nombre ni un correo introducido en un campo.
- **`personal`:** partidas, bolas, preferencias y datos de los que se calculan las estadísticas; por defecto vacío y media no calculable. Se mantiene la pantalla visual seleccionada de la PR #10.
- **`league`:** actas y rosters de Liga Nacional, pero **sin mezclar automáticamente** las puntuaciones del equipo con las individuales. Compartir actas entre miembros requiere un diseño de permisos de equipo separado; fuera de esta fase.
- Cada lectura/escritura se autoriza **también en la base de datos** con RLS; el filtro cliente por UUID es defensa adicional, no autorización suficiente.
- El módulo de estadísticas nunca debe combinar documentos personales de dos UUID distintos.
- Los documentos remotos tienen `revision` para detectar cambios concurrentes y evitar sobrescrituras silenciosas. El motor sin conexión todavía no está diseñado para esta etapa.

## Protección de partidas anteriores

**No se borran, importan, asignan ni migran registros reales en A1.** `profiles.js`, los datos originales y las PR existentes permanecen intactos. Una migración posterior deberá:

1. Inventariar y crear copias verificadas de `localStorage` **y** PDF binarios de `IndexedDB`.
2. Vincular al propietario correcto cada partida anterior con consentimiento; no asignar automáticamente datos anteriores a cualquier correo.
3. Guardar en el almacén RLS de la cuenta **después** de confirmar su identidad.
4. Comparar sumas de puntuación, historial, bolas, estadísticas y actas, con datos de prueba primero.
5. Mantener una copia original legible y una vía de reversión; nunca eliminar datos anteriores antes de validación explícita.

## Verificaciones automáticas disponibles

- `tests/auth-lab.test.cjs`: uso del adaptador real de llamadas de SDK mediante **dobles ficticios** (no cuenta real), `getUser()` de servidor, email confirmado, propiedad A/B, contraseña incorrecta, cierre, fallo de red, revisión y contrato SQL.
- `tests/auth-browser-smoke.cjs`: UI en Chromium 390×844, 768×1024 y 1440×900. Con backend no configurado, el botón de acceso está deshabilitado y no se carga `app.js`.
- `tests/auth-browser-mock.html`: inicio/cierre con identidades ficticias A y B, verificación del proveedor simulado, error offline y ausencia de datos cruzados.
- `.github/workflows/auth-correo-lab.yml`: sintaxis y pruebas Node/Chromium.

**Estas pruebas NO prueban contra un proyecto Supabase real ni ejecutan SQL RLS en PostgreSQL.** En A1 esa verificación sería prematura porque el usuario ha prohibido crear cuentas/servicios y desplegar.

## Barreras obligatorias para la siguiente fase

- [ ] Autorizar expresamente un proyecto aislado de autenticación, su ubicación y su coste.
- [ ] Configurar **SDK oficial** con versión fijada, HTTPS, clave de cliente **publicable** (no `service_role` ni clave `sb_secret`) y correos de confirmación/recuperación mediante SMTP autorizado.
- [ ] Revisar y probar el SQL RLS en una base **solo de LAB** con tres identidades ficticias y denegaciones cruzadas en `SELECT`, `INSERT` y `UPDATE`.
- [ ] Integrar persistencia remota completa de puntuaciones, Liga, bolas y PDFs, con reconciliación offline/concurrencia; bloqueo cuando no se pueda garantizar el guardado.
- [ ] Ensayar registro real de cuenta ficticia, confirmación de correo y recuperación de contraseña sin tocar producción.
- [ ] Integrar con `main` actual (icono VISURA 3D, PR #9 y cambios posteriores), PR #8, PR #10 y, en otra fase, PR #1; sin duplicar ni perder funcionalidad.
- [ ] Verificar iPhone real, restauración de copias, conflictos y privacidad; obtener autorización expresa antes de publicar.

### Fuentes técnicas verificadas
- Supabase: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Validación remota de usuario: https://supabase.com/docs/reference/javascript/auth-getuser
- Recuperación: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- Seguridad de datos: https://supabase.com/docs/guides/database/postgres/row-level-security
- Cambios recientes: https://supabase.com/changelog?types=breaking-change

**Estado de A1:** interfaz, adaptadores y contrato de privacidad preparados; sin autenticación real conectada, sin datos migrados, sin base RLS desplegada. El arranque **fallará cerrado hasta que se verifiquen todos los controles anteriores**.
