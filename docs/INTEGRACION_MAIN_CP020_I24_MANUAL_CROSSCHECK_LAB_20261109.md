# MI BOWLING · LAB I24 · Contraste manual externo sin promoción de confianza

**Orden:** BOWLING-INTEGRACION-CP020-I24-20261109  
**Fecha:** 09/11/2026  
**Base técnica recuperada:** PR [#45](https://github.com/josegude-ux/Mi-Bowling/pull/45), checkpoint `BOWLING-I23-CP-001`, HEAD documental `2cf4abb2e99378449c4c3446b3dee6ac7fc9aa3e`, código funcional `a89bb4e45ca6f00cc26a16c2d222bd40fe2f06ae`.  
**CI definitivas I23 comprobadas:** [push 42700765586](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42700765586), [PR 42700777085](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42700777085), ambas SUCCESS 2/2 sobre HEAD documental.  
**Estado real I23 al recuperar:** PR #45 CLOSED/MERGED por operación previa ajena a I24; la rama I23 conserva exactamente el HEAD documental anterior. No se revierte ni duplica la fusión.  
**Búsqueda inicial I24:** sin rama ni PR existente. Rama de trabajo nueva `feature/integracion-main-auth-i24-lab-20261109` desde el HEAD I23 exacto; no desde `main`.  
**`main` comprobado:** `a52d712e0e9138e53a8979a904c7d33c93905c7e` con las fusiones externas previas #41 (diseño visual) y #43 (auditoría PWA).

## Problema y contrato

I23 conserva originales sintéticos y exige seis evidencias para una eventual verificación verdaderamente externa, sin certificar ninguna. I24 permite registrar **las distintas declaraciones A/B/C sobre cada requisito**, calcular coherencia, contradicción y duplicidad y mantener un dossier que siempre conserva el conflicto como no resuelto. No dispone de servicios reales, identidad autenticada de revisores, sellos temporales, WORM, un repositorio de hashes externamente custodiado, firma humana ni autoridad de aprobación. Por tanto, **nunca** puede transformar un visto bueno del formulario en prueba auténtica.

Las seis comprobaciones manuales son: (1) raíz SHA históricamente conservada fuera del expediente, (2) identidad real/control del custodio, (3) conservación auténtica anterior al incidente, (4) anclaje temporal fiable independiente, (5) inmutabilidad física/WORM y (6) decisión humana realmente autorizada bajo política externa. Cada requisito permanece `satisfied:false` y `status:not-verified-outside-lab`, incluso cuando todos los archivos A/B/C declaran coincidencia.

## Desarrollo nuevo aislado

- `lab/i24-manual-crosscheck.js`: motor de solo lectura y contrato cerrado sobre un dossier I23 que pasa `I23.verify` y PIN opcional para contraste aritmético. Seis fichas en orden fijo, cada una con tres posiciones A/B/C. Cada posición admite ausencia o una declaración `{slot,verdict,referenceDigest,origin}` con `verdict`: `claimed-match`, `claimed-conflict`, `unresolved`; `origin`: `same-document`, `claimed-independent`, `unknown`; SHA opcional. Todos los campos se consideran afirmaciones **no verificadas**.
- Conserva el contenido de entrada exacto dentro de la representación JSON y un digest de cada ficha, clasifica declaraciones inválidas, positivas, negativas, discrepantes, ausentes y referencias duplicadas. Los estados de comparación son `quarantine-invalid-claims`, `quarantine-manual-disagreement`, `hold-positive-claims-unverified` o `hold-no-independent-proof`; ninguno autoriza resolución por mayoría, recuperación ni publicación.
- Registro encadenado de eventos `six-axis-assessment-held` y anotación opcional `outside-review-noted-not-sent`. Anotar revisión **no envía ninguna solicitud** y se rechaza un segundo registro. `verify` recalcula requisitos y huellas desde el dossier original y rechaza manipulación de declaraciones, trazas, estados, falsa custodia o autorización.
- Invariantes permanentes: `authority:'none'`, `operationalApproval:false`, `independentCustodyProven:false`, `identityProven:false`, `preincidentRetentionProven:false`, `trustedTimeProven:false`, `immutabilityProven:false`, `externalApprovalProven:false`, `jointReplacementExcluded:false`, `outsideReviewContacted:false`, `reRootAuthorized:false`, `noWrites:true`, `containsScores:false`.
- `lab/integracion-main-auth-i24.html` y `lab/i24-ui.js`: pantalla LAB responsive para seis requisitos y hasta dieciocho declaraciones A/B/C, referencias SHA opcionales, comparación y matriz con acreditación externa siempre pendiente. CSP `connect-src 'none'`; ningún servicio, cuenta real o IndexedDB. Cambiar cualquier origen invalida el dossier actual. Exportación local voluntaria `.review24` y posterior revalidación con SHA opcional aportado, nunca autenticado.
- `tests/i24-manual-crosscheck-fixture.cjs`, `tests/i24-manual-crosscheck-contract.test.cjs`, `tests/i24-manual-crosscheck-browser.test.cjs`: datos A/B/C ficticios, seis afirmaciones positivas sin prueba externa, contradicciones, copias de SHA correlacionadas, entradas malformadas y cruzadas, pérdida de fuentes, sustitución conjunta de expediente y hash, falsos permisos/requisitos, adulteración de eventos, prueba de concurrencia sin escrituras. Test de navegador mediante HTTPS loopback privado con tráfico externo bloqueado en WebKit Linux móvil emulado y Chromium escritorio; no equivale a Safari en iPhone físico.
- `.github/workflows/integracion-i24-lab.yml`: dos jobs Actions, Node con CP-020/FGB, regresiones I11–I23 e I24 adversarial; y navegador WebKit/Chromium en LAB.

## Limitaciones explícitas

La igualdad SHA en el contrato se calcula sobre una serialización JSON, no demuestra identidad de bytes originales ni procedencia previa. Una huella introducida puede proceder del mismo atacante que controla el expediente; A/B/C no implican custodios humanos independientes. Una marca `claimed-independent` o `claimed-match` es solo texto de revisión, no una certificación. Incluso con las seis respuestas positivas, los seis controles permanecen **sin acreditar** y el sistema mantiene `jointReplacementExcluded:false`.

Ningún trámite externo puede simularse como ejecutado. Los campos nunca constituyen firma, correo enviado, aceptación legal, privilegio, recuperación, root, autenticidad de tiempo o evidencia WORM. No hay escrituras en la PWA de producción, datos de personas ni comunicaciones a terceros.

## Cierre de checkpoint

Conservar íntegros `main`, FGB CP-020, las fusiones externas de las PR #41/#43, PWA publicada y todas las PR. La PR nueva I24 debe permanecer OPEN/DRAFT/UNMERGED sobre la rama I23; exclusivamente archivos nuevos I24. Verificar primero CI funcional de `push` y `pull_request` con **ambos trabajos SUCCESS en el mismo SHA**. Registrar en este documento el checkpoint `BOWLING-I24-CP-001` con SHA, logs y límites. Esto creará un HEAD documental distinto, que requerirá una segunda CI `push` y PR, **ambas 2/2 en el HEAD definitivo**. Añadir cierre y continuidad I25 únicamente al cuerpo de la PR para no crear commits tras el último gate.

**Estado de esta revisión inicial:** desarrollo LAB añadido; CI y checkpoint sujetos a verificación, sin declaración anticipada de éxito.
