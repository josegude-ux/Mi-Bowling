# MI BOWLING · LAB I23 · Evidencias externas declaradas, nunca acreditadas

**Orden:** BOWLING-INTEGRACION-CP020-I23-20261109  
**Fecha:** 09/11/2026  
**Base exacta recuperada:** PR [#44](https://github.com/josegude-ux/Mi-Bowling/pull/44) OPEN/DRAFT/UNMERGED; checkpoint `BOWLING-I22-CP-001`, HEAD documental `d3999b98847673b19e69eec6602575f48b4ddfbc`, código funcional `90e94439d1b8b8aeac22989f18fa4f2126c71126`.  
**CI definitivas de origen:** [push 42688109510](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42688109510) y [PR 42688122348](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42688122348): ambas `completed/SUCCESS 2/2` en HEAD documental I22.  
**Búsqueda de duplicidad:** no existía rama ni PR propia I23 al comienzo; orden creada una sola vez.  
**Rama I23 LAB aislada:** `feature/integracion-main-auth-i23-lab-20261109`, creada desde el SHA documental I22.  
**`main` observado:** `1a8fe012ca6b515dcb35161c1aa5f4fa01a689f3`, que incluye la fusión externa anterior de PR #41 de diseño visual blanco/azul. Se preservan PR #43 de auditoría PWA, todas las PR, FGB CP-020 y producción.

## Problema tratado

I22 registraba una matriz de incertidumbre: un archivo y su SHA-256 pueden haberse sustituido juntos, y tres archivos A/B/C no representan automáticamente tres custodios independientes. I23 añade una distinción estructurada entre:

- **Coherencia interna** de documentos y hashes (comprobable con `I22.verify`).
- **Afirmaciones no autenticadas** de que una referencia fue conservada fuera de línea, bajo determinada etiqueta, o antes de un incidente.
- **Evidencias realmente independientes** que requerirían acreditación externa y que este LAB, sin servicios ni custodios reales, **nunca afirma haber obtenido**.

Una etiqueta de grupo distinta, un valor SHA coincidente o tres declaraciones de origen de archivos A/B/C no prueban cadena de custodia, identidad de quien los generó ni anterioridad histórica. Una sustitución coherente de archivos y referencias puede reproducir esas señales.

## Desarrollo nuevo

1. `lab/i23-external-evidence-gate.js`: nuevo contrato aislado que exige un sobre I22 base íntegro, un PIN de la fuente I22 opcional **aportado, sin autenticar**, y un vector de tres posiciones lógicas A/B/C. Cada posición puede estar ausente o contener `{slot,packet,claim}`. Se conservan originales exactamente según su contenido estructurado, incluso si son inválidos.
2. Cada `claim` debe tener estructura cerrada `MI-BOWLING-I23-LAB-UNVERIFIED-REFERENCE` con `packetDigest`, `origin` (`self-export`, `claimed-offline`, `unknown`), `retentionGroup`, `preIncidentClaimed` y `reviewerAlias` lógico A/B/C. **Ninguno de esos campos constituye una firma, sello, prueba humana o certificación de almacenamiento.** No se aceptan campos de claves/secretos.
3. Las candidatas se validan contra I22, se contrasta su digest declarado y se comparan el digest de origen `source.digest`, las huellas de la versión completa, el grupo y alias declarados. Se detectan registros inválidos, referencias incompatibles, candidatos de otro origen lógico, versiones contradictorias, copias idénticas, grupos o alias comunes y pérdida de posiciones. Las copias y referencias dañadas **se preservan** en el nuevo sobre, sin reparación silenciosa.
4. Clases retenidas sin autoridad: `quarantine-invalid-claim`, `quarantine-cross-case`, `quarantine-competing-versions`, `hold-correlated-reference-claims`, `hold-no-reference` o `hold-matching-without-independent-proof`. No se resuelve una controversia por mayoría de archivos ni se promueve una versión operativa.
5. **Lista cerrada de seis requisitos externos**, todos con `status:not-verifiable-in-lab` y `satisfied:false`: referencia original retenida por una fuente auténticamente independiente; identidad real y control del custodio; prueba histórica de conservación antes del incidente; anclaje de tiempo verificable fuera de LAB; inmutabilidad física/WORM acreditada; aprobación humana efectiva según una autoridad real diferenciada. El sistema no puede aprobar automáticamente ninguno.
6. Todos los resultados I23 deben mantener `authority:'none'`, `operationalApproval:false`, `independentOriginProven:false`, `originalPinAuthenticityProven:false`, `humanIdentityProven:false`, `custodiansIndependentProven:false`, `preincidentRetentionProven:false`, `timeProven:false`, `immutabilityProven:false`, `jointReplacementExcluded:false`, `reRootAuthorized:false`, `outsideReviewContacted:false`, `noWrites:true`, `containsScores:false`.
7. `noteExternalReview` admite exclusivamente registrar una anotación local `manual-outside-review-recorded-not-sent` con hash de traza; una segunda anotación se rechaza. No envía correo, no contacta a custodios, no crea tickets ni derechos. `verify` recalcula fuentes, comparación, requisitos, traza y huella I23. Un SHA externo opcional del propio sobre se compara aritméticamente, sin autenticar su procedencia.
8. `lab/integracion-main-auth-i23.html` y `lab/i23-ui.js`: pantalla responsive separada con CSP sin red exterior, carga de fuente I22 y tres posiciones A/B/C, referencias y declaraciones opcionales explícitamente **no verificadas**, tabla de seis requisitos con cero acreditaciones, invalidación del dossier si cambia cualquier fuente o declaración, exportación local voluntaria `.gate23` y verificación posterior. No se modifican bases de datos, almacenamiento operativo, sesiones, puntuaciones ni PWA.
9. `tests/i23-external-evidence-fixture.cjs`, `tests/i23-external-evidence-contract.test.cjs` y `tests/i23-external-evidence-browser.test.cjs`: pruebas completamente ficticias A/B/C. Cobertura de copias supuestamente retenidas por custodios distintos, declaración de conservación anterior no verificable, seis requisitos sin aprobar, archivos duplicados, grupos/alias correlacionados, versiones I22 rivales, sustitución íntegra del documento y todos sus SHA, discrepancias frente al PIN previo, documentos corruptos retenidos, origen falso, claves rechazadas, sujetos cruzados, timestamps/consentimiento/aprobaciones forjados y concurrencia de verificación solo lectura.
10. `.github/workflows/integracion-i23-lab.yml`: dos jobs de GitHub Actions, Node CP-020/FGB y regresiones I11–I22 e I23, WebKit móvil Linux emulado y Chromium escritorio mediante HTTPS localhost y bloqueo de todas las redes ajenas.

## Reglas de evidencia y límites permanentes

- Un hash SHA en I23 es un cálculo de la representación JSON serializada, **no necesariamente de los bytes crudos originales** de un fichero que fue importado y parseado.
- Aunque dos documentos y sus hashes coincidan en más de una posición, la similitud no demuestra autenticidad, independencia humana, procedencia externa previa, fecha ni inmutabilidad.
- Una supuesta referencia `claimed-offline`, grupo `group-a`, alias A/B/C o `preIncidentClaimed:true` se conserva como **declaración del usuario**, no como evidencia externa corroborada.
- El SHA de un sobre `.gate23` calculado o aportado por la misma persona no descarta una sustitución coordinada ni permite re-root, restauración o aprobación de resultados.
- No hay acceso a custodios físicos reales, hardware WORM, sellado temporal externo, certificados de firma de quienes custodian, identidades de administradores, repositorios operativos ni autoridades independientes. **Ninguna capacidad puede simular pruebas físicas o humanas inexistentes.**
- Solo pruebas y datos sintéticos A/B/C. Sin servicios, mensajes, llamadas, producción, fusiones, despliegues ni modificaciones de la PWA existente.

## Gating CI, checkpoint y continuidad

Acreditar primero el SHA funcional exacto y las CI `push` y `pull_request` en 2/2 jobs cada una. Registrar entonces `BOWLING-I23-CP-001` en este documento, incluyendo diagnóstico de cualquier fallo real, que origine un commit documental nuevo. **Exigir otra vez 2/2 jobs de push y PR sobre el HEAD documental final** antes de cerrar el checkpoint. El cierre y la preparación de I24 se anotarán **solo en el cuerpo de la PR**, sin modificar de nuevo su HEAD.

I23 debe permanecer OPEN/DRAFT/UNMERGED en nueva PR apilada sobre PR #44. Las modificaciones admisibles se limitan exclusivamente a archivos I23 nuevos. La fusión anterior de PR #41 en `main` y la PR #43 de auditoría PWA son independientes y deben mantenerse sin alterar. No declarar que el LAB demuestra Safari físico, identidad humana, custodia externa real o integración visual con el `main` vigente.

**Estado de este documento al crearlo:** desarrollo LAB añadido; pendiente verificar CI funcional y documental con evidencias reales.
