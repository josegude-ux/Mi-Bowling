# MI BOWLING · I19 · Revisión humana trazable y escalada no autorizativa (LAB)

**Orden:** BOWLING-INTEGRACION-CP020-I19-20261109  
**Fecha:** 09/11/2026.  
**Base comprobada en GitHub:** PR [#38](https://github.com/josegude-ux/Mi-Bowling/pull/38), abierta draft, no fusionada, checkpoint `BOWLING-I18-CP-001`, HEAD documental `12148a870d42f4705964a38111b63d224f2e0f6f` y SHA funcional `ee59878e9e81bc89f48741750793c9cae2103743`.  
**CI definitiva I18 acreditada:** [push 42674779144](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42674779144) y [PR 42674788021](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42674788021), ambas `SUCCESS 2/2` sobre el HEAD documental exacto.  
**Rama aislada I19:** `feature/integracion-main-auth-i19-lab-20261109` creada desde el HEAD I18 anterior.  
**Main observado antes de I19:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**Ámbito exclusivo:** identidades, firmas y datos A/B/C sintéticos; sin cuentas reales, servicios de red, nuevas raíces confiables, fusiones, modificaciones de producción ni publicación.

## Riesgo pendiente de I18 y alcance nuevo

I18 preserva expedientes forenses y una traza técnica de diagnóstico, pero **no contiene observaciones individuales posteriores** y una fase de revisión manual puede interpretarse erróneamente como una autorización para publicar o recuperar datos. I19 añade un registro de revisión **declarativa y de solo lectura**, con los impedimentos explícitos de confianza. El programa no verifica identidad ni independencia de quienes seleccionan los alias. Una etiqueta A/B/C es ficticia y no equivale a una firma humana.

## Desarrollo real I19

1. `lab/i19-manual-review.js`: nuevo contrato aislado. Antes de abrir o comprobar una revisión valida íntegramente el expediente I18 mediante `I18.verify`. La revisión queda enlazada a su propietario ficticio, `caseId`, SHA-256 del expediente I18, categoría de diagnóstico anterior y opcionalmente una huella externa **suministrada por el usuario**. Nunca deriva una huella externa confiable a partir del propio expediente.
2. `prepare` crea una **revisión sin eventos y sin autoridad**. `record` agrega una observación categórica con alias A/B/C, uno de cuatro estados no autorizativos y una de cuatro bases declaradas; cada evento enlaza el hash del anterior con separación de dominio criptográfico. Acepta como máximo tres alias distintos. Una segunda observación con el mismo alias es rechazada, pero dos alias distintos siguen sin demostrar dos seres humanos independientes.
3. `escalate` requiere **dos observaciones con alias distintos** para registrar únicamente el estado `escalated-unresolved`: la acción automática es siempre una nueva anotación, **nunca un permiso**. La categoría de escalada se deriva de forma estricta del diagnóstico I18 (`unresolved-signed-fork`, `missing-original-I15-trust`, `missing-original-I16-anchors`, etc.), no del deseo de un revisor.
4. `verify` reconstruye todos los eventos, los hashes, el orden de alias, el estado final y el hash de la revisión. Detecta reordenamientos, decisiones inventadas, aprobaciones, identidad cruzada, un expediente I18 diferente y PIN externo erróneo. No crea timestamps ni firma eventos; el SHA del registro **no prueba** que haya existido una persona, una custodia física o una versión inmutable.
5. Todos los expedientes I19, incluso los I18 `conditionally-consistent`, conservan los campos `authority:'none'`, `operationalApproval:false`, `externalCustodyProven:false`, `reviewerIdentityProven:false`, `independentReviewersProven:false`, `signedHumanConsentProven:false`, `timestampProven:false`, `immutableStorageProven:false`, `irreversibleEscalationAuthorized:false` y `noWrites:true`.
6. `lab/integracion-main-auth-i19.html` y `lab/i19-ui.js`: pantalla móvil/escritorio LAB, CSP `connect-src 'none'`; carga de un expediente `.hold18`, validación opcional frente a SHA exterior, controles de selección manual categórica A/B/C, escalada bloqueada hasta dos alias, exportación local exclusivamente por interacción y contraste posterior de un `.review19`. Cambiar el expediente o la huella exterior invalida la revisión que estaba preparada, sin reciclar información del caso anterior.
7. `tests/i19-review-fixture.cjs`, `tests/i19-review-contract.test.cjs`, `tests/i19-review-browser.test.cjs`: A/B/C sintéticos heredados de I18 sin almacenar claves privadas. Incluyen historia de bifurcación auténticamente firmada, pérdida total I15, pérdida de anclas I16, caso I18 coherente pero **no autorizable**, rechazo de alias repetidos, de falsa aprobación, de consentimiento/identidad física, de alteración del hash, de SHA externo incorrecto, de titular cruzado y ejecución concurrente de solo lectura.
8. `.github/workflows/integracion-i19-lab.yml`: CI de dos jobs para Node (CP-020/FGB, regresiones I11–I18, ataque I19) y WebKit Linux móvil emulado + Chromium de escritorio en HTTPS loopback privado y bloqueo de redes ajenas.

## Matriz adversarial / pruebas exigidas

- Dos etiquetas distintas permiten registrar únicamente **escalada pendiente**, jamás aprobación o despliegue; una sola etiqueta no escala.
- Duplicación de alias, falsificación de acción, mutación de un evento, sustitución de expediente, cambio de SHA, falsificación de `operationalApproval`, `independentReviewersProven`, `timestampProven`: rechazo.
- Expediente I18 con bifurcación firmada: retención; escalada `unresolved-signed-fork`, sin optar por una rama.
- Expediente I18 con pérdida total I15: `missing-original-I15-trust`. Pérdida de anclas I16: `missing-original-I16-anchors`; nunca reinventa nuevas raíces/PIN.
- Expediente I18 `conditionally-consistent`: revisión humana todavía pendiente y `operationalApproval:false`.
- Independencia de propietario A/B/C, tres verificaciones concurrentes; sin escrituras en I11, IndexedDB, sesión real, servicios o producción.
- Browser en WebKit/Chromium: botón de exportación hasta que el usuario lo solicite, comparación del archivo I19 y rechazo de falsificación.

## Límites explícitos

El registro I19 es una **declaración introducida manualmente** o simulada por el test; un número mínimo de alias distintos no acredita identidades humanas, simultaneidad, custodia de claves, independencia de operadores, ausencia de coacción ni validación externa de hechos. La cadena de hash es recomputable por cualquiera que pueda reescribir el registro y su huella; no es WORM, audit trail real del servidor, servicio de firma, sello de tiempo ni garantía de replay si se pierde el PIN externo. Un resultado técnico favorable no autoriza nada.

No hay integraciones con servicios de identidad, almacenamiento o aprobación; no se realizan solicitudes de seguridad a personas reales, no se envían comunicaciones y no se toca producción. Tampoco hay comprobación de Safari en iPhone físico ni verificación de custodios reales.

## Checkpoint funcional · BOWLING-I19-CP-001

**Código funcional aprobado:** `4ed8589c6cf7a065537a5f5abab1cef6d041d549`.  
**CI GitHub Actions push funcional:** [42677192653](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42677192653) — **SUCCESS 2/2** sobre dicho SHA.  
**CI GitHub Actions PR funcional:** [42677268005](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42677268005) — **SUCCESS 2/2** sobre el mismo SHA.  
**PR de laboratorio:** [#39](https://github.com/josegude-ux/Mi-Bowling/pull/39), estado draft/open/unmerged y base `feature/integracion-main-auth-i18-lab-20261109`.  
**Comparación GitHub con I18:** merge base exacta `12148a870d42f4705964a38111b63d224f2e0f6f`; 8 archivos I19 **solo añadidos**; 8 commits ahead/0 behind en el SHA funcional. Ningún archivo de I11–I18, PWA, calendario FGB CP-020 o producción modificado ni eliminado.  
**Main verificado:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`, inalterado.

**Evidencias extraídas directamente de los logs funcionales:**
- Node: **PASS FGB 31 eventos** (10 gallegos, 21 nacionales), contrato CP-020 y regresiones I11–I18, sin duplicados ni variación de datos.
- Node I19: **PASS** retención de discrepancias firmadas, bloqueo de alias duplicado, exigencia de dos alias lógicos para una escalada no autorizativa, cadena de SHA, pérdida total I15/I16, PIN externo incompatible, rechazo de falsa aprobación y de afirmaciones sobre custodia/tiempo, aislamiento A/B/C, concurrencia sin escrituras.
- WebKit Linux móvil emulado: **PASS** revisión manual, duplicados rechazados, escalada pendiente sin aprobación, exportación local explícita, expediente alterado rechazado, pérdida de confianza I15 y sin IndexedDB/red externa.
- Chromium escritorio: **PASS** mismas pruebas LAB aisladas.

**Restricción esencial del resultado:** ni dos etiquetas de revisión ni un hash firmado internamente acreditan custodios reales, consentimiento, identidad humana, seguridad de almacenamiento o frescura. Las pruebas **no convierten** el expediente I18 en autorizado ni acreditan un re-root. Todas las pruebas usan A/B/C ficticios.

**HEAD documental:** se obtendrá en el commit que incorpore el presente checkpoint. No declarar éxito final hasta comprobar `push` y `pull_request` con todos los jobs finalizados sobre ese HEAD exacto. Si la orquestación Actions falla, registrar el bloqueo sin reinterpretar trabajos ausentes.

## Protección y cierre de CI

La PR I19 debe quedar **draft** apilada sobre #38, con archivos I19 exclusivamente nuevos y sin modificaciones o eliminaciones de I11–I18, FGB CP-020, PWA, `main` ni las PR previas. El flujo obligatorio es PROGRAMAR → PROBAR → CORREGIR → REPROBAR → ENTREGAR y `GLOBAL-CONTINUIDAD-001 R1`, sin repetir pruebas superadas innecesariamente.

**Pendiente:** verificar SHA funcional y sus CI push/PR 2/2 exactas; registrar `BOWLING-I19-CP-001` con evidencias concretas y luego comprobar CI del HEAD documental definitivo. No afirmar éxito sin logs ni programar I20 antes del checkpoint.
