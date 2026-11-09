# MI BOWLING · LAB I21 · Procedencia externa y sustitución simultánea de documento + SHA

**Orden:** BOWLING-INTEGRACION-CP020-I21-20261109  
**Fecha:** 09/11/2026  
**Base acreditada:** PR [#40](https://github.com/josegude-ux/Mi-Bowling/pull/40) OPEN/DRAFT/UNMERGED, checkpoint `BOWLING-I20-CP-001`, HEAD documental `fc9b61d83df170e53e675942ff77c8bef8463abc`, código funcional `def4e88d40ad039083e9c8123832175b869c3274`.  
**CI base:** [push 42680715833](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42680715833) y [PR 42680728227](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42680728227), `completed / SUCCESS / 2 jobs` en el HEAD documental exacto.  
**Rama LAB:** `feature/integracion-main-auth-i21-lab-20261109`, nacida del HEAD I20 sin crear órdenes duplicadas.  
**Estado previo de `main`:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**Alcance restringido:** A/B/C íntegramente ficticios. No tocar FGB CP-020, sesiones, producción, PR anteriores o servicios; sin fusiones ni publicaciones.

## Riesgo concreto y principio de validación

Un paquete I20 y una declaración SHA-256 que lo acompaña pueden haber sido sustituidos **conjuntamente**. El hecho de que la huella coincida con el documento, incluso en tres archivos A/B/C, **no demuestra la existencia anterior de ese documento** ni que tres personas independientes lo hayan conservado. Los PIN externos introducidos en una pantalla pueden proceder de un atacante o del mismo documento. Ninguna comprobación informática local sin una referencia auténtica retenida previamente puede descartar por sí sola este ataque.

I21 no añade una nueva fuente de confianza: **diagnostica la insuficiencia de procedencia**, preserva los materiales A/B/C y obliga a dejar explícita la incertidumbre. El sistema nunca decide qué copia era la última ni quién era un custodio auténtico.

## Implementación I21

1. `lab/i21-provenance-doubt.js`: contrato estrictamente offline que examina tres posiciones A/B/C opcionales. Una posición es `null` o `{slot,packet,claim}`, donde `packet` es un paquete I20 íntegro y `claim` una declaración de hash sin autenticidad `MI-BOWLING-I21-UNVERIFIED-DIGEST-CLAIM`. El origen aceptado `unverified-file` no equivale a identidad, sello, certificado ni repositorio externo.
2. Para cada paquete intenta `I20.verify`, compara SHA declarado con el `packetDigest` y preserva también materiales que resulten inválidos, marcando `invalid-source-packet`, `invalid-claimed-digest` o `invalid-structure` sin corregirlos ni descartarlos. Los archivos originales y sus huellas quedan dentro del sobre I21.
3. Clasificaciones conservadoras: `quarantine-unverifiable` cuando hay un candidato inválido; `quarantine-competing-packets` ante paquetes íntegros incompatibles; `blocked-evidence-loss` sin candidatos válidos; `blocked-unrepresented-pin` o `quarantine-pin-mismatch` cuando la referencia suministrada difiere; `conditionally-matching-supplied-pin` si coincide exactamente un SHA aportado con todos los candidatos presentes; `blocked-joint-substitution-undecidable` cuando el archivo+SHA son coherentes pero no hay referencia supuestamente anterior. **Ninguno de estos estados implica procedencia demostrada o autorización.**
4. Se registra una traza hash de comparación. `requestReview` puede añadir `review-request-recorded-not-sent` como anotación local, **sin enviar mensajes ni abrir tickets**. Las solicitudes duplicadas se rechazan. `verify` recalcula la clasificación y toda la cadena, con SHA externo del sobre I21 opcional para contraste, pero nunca declara quién lo conservó o cuándo.
5. Campos fijos sin excepciones: `authority:'none'`, `operationalApproval:false`, `independentSourceProven:false`, `authenticPriorPinProven:false`, `humanIdentityProven:false`, `custodyIndependenceProven:false`, `timeProven:false`, `immutabilityProven:false`, `freshnessProven:false`, `coordinatedReplacementExcluded:false`, `noWrites:true` y `containsScores:false`.
6. `lab/integracion-main-auth-i21.html` y `lab/i21-ui.js`: interfaz móvil/escritorio separada de la aplicación, CSP `connect-src 'none'`, importación de hasta tres archivos I20, SHA declarados (o autocalculados con advertencia explícita de que NO son fuentes independientes), referencia previa opcional, petición externa solo anotada, descarga local voluntaria y contraste posterior del sobre I21. Cambiar una fuente o referencia invalida el resultado en memoria. Sin autenticación de cuentas, red externa, IndexedDB ni escrituras de puntuaciones.
7. `tests/i21-provenance-fixture.cjs` y `tests/i21-provenance-contract.test.cjs`: paquetes alternativos enteramente íntegros construidos a partir de I20 con datos A/B/C sintéticos. El atacante sustituye simultáneamente documento y SHA: el verificador interno debe reconocer la coherencia **y mantener el estado no demostrable**. Si también aporta un nuevo supuesto PIN, el sistema solo registra coincidencia condicionada. Un PIN diferente aportado desde fuera detecta no coincidencia, sin acreditar su antigüedad o custodia.
8. Casos adicionales: paquetes completos divergentes y copias idénticas; documentos perdidos, falsos orígenes, SHA adulterados, falso consentimiento, falsificación de aprobación, sustitución de la traza, referencias externas erróneas, cruces de propietario A/B/C y verificaciones paralelas sin escrituras.
9. `tests/i21-provenance-browser.test.cjs`: WebKit Linux móvil emulado y Chromium escritorio mediante HTTPS privado en bucle local y bloqueo de tráfico externo. Importar/contrastar paquetes y SHA, simular cambio coordinado, introducir referencia previa, exportar por clic, rechazar permisos falsos, conservar almacenamiento operativo y mostrar que la prueba de custodia sigue ausente.
10. `.github/workflows/integracion-i21-lab.yml`: dos trabajos Actions, uno Node con FGB CP-020 y regresiones I11–I20 e I21; el segundo WebKit/Chromium sin servidores externos. No se despliega ninguna aplicación.

## Límites no negociables

- **Un SHA no es una firma de custodia**: la coincidencia aritmética solo demuestra que se utilizó ese contenido para calcular un digest, no que ese contenido existiese antes o que fuera aceptado por un custodio independiente.
- Dos o tres referencias coincidentes **pueden proceder de una misma fuente o de un solo atacante**. I21 no concede independencia por número de etiquetas.
- Una referencia realmente retenida y custodiada en otro medio podría ayudar a detectar una sustitución, pero este LAB **no prueba** quién la retuvo, si era confiable, cuándo se obtuvo, si está comprometida o si es la última.
- No se acredita firma humana, autorización operativa, sello temporal, WORM, inmutabilidad, anti-replay absoluto ni recuperación segura de material externo perdido. Un sobre I21 y sus hashes pueden reconstruirse conjuntamente por alguien con pleno control de los archivos y sus supuestas referencias.
- Todos los pasos son locales, con A/B/C ficticios. No se contacta a personas, no se registran tareas reales ni se modifica producción, calendario FGB, `main` o PR antiguas.

## Checkpoint funcional · BOWLING-I21-CP-001

**SHA funcional I21 comprobado:** `4b02afa1fd38bf4ff1594a842c0cf2c5528eba61`.  
**CI funcional push:** [42683226970](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42683226970), `completed/SUCCESS 2/2` en ese SHA.  
**CI funcional PR:** [42683338974](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42683338974), `completed/SUCCESS 2/2` en el mismo SHA.  
**PR I21:** [#42](https://github.com/josegude-ux/Mi-Bowling/pull/42), OPEN/DRAFT/UNMERGED, apilada sobre la rama de PR #40.  
**Comparación con HEAD I20 `fc9b61d83df170e53e675942ff77c8bef8463abc`:** exactamente 8 archivos nuevos I21, todos `added`; 0 modificados, 0 eliminados; 8 commits delante y 0 detrás antes de este checkpoint documental.

**Verificación real de los logs de GitHub Actions:**
- CP-020 y calendario FGB: `PASS` con **31 eventos (10 gallegos y 21 nacionales)**, sin duplicados ni cambios de datos en el entorno de esta rama; regresiones I11–I20 superadas.
- Contratos I21 Node: `PASS`, incluso ante sustitución conjunta coherente de paquete y SHA, falsa declaración de custodia/autoridad/tiempo, diferencia con PIN aportado, candidatos rivales y datos A/B/C ficticios.
- WebKit móvil emulado y Chromium escritorio: `PASS` con sustitución conjunta no resoluble, PIN anterior incompatible, variantes en cuarentena, aprobación falsa rechazada, exportación solo por clic y sin IndexedDB/red ajena.

**Incidencia concurrente sobre `main` — NO atribuible a I21:** al comenzar I21 se verificó `main` en `7fbb3fb32d889c3213626e5f73c49b0885ef9911`. Durante el desarrollo GitHub registró la fusión externa de la **PR #41, MI BOWLING LAB visual R1**, y `main` pasó a `1a8fe012ca6b515dcb35161c1aa5f4fa01a689f3`. La comparación muestra un commit ahead con archivos nuevos de diseño y modificación de `index.html` y `sw.js`. **I21 NO realizó esa fusión ni modificó `main`, `index.html`, `sw.js` o producción**. Las CI de I21 se ejecutan en su rama LAB anterior a esa fusión; por tanto, no certifican la interacción del diseño fusionado con esta rama. La PR #41 se conserva en su estado real CLOSED/MERGED. Las PR #39, #40 e I21 #42 permanecen independientes; no revertir ni reconstruir PR #41.

**Limitación:** el estado `conditionally-matching-supplied-pin` es solo coincidencia de bytes; no prueba que un pin existiera antes del incidente. `coordinatedReplacementExcluded:false` permanece falso aun con varios archivos idénticos o con el propio hash suministrado. No se genera autoridad nueva, nueva raíz, aprobación ni petición de revisión real.

**HEAD documental:** el commit que incorpore el checkpoint tendrá SHA distinto del funcional. Debe volver a pasar ambas CI completas sobre ese SHA exacto. Consignar el cierre en el cuerpo de la PR #42 sin otro commit.

## Plan de aceptación y continuidad

Primero ejecutar CI funcional de GitHub Actions y comprobar el SHA exacto, ambos jobs, logs Node/CP-020/FGB y WebKit/Chromium. Añadir después `BOWLING-I21-CP-001` con evidencias concretas a esta documentación, creando un solo commit documental. Confirmar de nuevo que el HEAD documental definitivo pasa `push` y `pull_request` completos. Registrar el resultado final y la orden para I22 **en el cuerpo de la PR, no mediante un commit posterior**. Mantener I21 OPEN/DRAFT/UNMERGED y no iniciar I22 sin nueva orden.

**Estado inicial:** desarrollo LAB añadido; CI funcional y checkpoint sujetos a comprobación. Nunca afirmar éxito antes de ver resultados GitHub.
