# MI BOWLING · LAB I22 · Matriz de incertidumbre sobre procedencia externa

**Orden de desarrollo:** BOWLING-INTEGRACION-CP020-I22-20261109  
**Fecha:** 09/11/2026  
**Base verificada antes de actuar:** PR [#42](https://github.com/josegude-ux/Mi-Bowling/pull/42), OPEN/DRAFT/UNMERGED; checkpoint `BOWLING-I21-CP-001`, HEAD documental exacto `28edefd8b5f50c0b7e81ecd0ff72b144836537c4`, código funcional `4b02afa1fd38bf4ff1594a842c0cf2c5528eba61`.  
**CI base acreditada:** [push 42683893206](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42683893206) y [PR 42683900914](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42683900914), ambas `completed/SUCCESS 2/2` en el HEAD documental de I21.  
**I22:** rama aislada `feature/integracion-main-auth-i22-lab-20261109` creada exactamente sobre el HEAD anterior. No existía rama ni PR I22 al comenzar.  
**Estado inicial de `main`:** `1a8fe012ca6b515dcb35161c1aa5f4fa01a689f3`, incluyendo la fusión externa de la PR #41 de diseño visual (que permanece CLOSED/MERGED). **La rama I22 no nace de ese nuevo main**, ni prueba la integración de la experiencia visual publicada; está apilada sobre I21 para mantener el alcance de laboratorio y el historial de checkpoints.

## Riesgo estudiado

Las etapas I18–I21 verifican la integridad interna de expedientes sintéticos y su conservación en archivos, pero no acreditan origen histórico, sello de tiempo, independencia de custodia, control físico de un soporte ni que una huella SHA fuera retenida antes de un incidente. Si un adversario sustituye a la vez archivo y hash, ambos pueden coincidir y **no hay prueba de procedencia**. Además, tres copias iguales pueden ser tres archivos de una sola persona, no tres custodios.

I22 desarrolla una matriz explícita de incertidumbre, impide convertir la comparación SHA en permiso de operación y preserva documentos concurrentes, incluyendo discrepantes, dañados o ausentes.

## Desarrollo ejecutado (aislado)

1. `lab/i22-uncertainty-matrix.js`: contrato JS offline que exige un sobre I21 `source` que pase `I21.verify`, un SHA supuesto externo opcional —solo para contraste— y un vector de tres posiciones lógicas A/B/C. Una posición es `null` o `{slot,caseFile,claimedDigest,origin}`. `origin` admite únicamente `same-file`, `claimed-separate` y `unknown`, siempre **declarados y NO autenticados**.
2. Conserva cada documento aportado dentro del sobre I22, registra su digest y contraste `caseFile.digest===claimedDigest`, comprueba el `caseFile` completo mediante I21 y distingue `internally-consistent`, `unreferenced`, `invalid-digest-claim`, `invalid-source-file`, `invalid-structure` o `missing`. Se retienen los originales inválidos, no se corrigen ni sustituyen.
3. Compara huellas de casos I21 completos y las etiquetas de `owner|caseId` declaradas en los expedientes de origen. Las diferencias se ponen en cuarentena; incluso la igualdad de propietario y SHA no acredita identidad real. Prioriza `quarantine-invalid-source`, `quarantine-parallel-forks`, `hold-duplicate-claims`, `hold-insufficient-claims` o `hold-internal-equality-only`. Ninguno supone aprobación.
4. La matriz contiene ocho dimensiones: igualdad SHA interna (`observed-on-untrusted-input` o `not-established`); autenticidad del origen (`unproven`); independencia de custodia (`unproven`); frescura histórica (`unproven`); inmutabilidad física (`unproven`); autorización operativa (`forbidden`); conservación lógica; diagnóstico sintetizado. El cálculo es determinista y se recalcula en `verify`.
5. La traza hash `hold-recorded` admite una sola anotación adicional `outside-review-recorded` mediante `requestExternalReview`, marcada `outside-review-recorded-not-sent`. **No se contacta a nadie**, no se otorgan permisos, no se decide custodia y no se crean nuevas raíces confiables.
6. Invariantes permanentes del paquete: `authority:'none'`, `operationallyApproved:false`, `externalProvenanceProven:false`, `custodianIndependenceProven:false`, `identityProven:false`, `historicalFreshnessProven:false`, `timestampProven:false`, `immutableStorageProven:false`, `priorPinAuthenticityProven:false`, `jointReplacementExcluded:false`, `externalReviewContacted:false`, `reRootAuthorized:false`, `noWrites:true` y `containsScores:false`.
7. `lab/integracion-main-auth-i22.html` y `lab/i22-ui.js`: pantalla aislada responsive, con CSP `connect-src 'none'`, importación de fuente I21 y A/B/C, SHA opcionales que **nunca son certificados por la pantalla**, tabla de las ocho dimensiones, invalidación del cálculo ante modificaciones, descarga local exclusivamente por clic y contraste de la copia `.uncert22` con SHA aportado. Sin IndexedDB, sesiones, almacenamiento operativo, redes externas o aplicaciones publicadas.
8. `tests/i22-uncertainty-fixture.cjs`, `tests/i22-uncertainty-contract.test.cjs` y `tests/i22-uncertainty-browser.test.cjs`: pruebas A/B/C ficticias, documentos duplicados, ramas concurrentes incompatibles, sustitución conjunta con SHA coherente, supuesto PIN externo correcto o erróneo, entrada dañada, ausencia de fuentes, propietario declarado cruzado, falsa aprobación/tiempo/custodia, alteraciones de traza y matriz y verificaciones concurrentes de solo lectura. Browser: WebKit Linux móvil emulado y Chromium escritorio por HTTPS privado local.
9. `.github/workflows/integracion-i22-lab.yml`: Node CP-020/FGB y regresiones I11–I21 más ataques I22; navegador WebKit/Chromium. Solo en LAB.

## Evidencias que se mantienen explícitamente sin demostrar

Una coincidencia de SHA solo establece igualdad criptográfica del contenido **según su representación JSON serializada**, no igualdad de bytes del archivo original cuando el programa lo analizó y volvió a serializar. Ni la procedencia `claimed-separate`, ni dos etiquetas A/B/C, ni un SHA incluido en el mismo archivo demuestran independencia física/humana, anterioridad, custodia, WORM, autoría legal, veracidad de la fecha o última versión. Un supuesto PIN externo podría haberse introducido desde la misma fuente comprometida.

I22 no sustituye el procedimiento real para autenticar la identidad y la conservación independiente de evidencias. Tampoco tiene acceso a custodios verdaderos, reloj seguro, sellado externo, servicio de certificación, ni puede enviar solicitudes. Las copias A/B/C son **solamente simulaciones**. Todos los resultados conservan `operationallyApproved:false` y prohibición de re-root y publicación.

## Checkpoint funcional · BOWLING-I22-CP-001

**SHA funcional:** `90e94439d1b8b8aeac22989f18fa4f2126c71126`.  
**Push I22:** [run 42687153402](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42687153402) — **completed / SUCCESS / 2 de 2 jobs** sobre el SHA funcional exacto.  
**PR I22:** [run 42687249609](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42687249609) — creada sobre el mismo SHA; al insertar este checkpoint **Node terminado SUCCESS** y navegador **todavía in_progress en instalación WebKit**. No se declara verde esta ejecución hasta su conclusión final.  
**PR de desarrollo:** [#44](https://github.com/josegude-ux/Mi-Bowling/pull/44), OPEN/DRAFT/UNMERGED y apilada sobre PR #42 (`feature/integracion-main-auth-i21-lab-20261109`).  
**Comparación GitHub contra HEAD I21 `28edefd8b5f50c0b7e81ecd0ff72b144836537c4`:** 8 archivos I22 **todos añadidos**, ninguno anterior modificado o eliminado; 8 commits ahead/0 behind antes de este checkpoint documental.  
**`main`:** `1a8fe012ca6b515dcb35161c1aa5f4fa01a689f3`, con PR #41 visual ya fusionada por otro flujo. I22 no ha modificado `main`, `sw.js`, `index.html`, FGB CP-020, PR anteriores ni producción. La PR #43 de auditoría PWA permanece OPEN/DRAFT y es independiente del trabajo I22.

**Resultados comprobados directamente en los logs del primer workflow I22 [42686975976](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42686975976), SUCCESS 2/2**, y realizados también por la CI funcional `push 42687153402`: CP-020/FGB **PASS 31 eventos (10 gallegos, 21 nacionales)** y regresiones I11–I21; I22 Node **PASS** ante copias A/B/C duplicadas, fuentes I21 concurrentes, reemplazo conjunto, falsificación de procedencia/tiempo/aprobación y ausencia de custodia real; I22 WebKit móvil emulado y Chromium escritorio **PASS**, comparación SHA no equiparada a custodia, descarga local voluntaria, sin IndexedDB ni red externa.

**Limitación explícita:** hashes calculados de representaciones JSON; no constituyen por sí mismos prueba de bytes crudos originales, autoría, procedencia independiente, custodia física, sello temporal, WORM ni inmutabilidad. `authority:'none'`, `operationallyApproved:false` y `externalReviewContacted:false` siguen obligatorios. A/B/C no son personas verificadas.

**Validación definitiva pendiente:** el commit documental de este checkpoint origina HEAD nuevo. Se deben verificar ambas CI (`push` y `pull_request`) con 2/2 jobs en ese HEAD. Si GitHub Actions impide programar o completar trabajos, registrar el bloqueo como tal, sin inventar aprobación. Actualizar el cierre y preparación I23 exclusivamente en la descripción de la PR #44 para no crear otro commit tras las pruebas.

## CI y cierre de checkpoint

El desarrollo I22 debe mantenerse apilado sobre la PR #42 y su HEAD documental I21, sin editar ni borrar archivos de I11–I21, FGB CP-020, `main`, producción o la PR #41 fusionada por otro flujo. Se requiere verificar la comparación GitHub exacta contra el padre I21, obtener CI completa **2/2 en push y PR** en el SHA funcional, registrar `BOWLING-I22-CP-001` con evidencias precisas, y finalmente validar nuevas CI sobre el HEAD documental resultante. El cierre y la preparación de I23 se anotarán **solo en la descripción de la nueva PR**, sin generar un commit posterior a las CI.

**Situación de este documento antes de la verificación:** pruebas y SHAs definitivos pendientes; no se declarará una CI satisfactoria sin consultar GitHub Actions.
