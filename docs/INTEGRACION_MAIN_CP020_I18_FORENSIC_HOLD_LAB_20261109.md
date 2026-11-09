# MI BOWLING · I18 · Expediente forense de bloqueo y escalada manual (LAB)

**Orden:** BOWLING-INTEGRACION-CP020-I18-20261109  
**Fecha:** 09/11/2026.  
**Base verificada:** PR [#37](https://github.com/josegude-ux/Mi-Bowling/pull/37) draft, checkpoint `BOWLING-I17-CP-001`, HEAD documental `026788cb519487a681b7994c2e91b1857490d90b`, SHA funcional `81723b8dd8fde1d478eac1a6a90167a8e8ba00b0`.  
**CI I17 final verificada:** [push 42637538312](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42637538312) y [PR 42637553204](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42637553204), ambas `SUCCESS`, HEAD documental exacto.  
**Rama:** `feature/integracion-main-auth-i18-lab-20261109`, nacida del HEAD I17.  
**Main observado inicialmente:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`  
**Ámbito de seguridad:** solamente A/B/C ficticios, sin producción, cuentas reales, servicios externos, fusiones, publicaciones ni creación de nueva confianza.

## Problema real y alcance I18

En I17 se clasifican fuentes ausentes, conflictos entre custodios y bifurcaciones firmadas, pero faltaba una forma de **preservar la totalidad de los documentos examinados** y una secuencia reproducible que acredite qué decisiones computó la herramienta antes de bloquear una recuperación. Tampoco existía un expediente portátil para escalar la pérdida total de referencias a un proceso manual de investigación independiente, sin confundir un hash interno con una custodia real.

I18 aporta exclusivamente un **expediente forense portable LAB**, no una resolución automática del conflicto ni una nueva raíz. El expediente no certifica fecha, procedencia física ni autenticidad ajena a sus entradas.

## Archivos añadidos y contratos

1. `lab/i18-forensic-hold.js`: motor de solo lectura que exige identificadores UUID de caso y propietario únicamente A/B/C ficticios. Captura exactamente siete posiciones de evidencia originales: paquete I15, referencias I15, génesis y última marca I16 y tres declaraciones I17 A/B/C. Una posición perdida se registra explícitamente como `null` (no como documento recreado).
2. Para cada posición calcula SHA-256 de su representación JSON y conserva el contenido íntegro suministrado, sin reescribir ninguna de las ramas en conflicto. Los SHA de evidencia forman un índice hash del expediente. La integridad interna y el índice **no son pruebas de origen externo**: un adversario que pueda reescribir el expediente también puede recalcular sus hashes.
3. El módulo invoca `I17.reconcile` y conserva la **decisión de diagnóstico**, metadatos y la condición de verificación. En caso de rechazo criptográfico previo guarda `blocked-invalid-evidence` en vez de introducir texto de error potencialmente sensible en el fichero.
4. Un registro canónico de cinco decisiones encadenadas (`intake`, `classification`, `hold`, `manual-escalation` y `pending-review`) vincula dueño ficticio, caso, hash de evidencias y hash de decisión anterior. El hash final del expediente sirve para detectar modificaciones **si se conserva fuera del mismo archivo**. No contiene una marca horaria falsa ni una orden de desbloquear producción.
5. **Pérdida total de confianza I15:** propuesta de siguiente paso `recover-original-independent-I15-sources` que indica buscar referencias externas originales mediante personal autorizado, nunca crear PIN o raíz nuevos automáticamente. **Pérdida parcial I16:** recuperar anclas originales separadas. **Bifurcación firmada:** conservar todas las ramas A/B/C y `quarantine-all-branches`; ni se elige mayoría ni se borra la rama no seleccionada. **Coherencia condicionada:** sigue retenida para revisión independiente, no autoriza operación real.
6. El contrato de exportación prohíbe campos con nombres de contraseña, clave privada, token, secreto o semilla, limita el tamaño total y rechaza material no serializable. Las claves temporales ECDSA usadas en los ensayos permanecen en RAM de Node; la frase ficticia I11 solo se utiliza como parámetro transitorio para verificar y **nunca se añade al expediente**.
7. La función `verify` revisa integridad de cada evidencia, orden, etapas y enlaces de decisión y hash del sobre. Puede recibir un SHA-256 **obtenido externamente por el usuario** para contrastarlo; si no lo recibe, declara explícitamente `externalDigestMatched:false`, sin acreditar custodia. La función `recheck` vuelve a ejecutar I17 sobre el contenido conservado con una frase ficticia suministrada fuera del expediente.
8. `lab/integracion-main-auth-i18.html` y `lab/i18-ui.js`: interfaz independiente de solo lectura para cargar siete documentos A/B/C ficticios, diagnosticar bloqueo y preparar expediente, **descarga local explícitamente iniciada por el usuario**, contraste posterior frente a SHA guardado por separado y decisión de escalada manual. No hay conexiones externas, escritura en la aplicación publicada ni IndexedDB. La descarga local voluntaria no modifica fuentes ni producción.
9. `tests/i18-forensic-fixture.cjs`, `tests/i18-forensic-contract.test.cjs` y `tests/i18-forensic-browser.test.cjs`: casos sintéticos A/B/C, bifurcación realmente firmada, pérdida total, documentación incompleta o manipulada, cambio de decisión y autorización, huella externa errónea, secretos prohibidos, revisión múltiple concurrente, WebKit móvil emulado y Chromium escritorio.

## Matriz adversarial

- Preservación fiel de tres informes, incluyendo una rama bifurcada válida que se pone en cuarentena en vez de eliminarse.
- Expediente vacío ante pérdida total del paquete y referencias I15/I16: salida `blocked-total-trust-loss` con `authority:'none'`, `operationallyApproved:false` y sin generar PIN o política sustituta.
- Rechazo de un expediente que cambia el documento, retira una posición, reordena las decisiones, altera un hash, cambia `action` o introduce `operationallyApproved:true` o `immutableStorageProven:true`.
- Verificación opcional de huella externa independiente. Si el propio atacante controla también esa huella, **no existe protección anti-reescritura demostrada**.
- No se serializa la frase de I11 ni claves privadas. Identidades y fuentes de A/B/C no se cruzan. Verificaciones concurrentes sin mutar entradas.
- Exportación del archivo solo mediante control explícito en el navegador; evaluación y lectura no crean ningún fichero por sí mismas.

## Limitaciones y escalada operacional segura

Un archivo portable puede conservar los bytes aportados en LAB, pero su existencia y sus SHA **no prueban cadena de custodia física, hora de creación, conservación externa real, WORM, firma de un notario, titularidad de claves ni inmutabilidad**. Tampoco se prueba la ausencia de un ataque que reemplace simultáneamente el expediente, el índice y la huella externa. Las copias denominadas A/B/C siguen siendo **etiquetas lógicas de ensayo**.

Las instrucciones de escalada no envían comunicaciones, no conceden credenciales, no crean autoridad de recuperación, no restauran puntuaciones y no escriben registros operativos. Una revisión humana externa auténtica y evidencias fuera de este sistema siguen siendo requisitos para cualquier operación futura. Incluso `conditionally-consistent` conserva `operationallyApproved:false`. El endpoint de laboratorio no está publicado.

No se han realizado pruebas de Safari en iPhone físico, dispositivos reales múltiples, pérdida de electricidad, backup físico ni servicio externo de sellado temporal.

## Checkpoint funcional BOWLING-I18-CP-001

**SHA funcional exacto aprobado:** `ee59878e9e81bc89f48741750793c9cae2103743`.  
**CI real funcional:** [GitHub Actions push 42672681138](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42672681138), **SUCCESS 2/2 jobs**; [PR 42672802996](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42672802996), **SUCCESS 2/2 jobs**, ambas sobre el SHA funcional indicado.  
**PR:** [#38](https://github.com/josegude-ux/Mi-Bowling/pull/38), abierta en borrador y apilada sobre PR #37, no fusionada.  
**Comparación GitHub con I17:** ocho archivos I18 **solo añadidos** (workflow, documento, motor, UI, HTML LAB y tres tests), ningún fichero anterior cambiado o eliminado, 11 commits delante/0 detrás antes de este checkpoint documental. Base de comparación exacta `026788cb519487a681b7994c2e91b1857490d90b`.  
**Main nuevamente corroborado:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`, sin editar.

**Registros de CI funcional observados:**
- Node: PASS FGB 31 eventos (10 gallegos y 21 nacionales), contrato CP-020 y regresiones I11–I17.
- Node I18: PASS preservación exacta de evidencias cifradas, registro encadenado de cinco decisiones, cuarentena de bifurcaciones, pérdida total de confianza, escalada exclusivamente manual, alteraciones y secretos rechazados, discrepancia frente a SHA independiente aportado, revalidación, A/B/C y concurrencia de solo lectura.
- WebKit móvil emulado: PASS descarga explícita de expediente, comprobación frente a SHA externo suministrado, rechazo de copia manipulada, preservación de rama firmada, pérdida total y ausencia de IndexedDB/red externa.
- Chromium escritorio: PASS sobre los mismos controles LAB y sin claves privadas en navegador.

**Historial de CI sin ocultar fallos:** las primeras ejecuciones I18 [42672070041](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42672070041) y [42672212413](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42672212413) terminaron con conclusión `failure` porque GitHub Actions no llegó a programar el trabajo Node (solo se registró el trabajo de navegador, que sí pasó). Se cambió explícitamente el identificador del job de contratos Node y se repitieron ambas ejecuciones funcionales para demostrar **dos jobs ejecutados y aprobados**, sin atribuir éxito a las anteriores.

**Advertencia de interpretación:** los SHA solo identifican bytes de documentos recibidos y relaciones dentro del expediente. No acreditan autoría externa, tiempo real, custodia independiente ni almacenamiento inmutable; ninguna copia es promovida a raíz auténtica cuando falta el PIN externo. Un atacante con control de todos los documentos y de la referencia externa podría sustituir el expediente.

**CI de HEAD documental:** al actualizar este checkpoint se origina un commit documental distinto. Solo debe declararse definitivo cuando GitHub registre la CI de ambos jobs sobre ese SHA exacto.

## CI y continuidad

`.github/workflows/integracion-i18-lab.yml`: dos jobs (Node CP-020/FGB e I11–I18; navegador WebKit Linux móvil emulado y Chromium escritorio, HTTPS loopback privado). **No modificar ni fusionar** PR anteriores, `main`, producción, plataforma publicada, calendario FGB CP-020 ni servicios.

Registrar el SHA funcional preciso únicamente tras ver la CI en GitHub; añadir `BOWLING-I18-CP-001` y verificar después de nuevo la CI del HEAD documental final. No se considerará aprobada una prueba fallida. Mantener la PR I18 draft apilada sobre #37.
