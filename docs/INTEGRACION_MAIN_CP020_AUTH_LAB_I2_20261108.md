# MI BOWLING · Integración LAB I2 · main CP-020 + autenticación, estadísticas, perfiles y PDF

**Orden:** BOWLING-INTEGRACION-MAIN-CP020-AUTH-LAB-I2-20261108
**Fecha:** 8 noviembre 2026
**Nueva rama:** `feature/integracion-main-auth-cp020-lab-20261108`
**PR independiente:** https://github.com/josegude-ux/Mi-Bowling/pull/18 — **DRAFT**, sin fusionar ni publicar.
**Main recuperado:** `566aafdc05be163baf8c7f82e60433b0f532d748`.
**Origen de los módulos:** PR #13 `0b276a1c162dadff8b089b04dd801a7aa294ded0` (LAB A8, documento `AUTH_STORAGE_BLOB_SAFARI_LAB_A8_20261108.md`) que incluye módulos independientes de PR #8, #10 y #12. PR #1 (3D) NO integrada ni alterada.
**Checkpoint de código funcional I2:** `ea5040649a6d875619436bdbe82a7308fbbda405`.
**CI comprobada:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42532448510 — ambos jobs **SUCCESS** (Node/contratos, WebKit iPhone/tablet y Chromium escritorio).
**Artefacto de capturas:** `mi-bowling-main-cp020-auth-integracion-i2` — https://github.com/josegude-ux/Mi-Bowling/actions/runs/42532448510/artifacts/13637519782.

## Conservación verificada de la versión publicada

La rama de integración nace del último `main` y suma 59 archivos auxiliares recuperados como objetos Git originales de la PR #13, sin sobrescribir los recursos publicados. El test `tests/integracion-main-auth-cp020-contract.test.cjs` verifica, calculando la huella de blob Git, que estos seis ficheros continúan **byte a byte idénticos** a `main` CP-020:

| Archivo protegido | SHA-1 de blob Git original |
| --- | --- |
| `app.js` | `8787aeba7ef9eb5dee23af4daabf5b35d2c766c2` |
| `index.html` | `b9f9cece896e3e568dcca606f16fa087eb9775ec` |
| `styles.css` | `f29d9fe51820a47320a8e4af14d94bfa5445dfe2` |
| `sw.js` | `f9b84e4ef56b5b8af044334e684e4cc4bd886537` |
| `official-calendar-2026-2027.js` | `4e6def9030da5b813d13ad6c76b5cf043cc841f1` |
| `data/calendario-fgb-2026-2027.json` | `f5e517958707dc9061ea6cf73b7011913d6e0ab9` |

El calendario provisional FGB 2026–27 mantiene las **31 competiciones**: 10 gallegas y 21 nacionales. Los resultados personales del jugador siguen siendo otra fuente diferente y se contabilizan únicamente según el propietario activo.

## Arquitectura I2 sin tocar producción

- **`lab/integracion-main-auth-cp020.html`**: página de prueba separada del `index.html` publicado, sin manifest ni precache de PWA. Usa el CSS actual, el calendario oficial, los módulos independientes de autenticación, perfiles, estadísticas visuales y respaldo y el controlador I2. El **`app.js` publicado solo se carga tras comprobar la identidad ficticia**.
- **`lab/integracion-main-auth-cp020-guard.js`**: antes de cargar módulos, sustituye `localStorage` y `sessionStorage` por mapas en memoria; bloquea `indexedDB` y deniega `navigator.serviceWorker.register`. Si no puede aislar el navegador, el acceso queda bloqueado. Se conserva la interfaz `controller` y `addEventListener()` sin registrar SW para que el motor actual pueda inicializar Liga Nacional. La página no lee, migra ni borra contenido real del navegador.
- **`lab/integracion-main-auth-cp020.js`**: tres usuarios y correos inventados; un doble de identidad responde a `getUser()` y el adaptador real `MiBowlingPrivateRepository` comprueba UUID y correo confirmado antes de exponer documentos. El adaptador trabaja sobre registros por propietario **únicamente en memoria**. Un inicio con contraseña incorrecta no abre `app.js`; altas deshabilitadas. Ante logout, se invalida la pantalla y se recarga para no reutilizar las variables del motor de otra cuenta.
- **`stats-bolos.js`**: mapa visual con los diez bolos; los valores proceden de `periodAggregate(aggregate('entrenamiento',''))` del motor CP-020 y de las partidas activas exclusivamente del usuario ficticio autorizado. No se mezclan Liga Nacional ni usuarios. Se conserva el cómputo del **lanzamiento de bonificación del décimo frame**: A tiene 11 oportunidades de primera bola en la fixture de diez frames más la tirada adicional.
- **`profiles.js`**: nunca se llama a `MiBowlingProfiles.init()`; sus claves conocidas se emplean solo para identificar posibles **orígenes de recuperación**. Un PIN local no puede autenticar una cuenta por correo.
- **`auth-legacy-migration-lab.js`**: se invoca `capture()` sobre datos ficticios con confirmación de UUID, archivo PDF construido en memoria y validación de **SHA-256**. No se abre IndexedDB ni se migra un archivo real.
- **Liga Nacional**: documentos privados `league` del UUID diferenciados de `personal`. El motor actual (incluidos sus métodos de actas) sigue sin cambios; en la demo su estado local se sustituye por una fachada de RAM.
- **Seguridad de pruebas**: servidor HTTPS de loopback temporal, Playwright WebKit/Chromium en perfiles aislados, rutas externas bloqueadas; se deja una clave centinela en el almacenamiento REAL del navegador y se verifica al salir que sigue intacta y que ninguna partida ficticia pasó a él.

## Pruebas y evidencias CI

**Contrato y regresiones Node — SUCCESS:**
`tests/integracion-main-auth-cp020-contract.test.cjs` + `tests/official-calendar-smoke.cjs` y pruebas previas de identidad A1–A4, tres UUID/RLS ficticio A5, respaldo PDF A6, contrato Storage A8 y cálculo estadístico R1.

**Pruebas con navegador — SUCCESS:**

| Motor / tamaño | Jugador ficticio | Resultado |
| --- | --- | --- |
| WebKit / iPhone 390×844 | A | Login, inicio, calendario, Liga Nacional, mapa de 10 bolos, respaldo ficticio |
| WebKit / iPhone 390×844 | B | Cuenta nueva: 0 sesiones, 0 bolas y 0 PDF; sin puntuaciones A |
| WebKit / tablet 768×1024 | C | Historial propio, aislamiento, portada, calendario y Liga |
| Chromium / escritorio 1440×900 | A | Identidad y partidas A, guardado privado en memoria con control de revisión |
| Chromium / escritorio 1440×900 | B | Identidad independiente, estadísticas vacías, sin contaminación |

En todas las comprobaciones se valida el filtro por UUID, la no utilización de datos reales, el estado de aislamiento, los 31 registros FGB (10 verdes y 21 nacionales) y la integridad de los archivos CP-020. Se adjuntan capturas de pruebas A/C y vistas de estadísticas, Liga y calendario en el artefacto CI.

**Incidencia reproducida y corregida:** la versión actual de `app.js` registra un listener `serviceWorker.controllerchange` antes de inicializar la lógica avanzada de Liga. La primera fachada de bloqueo no exponía `addEventListener` y el script interrumpía su ejecución dejando `liga32` sin inicializar. Se implementó una fachada compatible **sin registrar SW ni acceder a servicios**; CI funcional completa pasó en commit `ea504064...`. No se modificó `app.js`.

## Estado real, exclusiones y barreras

**No es una publicación ni una integración de autenticación real.** La cuenta de cada jugador en I2 procede de un doble de Supabase; el marcador CP-020 sigue utilizando el formato de almacenamiento local antiguo que esta demostración desvía a RAM. La escritura de puntuaciones al servidor **solo está simulada**. No hay creación de usuarios, contraseñas reales, JWT, proyectos, SQL RLS ejecutado, buckets, subida de PDF, mensajería, migración o despliegue. Las pruebas de WebKit Linux no sustituyen a Safari/iPhone físico ni resuelven la persistencia nativa de PDF Blob reportada en A8.

Las PR #1, #8, #10, #12 y #13 permanecen independientes y **sin modificaciones**; PR #18 es borrador con base `main`, **sin merge**. La animación 3D de PR #1 no se incorpora ni se publica por esta orden.

### Continuación segura sugerida

1. En otra iteración de LAB, preparar un adaptador asíncrono de puntuaciones privado **sin depender de localStorage** y conciliar lectura, autosave, errores, múltiples sesiones y modo offline, con dobles y pruebas estrictas para dos o más usuarios. No habilitar datos reales.
2. Revisar si el calendario o la portada de `main` cambian después de CP-020 antes de extender esta rama. No copiar indiscriminadamente el `app.js` antiguo de las PR.
3. Solo con autorización nueva, crear un LAB real Supabase con Auth, RLS y Storage, probar tres cuentas de test reales, políticas de acceso y Safari/iPhone físico; respaldar datos antes de cualquier publicación.

**Estado final I2:** desarrollo aislado probado y verificable; **PR #18 abierta como borrador, no fusionada y no publicada**.
