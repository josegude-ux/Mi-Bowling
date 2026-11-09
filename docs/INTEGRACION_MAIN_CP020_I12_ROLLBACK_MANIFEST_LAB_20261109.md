# MI BOWLING · I12 · Manifiestos de exportaciones y defensa condicional ante rollback (LAB)
  
**Orden:** BOWLING-INTEGRACION-CP020-I12-20261109  
**Fecha:** 9 noviembre 2026  
**Ámbito:** exclusivamente identidades ficticias A/B/C. No partidas reales ni servicios ni publicación.
**Punto I11 de partida:** PR #31 draft, checkpoint `72f6428e88a784c5254f081498ae34aee2b9c1bf`, código funcional `fd4e7f4bcf15a2e903631cf4a937210c02f2da5d`.  
**Rama I12:** `feature/integracion-main-auth-i12-lab-20261109`, creada directamente del SHA I11.  
**Main preservado (consultado 09/11/2026):** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**PR I12:** draft y apilada sobre PR #31; no sobre main.  
**Protección CP-020:** pruebas `integracion-main-auth-cp020-contract` y `official-calendar-smoke`; 31 eventos FGB previstos, 10 gallegos + 21 nacionales. No editar activos protegidos.

## Implementación

- `lab/i12-manifest.js`: recibe varios archivos I11 `.mae11` y sus frases ficticias en memoria. Abre cada archivo por AES-GCM + PBKDF2, verifica UUID, SHA-256, recibos y cabecera mediante contrato I11 y valida una continuación prefijo de la anterior. Rechaza archivos antiguos, duplicados, ordenados inversamente o pertenecientes a otro jugador.
- Cada entrada del manifiesto incorpora el SHA-256 del archivo cifrado, ID de exportación, contador y cabeza de cadena; enlaza con el hash de la entrada anterior e incluye IDs de *nuevos* recibos de restauración y conflictos. El manifiesto no contiene puntuaciones, WAL, claves ni contenido de los recibos. Conserva la distinción entre recibos auditados de restauración y una alegación de recuperación física.
- Emite aparte un fichero `.pin12` con digest y estado final del manifiesto. Debe conservarse **fuera y separado** del almacenamiento y navegador de MI BOWLING. Un PIN independiente más reciente permite denunciar una sustitución completa por un manifiesto histórico. Un PIN que el adversario también sustituye NO ofrece esta defensa.
- `compareCurrent` verifica estado actual de auditoría frente a la última exportación corroborada por el PIN externo: `aligned`, `rollback-or-suppression-detected`, `fork-detected`, `external-witness-obsolete`. Solo lectura.
- `verifyDetachedSignature` realiza verificación **experimental** de firma externa ECDSA P-256/SHA-256 sobre `MI-BOWLING-I12-MANIFEST-v1|<digest>` utilizando JWK público externo sin campo privado. Acepta firma binaria IEEE P1363 de 64 bytes codificada base64. No genera claves ni crea firmas; no se presume firma previa ni validez temporal.
- `lab/integracion-main-auth-i12.html` y `lab/i12-ui.js`: pantalla aislada sin app.js, IndexedDB, sesiones ni llamadas de red. Permite seleccionar archivos ficticios, generar y descargar manifiesto y PIN **mediante acciones separadas**, comprobar importaciones, comparar estado actual y verificar firmas públicas.

## Modelo de amenazas y afirmaciones limitadas

| Escenario | Señal verificable | Límite |
| --- | --- | --- |
| Fichero `.mae11` alterado o frase errónea | AES-GCM/SHA-256 rechazan antes de comparar | Necesita archivo completo y su clave |
| Exportación intermedia ausente | Faltan archivos/manifiesto no coincide | Si se elimina el manifiesto y el PIN junto con el archivo, no hay ancla externa |
| Sustitución por archivo de fecha anterior | Continuidad prefijo / recuento / hash de archivo no coincide | La fecha del ordenador no es un reloj de confianza |
| Borrado de ancla y recibos locales | Detectado si existe testigo independiente más nuevo y PIN no sustituido | Sin testigo independiente no se puede distinguir un estado nuevo de un rollback |
| Reescritura de manifiesto internamente coherente | El PIN externo conservado detecta digest distinto | El PIN debe permanecer separado y no modificable por el mismo adversario |
| Dos cadenas de historial distintas | Detecta bifurcación al primer hash de recibo distinto | No hay consenso entre dispositivos reales ni servicio confiable |
| Firma pública externa | Comprueba autoría relativa a *esa clave pública* | Requiere distribución fiable de clave, gestión de firma privada, caducidad/revocación y cronología independientes |

**NO se declara inmutabilidad**, no se infiere hora auténtica, no se afirma defensa contra atacante con control de los archivos, el PIN y las claves, ni se garantiza integridad física después de fallos eléctricos. Los sellados I11 tienen contraseñas de demostración, no credenciales reales. No se han probado llaveros externos, HSM, sellados temporales ni servicios de firma.

## Pruebas incluidas

`tests/i12-manifest-contract.test.cjs`: Node/WebCrypto, tres exportaciones con dos recibos de restauración y un conflicto; supresión de archivo, duplicados, orden inverso, alteración, PIN moderno frente a manifiesto viejo, bifurcación, comparación con ancla local revertida, testigo obsoleto, usuarios A/B/C separados, validación concurrente sin escritura y firma ECDSA efímera válida/alterada/clave ajena.

`tests/i12-manifest-browser.test.cjs`: WebKit emulado móvil y Chromium escritorio bajo HTTPS local, rutas sin servicios ajenos, selección de archivos, dos descargas explícitas, PIN, rollback, tamper, aislamiento por identidad y ausencia de bases de datos nuevas. Es emulación; **no** prueba Safari iPhone físico.

`.github/workflows/integracion-i12-lab.yml`: dos jobs CI, Node contratos/CP-020/FGB e interfaz WebKit + Chromium. Las evidencias CI finales, SHA de código probado y SHA documental se registrarán solamente tras consulta real a GitHub Actions.

## Checkpoint verificable · BOWLING-I12-CP-001

**Código funcional exacto validado:** `05afeffd1ebe3ea66bdf8e37ea8606fa506a4b88`.  
**GitHub Actions CI código:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42607656230 — **SUCCESS 2/2** (contratos Node CP-020/FGB/criptografía A/B/C y navegador WebKit/Chromium).  
**CI anterior:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42607608931 — **SUCCESS 2/2**.  
**Diff revisado respecto a I11:** 7 archivos **solo nuevos**, +638 líneas, 0 eliminadas; ninguna edición en código CP-020, calendario, app publicada o PWA.  
**Base comprobada:** 72f6428e88a784c5254f081498ae34aee2b9c1bf; I12 ahead 9 commits antes de este cierre documental, behind 0.  
**Main comprobado:** 7fbb3fb32d889c3213626e5f73c49b0885ef9911, sin modificaciones.

El checkpoint documental se añade sin cambiar código funcional; validar CI nuevamente contra su SHA exacto antes de declararlo definitivamente aprobado. Las pruebas de WebKit son emulación Linux; Safari de iPhone físico continúa pendiente. La firma P-256 ha sido verificada únicamente con claves de test efímeras, no con una autoridad independiente auténtica.

## Continuidad

Sin fusión, sin publicación, sin cambios a `main`, producción, calendario CP-020, app PWA ni PR previas. La PR I12 permanece independiente de I11 y de todas las anteriores. **Solo datos ficticios A/B/C.**
