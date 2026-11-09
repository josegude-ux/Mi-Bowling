# MI BOWLING · LAB I20 · Preservar revisiones I19 rivales y escalar solo hacia revisión externa

**Orden:** BOWLING-INTEGRACION-CP020-I20-20261109  
**Fecha:** 09/11/2026.  
**Base recuperada y validada:** PR [#39](https://github.com/josegude-ux/Mi-Bowling/pull/39), checkpoint `BOWLING-I19-CP-001`; HEAD documental `6f5e22d53812f434f8609edd9bf8bbff091fa891`, SHA funcional `4ed8589c6cf7a065537a5f5abab1cef6d041d549`.  
**CI de base acreditada:** [push 42677564701](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42677564701) y [pull_request 42677578330](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42677578330): ambas completed SUCCESS **2/2** en el HEAD documental I19.  
**Rama I20:** `feature/integracion-main-auth-i20-lab-20261109`, creada desde el HEAD I19 exacto.  
**Main observado:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**Ámbito:** datos, claves y alias estrictamente ficticios A/B/C, sin usuarios reales, red externa, merges, publicación ni escrituras sobre la aplicación.

## Problema y criterio de seguridad

I19 registraba revisiones lógicas sucesivas y permitía anotar una escalada *pendiente* dentro de una sola cadena. Sin embargo, dos copias de una revisión I19 pueden contener **ramas distintas** aunque ambas pasen la verificación criptográfica de hash interno; tampoco se puede concluir que dos archivos idénticos procedan de custodios o personas independientes. La comparación no debe escoger automáticamente una rama preferente ni eliminar documentos incómodos.

I20 crea un **paquete forense de discrepancias**, con todas las fuentes presentadas. Sus hashes son comprobaciones internas de coherencia; ni los archivos I19 ni los I20 están firmados por identidades humanas. La autenticidad de una marca externa retenida por un custodio independiente **no se verifica automáticamente**.

## Nuevo desarrollo de laboratorio

1. `lab/i20-rival-reviews.js`: motor offline de solo lectura que exige un expediente I18 íntegro, un SHA I18 opcional **aportado externamente** y tres posiciones lógicas de revisión I19 A/B/C. Cada posición puede estar ausente o contener un documento `{slot,review}`. Verifica las estructuras I19 mediante `I19.verify`, conserva también el contenido exacto aportado cuando no supera la verificación y registra el digest de cada entrada.
2. Compara los hashes de los eventos I19 en sus prefijos compartidos. Cuando aparecen registros I19 distintos en la misma secuencia, clasifica `quarantine-divergent`; si una copia es inválida, `quarantine-unverifiable`; si hay varias copias internamente idénticas, `hold-duplicate-claims`; con menos de dos copias válidas, `hold-insufficient`; en los demás casos `hold-compatible-conditional`. **Ninguna** clasificación otorga permiso, resuelve una disputa o acredita independencia.
3. El paquete conserva el expediente I18 íntegro, las tres posiciones I19 sin reescritura, su índice y hash de evidencias, la clasificación, hallazgos y un registro encadenado de la comparación. Una solicitud de revisión externa solo agrega un evento `outside-review-requested`, marcado `external-review-requested`. **No envía** dicha solicitud ni modifica derechos o registros reales.
4. `verify` recalcula los SHA y la comparación desde las fuentes originales y rechaza cambios en documentos, pérdidas, cambios de diagnóstico, alteraciones en la traza, aprobaciones falsas y sustituciones de un documento propietario. También admite SHA del paquete, **solo si procede de una fuente conservada realmente fuera del paquete**; no se afirma inmutabilidad del propio fichero.
5. Controles que siempre deben ser falsos: `operationalApproval`, `trustedHumanReviewProven`, `independentCustodiansProven`, `timestampProven`, `immutableStorageProven`, `recencyProven`, `reRootAuthorized`, `containsScores`. La autoridad permanece `none` y `noWrites:true`.
6. `lab/integracion-main-auth-i20.html` y `lab/i20-ui.js`: interfaz LAB responsive y CSP sin red externa, importación de `.hold18` y tres `.review19`, botón de comparación, de anotación de solicitud externa **no enviada**, descarga voluntaria `.hold20` y posterior revisión del paquete con SHA externo opcional. Cambiar una fuente invalida el resultado anterior. No se usan sesiones reales, bases de datos ni IndexedDB.
7. `tests/i20-rival-fixture.cjs`, `tests/i20-rival-contract.test.cjs` y `tests/i20-rival-browser.test.cjs`: datos sintéticos A/B/C, cadenas I19 bifurcadas, prefijos válidos e incompletos, documentos idénticos, archivos faltantes o inválidos y pérdida total de confianza I18. Pruebas de manipulación de la traza, de falsa aprobación, de sustitución de documentos, de identidad cruzada, de SHA externo incorrecto y de concurrencia; WebKit Linux móvil emulado y Chromium escritorio con HTTPS loopback y red ajena bloqueada.

## Criterios adversariales de aceptación

- Las ramas I19 distintas pero verificables se preservan **ambas**, sin escoger una; un tercer archivo idéntico a uno de ellos no constituye mayoría humana o legal.
- Dos archivos exactos no demuestran independencia; los prefijos compatibles no acreditan frescura ni que no exista una rama más reciente fuera del LAB.
- Toda evidencia ausente, malformada o alterada queda clasificada o rechazada conservadoramente, sin tratarla como prueba suficiente.
- Un atacante que reescriba el archivo I20 y todos sus hashes puede producir consistencia interna. Un PIN SHA realmente retenido fuera del fichero es necesario para detectar sustituciones completas; I20 no valida su procedencia, fecha ni control físico.
- Solo una **solicitud anotada localmente**, nunca contacto con custodios reales, restauración, publicación ni firmas de aprobación.
- Las pruebas no deben escribir en `main`, FGB CP-020, producción ni PR anteriores.

## Límites permanentes

El nombre A/B/C describe archivos ficticios y no seres humanos. El sistema no comprueba independencia humana, titularidad de claves, WORM, testigos, firmas legales, sellos temporales, conservación en un medio externo, procedimiento jurídico ni disponibilidad del último PIN exterior. Una historia de hash verificable no equivale a evidencia de custodia real. Los archivos I20 no son una autorización ni una recuperación de acceso o puntuaciones.

## CI, checkpoint y continuidad

`.github/workflows/integracion-i20-lab.yml`: contratos protegidos CP-020/FGB, regresiones I11–I19, Node I20 adversarial, WebKit móvil emulado y Chromium escritorio, usando únicamente A/B/C. La PR I20 debe ser **draft** apilada sobre PR #39. El cierre se hará en dos pasos: CI del SHA funcional exacto, documentación de `BOWLING-I20-CP-001` con datos reales, nueva CI del HEAD documental y publicación del estado final **solo en la descripción de la PR**, para no generar otro commit tras la validación.

**Estado inicial:** pendiente ejecutar CI, comprobar archivo por archivo la comparación GitHub (solo añadidos), verificar `main`, PR anteriores y registrar SHAs reales. No iniciar I21 ni fusionar o publicar sin una nueva orden.
