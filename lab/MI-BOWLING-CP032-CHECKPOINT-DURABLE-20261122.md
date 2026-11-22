# MI BOWLING · CP032 · Checkpoint 005 · Coordinación duradera v2/PDF/v3
**ID:** MI-BOWLING-CP032-CHECKPOINT-DURABLE-20261122-005  
**Fecha:** 22/11/2026 · exclusivamente LAB · **NO GO producción**

## Continuidad y referencias

- Proyecto: `josegude-ux/Mi-Bowling`.
- Base exacta: checkpoint `MI-BOWLING-CP032-CHECKPOINT-WEBLOCKS-CP004-20261122-004`, HEAD `d8fcae37d141ed9175c688ff724936577fce6313`, run `45033113588` SUCCESS.
- Misma rama: `lab/cp032-registro-compacto-v3-20261122` (no crear LAB paralelo).
- Código de esta fase, probado: `c8c25d5f2d9c8b9c5183646726c84a203db331d2`.
- Producción: `main` `1fdef63467a980db9a596e3c2c102199ef686022`, PWA `3.3.13-prueba` **sin cambios**.
- No se han realizado merges, publicaciones, despliegues ni accesos a datos personales.

## Alcance técnico exacto

1. `lab/cp032-durable-coordinator.js`: journal persistente **sintético** en la nueva base `mi-bowling-cp032-synthetic-coordinate-v1`, con registro firmado mediante SHA-256 del estado v2/PDF anterior y destino, revisión v3 anterior, documento v3 deseado y huella de CacheStorage ficticia.
2. El coordinador obliga a disponer del Web Lock original `mi-bowling-f1-exclusive-writer-v1`, del origen `localhost/127.0.0.1`, `isSecureContext` y del indicador `?cp032lab=ficticio`; rechaza la existencia de claves personales `mi-bowling-*`.
3. Orden de operación: validar y guardar intención duradera; confirmar sidecar v3 con journal; usar el módulo CP004 original en un destino PDF/v2 ficticio; verificar tres capas y foto ficticia; retirar la intención únicamente tras validar.
4. Recuperación conservadora: ante interrupción con intención duradera, comprobar sello e invariantes, recuperar primero journal nativo CP004 si lo hubiera, rechazar cualquier estado externo o fotografía modificada y compensar PDF/v2 y v3 al estado original. Toda discrepancia externa se bloquea dejando intención en disco.
5. Recuperación repetida sin cambios: una vez concluida, el siguiente arranque devuelve estado `clean`. Una migración ya confirmada con intención eliminada permanece confirmada tras reinicio.
6. `lab/cp032-durable-harness.html`: arnés independiente de producción, solo localhost y datos ficticios.
7. `tests/cp032-durable-browser.cjs`: únicas pruebas nuevas. Perfiles persistentes Chromium desechables, cerrados y reabiertos físicamente con el mismo directorio del navegador; LocalStorage subyacente **solo** con claves prefijadas `cp032-fake-map:`; API CP002/CP004 sobre fachada inyectada con nombres contractuales, PDF falso en IndexedDB, sidecar y coordinador sintéticos, marcador de foto falso CacheStorage.
8. `.github/workflows/cp032-durable-crash-lab.yml`: CI en rama LAB, `contents: read`, sin secretos ni desplegar, sin tocar pruebas históricas.

## Ejecución verificada

- **Run final** [45033819426](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45033819426): `completed / success`, HEAD `c8c25d5f2d9c8b9c5183646726c84a203db331d2`.
- `CP032 RESTART PASS afterPrepare`: cierre/reapertura tras registrar intención; v2/PDF/v3 regresan exactamente al estado previo.
- `CP032 RESTART PASS afterV3`: cierre/reapertura tras confirmar sidecar; rollback con revisión monotónica y ningún bolo inventado.
- `CP032 RESTART PASS afterCP004`: cierre/reapertura tras sustituir PDF ficticio mediante CP004; compensación del PDF y v3 al estado anterior.
- `CP032 COMMITTED RESTART PASS`: operación confirmada permanece confirmada tras cerrar/reabrir perfil; sin intención pendiente.
- `CP032 CONFLICT NO GO PASS`: modificación externa ficticia de la revisión v3, rechazo de recuperación y conservación del journal sin sobrescribir la revisión ajena.
- En reapertura se probó bloqueo `navigator.locks.request(...ifAvailable:true)` a una segunda pestaña y ejecución idempotente de `recover`.
- Fotografías ficticias: marcador CacheStorage verificado intacto, **no pruebas sobre imágenes binarias reales**.
- Archivo nuevo comparado contra checkpoint 004: solo `lab/cp032-durable-coordinator.js`, `lab/cp032-durable-harness.html`, `tests/cp032-durable-browser.cjs` y workflow LAB. CP003, CP004, Cachefix2, `index.html`, `sw.js`, fotos y pruebas históricas no fueron alterados.

## Riesgos no homologados (obligatorios antes de GO producción)

- Cierre de pestaña y cierre/reapertura de perfil se ejecutaron **entre etapas ya confirmadas**; no se forzó muerte del proceso durante una transacción IDB a medio confirmar ni un corte eléctrico. No equiparar este PASS con durabilidad ante pérdida abrupta de energía.
- El protocolo es **compensatorio, no una transacción atómica interalmacenes**. Un conflicto puede requerir recuperación manual; el journal debe conservarse como evidencia y el sistema debe quedar bloqueado.
- Aún falta homologar pérdidas de cuota/espacio, corruptela de journal, concurrencia entre IDB y claves, reinicio justo durante el rollback y migración real con el arranque de la PWA.
- Las fotografías privadas se almacenan fuera de CP003/CP004: hay que conservar separado el paquete privado y comprobar su compatibilidad sin tocar fotos reales.
- El respaldo ampliado y contrato v3 productivo, Safari físico y recuperación IDB real siguen bloqueados. No alterar esquemas de producción ni importar un backup real como fixture.

## GO / NO GO

| Ámbito | Resultado |
|---|---|
| Journal duradero, tres cierres/reaperturas y bloqueo Web Locks en LAB ficticio | **GO LAB** |
| Conservación de v2, PDF y v3, fotos ficticias y recuperación idempotente | **GO LAB** |
| Detener y conservar journal ante conflicto v3 | **GO LAB** |
| Atomicidad interalmacenes o caída durante transacción IDB/rollback | **NO GO** |
| Datos reales, Safari físico, merge a main, publicación o despliegue | **NO GO** |

**Siguiente fase recomendada:** pruebas nuevas de interrupción durante escritura IDB y rollback, manipulación/corrupción de journal, saturación/quota y conflicto simultáneo v2/PDF/v3; completar boot fail-closed antes de cualquier adaptación a datos personales. Mantener exclusivamente la rama actual y no repetir las cinco pruebas de diseño ni suites CP003/CP004/Cachefix2 cerradas.
