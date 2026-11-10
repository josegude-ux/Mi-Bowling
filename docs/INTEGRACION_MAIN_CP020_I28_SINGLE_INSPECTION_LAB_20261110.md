# MI BOWLING · I28 LAB · Inspección única en expedientes recién creados

**Orden:** BOWLING-INTEGRACION-CP020-I28-20261110  
**Base exacta:** BOWLING-I27-CP-001; PR #50 OPEN/DRAFT/UNMERGED; HEAD documental `b2a633002d47c690bef98a5ec9d67df5686ac64a`.  
**CI I27 base:** funcional push 42721586613 / PR 42721597932 y documental push 42722346160 / PR 42722356194, todas SUCCESS 2/2 en sus correspondientes SHAs exactos.  
**Main leído al inicio I28:** `699d877d5ec4f3891ac6c24504a57605105bfb2d`. No es la base de I28; no se modifica ni se reclasifican fusiones externas.

## Motivo y límite de la optimización

I25 prepara un expediente usando `inspect()`, que realiza parsing JSON y verificación interna por etapa. I26/I27 llaman después a `I25.verify()`, que vuelve a ejecutar `inspect()` sobre **los mismos textos recién importados**, duplicando trabajo de comprobación. I28 crea una vía para **expedientes nuevos en memoria** con exactamente una inspección, conservando intactos los métodos clásicos `I25.prepare`, `I25.verify` y `I25.noteReview` y los contratos I18–I27. El archivo I25 tiene únicamente una nueva API compatible `prepareCheckedOnce` en la rama LAB I28. Esto **no elimina el parsing completo del JSON ni demuestra menor pico real de RAM**.

Se copia la lista de textos y SHA declarativos en arreglos congelados antes de la operación asincrónica; la misma implementación `inspect()` original valida el contenido. El objeto resultante reproduce el formato, resumen, eventos y digest de `I25.prepare` y se comprueba mediante pruebas A/B/C que coincide con el flujo I27 en el mismo fixture. **Un expediente reimportado, alterado o recibido desde fuera SIEMPRE necesita `I25.verify` completo**; no está permitido emplear el atajo I28 para dar autoridad o custodia a un original externo. El contrato de “inspección validada en construcción” no equivale a verificación de original independiente.

## Archivos y seguridad

- `lab/i25-retention-audit.js`: adición de `prepareCheckedOnce`; no se sustituye el comportamiento previo.
- `lab/i28-efficiency.js`: mantiene lectura estricta I26, preflight I27 y presupuestos 4/8 MiB (32 KiB) o 12/28 MiB (128 KiB). Resumen de muestras `heapUsed` con memoria auxiliar O(1): solo mínimo, máximo y contador, sin almacenar cada muestra. Al superar presión observada, plazo o cancelación, se rechaza el análisis sin devolver éxito.
- `lab/integracion-main-auth-i28.html`, `lab/i28-ui.js`: pantalla LAB separada, CSP sin `connect-src`, importación y exportación solo local por iniciativa del usuario, invalidación de resultados obsoletos, sin IndexedDB, cuentas, servicios, PWA ni producción.
- `tests/i28-efficiency-fixture.cjs`, `tests/i28-efficiency-contract.test.cjs`: únicamente A/B/C ficticios; compara `JSON.parse` total instrumentado sobre idéntico input/VM para demostrar **reducción de trabajo**, no un porcentaje universal de aceleración. Compara digest y serialización completos, y valida posteriormente mediante `I25.verify` tradicional; además cancelación, presupuestos, UTF-8 erróneo, expedientes malformados, reclamaciones SHA falsas, deadline y muestras de presión.
- `tests/i28-efficiency-browser.test.cjs`: WebKit Linux con viewport móvil y Chromium escritorio sobre HTTPS localhost con bloqueo de red exterior; **no** es Safari/iPhone físico.
- `.github/workflows/integracion-i28-lab.yml`: CI FGB CP-020 + regresiones I11–I27 y contratos I28, Node y navegador por separado, con dos trabajos exigidos en cada ejecución push/PR.

## Riesgos, garantías que NO se ofrecen

`heapUsed` es un dato del proceso Node del runner, no memoria física del dispositivo, RSS o pico real. Los tamaños de entrada y fragmento **no son un techo RAM**. Los tiempos monotónicos no son sellos fiables. La copia de expediente y SHA por un mismo origen puede ser internamente coherente y seguir siendo falsa. A/B/C son alias sintéticos: **sin acreditación real de custodia, identidad, autoridad, independencia, fecha, WORM, inmutabilidad o aprobación**. Una llamada externa a la vía optimizada sería un uso incorrecto del contrato: el control I25.verify íntegro continúa disponible y exigido para sobres externos. Sin llamadas a servicios reales y sin datos de usuarios.

## Condición de aceptación y checkpoint

1. Comparar I28 contra `b2a633002d47c690bef98a5ec9d67df5686ac64a`, comprobar que los únicos archivos anteriores tocados están limitados al añadido compatible `prepareCheckedOnce` en el I25 de esta rama aislada. No editar `main`, `sw.js`, `app.js`, FGB CP-020, datos reales ni otras PR.
2. Exigir **CI funcional push y PR SUCCESS 2/2 en el mismo SHA**: regresiones I11–I27, FGB, tests I28 A/B/C, WebKit y Chromium. Si falla alguna, corregir y reprobar, conservando el historial. No declarar rendimientos universales.
3. Registrar aquí `BOWLING-I28-CP-001` con SHA funcional y prueba objetiva. El commit documental resultante requiere **nuevas CI push y PR SUCCESS 2/2** sobre el HEAD documental exacto antes de cierre definitivo.
4. Cerrar **solo en el cuerpo de la nueva PR draft**, después de comprobar ambos SHAs; ningún commit tras las CI finales. Sin merge, publicación ni despliegue.

**Estado inicial:** I28 LAB en desarrollo; checkpoint `BOWLING-I28-CP-001` no cerrado hasta pruebas verificables.

## Checkpoint funcional verificado · BOWLING-I28-CP-001 (pendiente de cierre documental)

**SHA funcional I28 exacto:** `b52a07a41e862083cca4d825f0408ab3fa68bef4`.

**CI funcional en ese mismo SHA, ambas COMPLETED/SUCCESS 2/2 jobs:**
- [Push 42790103380](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42790103380) — `push`, **SUCCESS 2/2**, jobs Node y WebKit/Chromium.
- [PR 42790223057](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42790223057) — `pull_request`, **SUCCESS 2/2**, jobs Node y WebKit/Chromium.
- [Regresión adicional I25 PR 42790222929](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42790222929) — **SUCCESS 2/2** sobre el mismo SHA por ampliación compatible de `lab/i25-retention-audit.js`.

**Evidencia funcional:** FGB CP-020 **PASS 31 eventos** (10 gallegos, 21 nacionales); regresiones I11–I27; `PASS I28 Node` con equivalencia de digest y serialización de sobres I25 A/B/C y `I25.verify` preservado para expedientes externos. En el fixture idéntico y el mismo VM se contabilizaron **14 llamadas `JSON.parse` I27 frente a 7 I28 (50 % menos llamadas en esta prueba)**, sin extrapolarlo a reducción de tiempo o RAM. Nodo `push`: ejemplo de observaciones del runner, entrada 6.449.260 bytes, 200 fragmentos, 557,528 ms y `heapUsed` muestreado de 50.703.352 a 71.442.472 bytes; **no** son valores de memoria del iPhone ni medidas comparables universalmente. Cancelación, presión muestreada, importaciones truncadas/UTF-8 inválido y recuperación sin sobre de éxito parcial probadas.

Pruebas de navegador en PR: `PASS I27 webkit`, `PASS I27 chromium`, `PASS I28 webkit`, `PASS I28 chromium`; WebKit Linux en viewport móvil emulado y Chromium escritorio en HTTPS local. Ninguna validación real de Safari/iPhone ni de custodia/identidad/tiempo/autoridad externa.

**Comparación funcional I28 vs I27 HEAD** `b2a633002d47c690bef98a5ec9d67df5686ac64a`: **8 archivos añadidos, uno modificado (únicamente nueva API I25 de LAB), 0 eliminados**, 10 commits adelante/0 detrás. `main` preservado `699d877d5ec4f3891ac6c24504a57605105bfb2d`. PR #55 permanece OPEN/DRAFT/UNMERGED. FGB CP-020, `app.js`, `sw.js`, PWA, datos reales y producción sin tocar desde I28.

**Gate documental abierto:** este añadido documental genera un **nuevo HEAD**. Se requieren las nuevas CI **push y pull_request SUCCESS 2/2 en ese mismo SHA documental**. No declarar cerrado definitivamente `BOWLING-I28-CP-001` hasta comprobarlas. Entonces registrar exclusivamente en el cuerpo de PR #55 el cierre y la continuidad, sin otro commit. Sin fusiones ni publicación.
