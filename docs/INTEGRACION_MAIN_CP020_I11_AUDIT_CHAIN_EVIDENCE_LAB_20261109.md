# MI BOWLING · I11 · Cadena de integridad y evidencias cifradas independientes (LAB)

**Orden:** BOWLING-INTEGRACION-CP020-I11-20261109  
**Fecha:** 9 de noviembre de 2026  
**Alcance:** exclusivamente pruebas aisladas con los jugadores ficticios A/B/C; ningún dato auténtico o servicio externo.  
**PR:** https://github.com/josegude-ux/Mi-Bowling/pull/31 (draft, apilada sobre PR #30).  
**Rama I11:** feature/integracion-main-auth-i11-lab-20261109.  
**Punto de partida I10 exacto:** checkpoint 7e32d5dcaae3331325798a722c3a975dc5ba8007; código probado 38f2e1d40657bd5a6e4ed2767e68edb51033e0ff.  
**Código I11 exacto probado:** fd4e7f4bcf15a2e903631cf4a937210c02f2da5d.  
**CI código funcional:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42595446309 (**SUCCESS, 2/2 jobs**).
**CI de PR mismo SHA:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42595453270 (**SUCCESS, 2/2 jobs**).
**Main ajeno a I11 observado:** 7fbb3fb32d889c3213626e5f73c49b0885ef9911. Ni modificado ni fusionado por I11.

## Cambios aislados implementados

1. **Cadena firmada por hash:** \`lab/i11-audit-core.js\` valida estrictamente identidad UUID, número de secuencia, \`prevHash\`, \`chainHash\`, ausencia de duplicaciones y esquema de cada evento. Cada nuevo recibo enlaza criptográficamente con el anterior mediante SHA-256. Los eventos pueden representar tanto una restauración confirmada como un conflicto verificable rechazado (\`stale\`, \`fork\`, \`operation\`); un aborto de transacción NO se registra como una restauración válida ni como conflicto de negocio.
2. **Ancla cifrada propia:** \`lab/i11-encrypted-store.js\` introduce \`mi-bowling-i11-lab-encrypted-data-v5\`, con cuatro almacenes de LAB: confirmados, WAL, recibos y ancla de cadena. En una restauración confirmada se escriben puntuaciones confirmadas, WAL nuevos, evento cifrado y ancla cifrada en **una transacción IndexedDB atómica**. Todas las filas son privadas de su UUID y están cifradas mediante AES-256-GCM. Se validan previamente recibos y ancla; una entrada eliminada, cambiada, duplicada o desordenada bloquea la apertura normal.
3. **Trazabilidad de conflictos rechazados:** \`lab/i11-backup.js\` registra un rechazo si un archivo correctamente descifrado y autenticado intenta degradar revisiones (\`stale\`), reemplazar confirmado divergente (\`fork\`) o repetir operación con identidad distinta (\`operation\`). Nunca modifica las puntuaciones en esos casos. Los abortos antes de commit, fallos por almacenamiento y errores de clave no crean recibos de restauración ni falsos conflictos.
4. **Testigo externo independiente:** \`lab/i11-evidence.js\` exporta exclusivamente la cadena de recibos y su ancla a un archivo \`.mae11\`, cifrado por separado con otra frase ficticia y AES-256-GCM/PBKDF2-SHA256. **No contiene puntuaciones ni WAL.** La exportación necesita descarga explícita y conservar el archivo fuera del perfil de navegador para ofrecer un punto de comparación verdaderamente independiente. El contenido se verifica por UUID, GCM, SHA-256, orden y ancla. No hay servicio externo ni envío de archivos.
5. **Recuperación conservadora de evidencia:** se puede recuperar una fila de auditoría ausente o la ancla desaparecida **solo tras validar la evidencia externa y dar consentimiento expreso**, mediante una transacción CAS de los almacenes de auditoría. Se rechazan conflictos y ciphertext alterado; las filas intactas se conservan. Nunca modifica confirmados, partidas o WAL. La evidencia del usuario A no se puede importar como B o C.
6. **Interfaz y seguridad:** nueva pantalla \`lab/integracion-main-auth-i11.html\`, puente, guard y controles de exportación, verificación, previsualización y recuperación de evidencias. El motor CP-020 sigue encapsulado, sin leer \`localStorage\` auténtico ni registrar PWA. Se mantienen los componentes I2–I10 sin ediciones.

## Matriz de pruebas y evidencias confirmadas

| Prueba | Evidencia observada |
| --- | --- |
| Hashes de seis activos CP-020 en rama LAB | Node GitHub Actions: **PASS**, sin edición de esos activos |
| Calendario FGB 2026–27 | **PASS:** 31 eventos, **10 gallegos** y **21 nacionales**; filtros/sin duplicados |
| Contrato puro de cadena | **PASS:** supresión central/final, cambio de contenido, orden invertido, duplicación y divergencia de ramas detectados |
| Cifrado del archivo de evidencia | **PASS:** UUID A, frase incorrecta, cabecera/ciphertext adulterado y consentimiento de recuperación |
| Recibos por restauración/conflicto | Chromium: **2 restauraciones confirmadas + 2 conflictos rechazados** en orden verificable |
| Cierre completo y relanzamiento Chromium | **PASS:** los cuatro eventos, ancla y testigo cifrado permanecen verificables |
| Controles de interfaz | **PASS:** botón de descarga real \`.mae11\`, archivo descargado y previsualización sin escritura |
| Supresión de recibo intermedio | **PASS:** ancla denuncia la supresión; evidencia externa autenticada reintroduce solo el recibo que falta |
| Supresión del último recibo | **PASS:** ancla detecta cola incompleta; recuperación conservadora sin modificar puntuaciones |
| Supresión simultánea de recibos y ancla | **PASS:** la base local sola no detecta la pérdida; el archivo independiente sí, y permite recuperar la evidencia |
| Alteración de un recibo cifrado | **PASS:** fail-closed, sin sobrescribir ciphertext adulterado mediante una restauración automática |
| Aislamiento | **PASS:** claves equivocadas y evidencia de A aplicada a B/C rechazadas |
| Concurrencia | **PASS:** importaciones paralelas y reintento explícito conservan un único confirmado, un WAL y una cadena lineal |
| Atomicidad | **PASS:** abortos antes/después de encolar, acuse perdido tras commit y reintento idempotente sin duplicar recibos |

**Evidencia de CI funcional:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42595446309 — Node y WebKit/Chromium en verde. Las pruebas de Chromium son sobre un perfil temporal y servidor HTTPS **local**. No son Safari físico ni un backend de producción.

## Límites de seguridad no resueltos

- **No inmutabilidad absoluta.** El ancla y las filas residen en el mismo origen de navegador. Si una persona o proceso con acceso suficiente elimina simultáneamente ancla y recibos, no hay testigo local que detecte esa operación; solo una copia \`.mae11\` exportada anteriormente, retenida de manera independiente y con frase accesible puede acreditar la pérdida. Un atacante con acceso a la clave y al origen puede intentar reescribir la historia local; esta fase es protección experimental, no un registro legal o remoto inmutable.
- **No restauración de partidas con el archivo de evidencia.** Los archivos \`.mae11\` recuperan solo la trazabilidad; las puntuaciones y WAL reales requieren sus propios respaldos.
- **No compatibilidad de formatos por suposición.** El archivo independiente de evidencias I11 y las copias de puntuaciones de I11 son formatos LAB concretos; no se realiza migración automática de archivos previos ni de producción. El usuario debe conservar contraseña y respaldo; no existe recuperación de frase olvidada.
- **No garantías físicas sobre abortos.** Las pruebas de fallo usan abortos inyectados en transacciones reales de IndexedDB y cierres/reaperturas controlados; no simulan corte eléctrico, fallo físico, cuota iOS real, Safari iPhone físico ni múltiples dispositivos.
- No conectamos bases de datos, cuentas, servicios de terceros ni producción.

**Estado operativo:** I11 validada funcionalmente únicamente en LAB, PR #31 draft apilada sobre PR #30, main y PR anteriores independientes, sin fusión ni publicación.
