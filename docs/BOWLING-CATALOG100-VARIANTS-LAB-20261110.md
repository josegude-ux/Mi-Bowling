# BOWLING-CATALOG100-VARIANTS-LAB-CP-001 · Protección de variantes y transferencia

**Fase aislada desde PR #57, CP-001 definitivo y HEAD `c470b44519caf6f27a89d90498a659d573cdb498`. Estado: LAB FUNCIONAL VERIFICADO; CIERRE DOCUMENTAL PENDIENTE. No merge, deploy ni modificación de PR #57, PR #53 o main.**

## Defecto verificable: una coincidencia de nombre no prueba la misma bola

En el código CP-001, `arsenal-view-lab.js` mostraba «Registrada en Mis bolas» si coincidían marca/modelo, mientras `app.js` cancelaba silenciosamente el alta del mismo nombre. Los nombres comerciales pueden repetirse entre ediciones y dos unidades físicas pueden tener taladros/pesos distintos. La plantilla no conoce SKU, peso real ni layout del usuario. La ausencia de información **no equivale a una identidad técnica confirmada**.

**Cambio exclusivamente LAB:**
- Módulo sin persistencia `catalogo100-variant-policy.js` clasifica coincidencias de nombre como `name-collision`, **nunca** como variante técnica confirmada; exporta planificación separando `add` y `review`.
- En panel de 100, las coincidencias indican explícitamente la duda de edición/peso/SKU/unidad y abren alta **manual** para una unidad distinta. No se copia ninguna nota, foto, peso o ficha técnica ni se modifica la unidad existente.
- Importación JSON: declaración de que el archivo no acredita origen ni variantes; cuenta altas nuevas y coincidencias que no se importan, pide confirmación expresa. La selección para partidas permanece distinta de marcar en la plantilla.
- Se conserva `mi-bowling-analitica-v2`, `mi-bowling-ball-selection-v1`, `db.version=2`, el histórico, la protección frente a otra pestaña/cuota, PWA CP-037 y FGB CP-020. `sw.js` y `catalogo-bolas/index.html` intocados.
- Prueba nueva exclusivamente de regresión de identidad (edición antigua Code Black vs nombre 2026; Team Brunswick genérico vs color White SKU), alta manual, importación A/B/C ficticia y conservación de sesiones y selección. No se repiten suites cerradas de PR #57.

## Fuentes primarias y límites de fichas PR #53 (no tocar)

- MOTIV oficial `https://www.motivbowling.com/products/balls/medium-oil/nebula.html` es **Nebula de 2025, SKU MTVBNBORG**; no acredita **Orion Nebula de 2026, SKU MTVBNBORN**, su superficie LSP/LSS o parámetros por peso. Comercios de preventa no sustituyen hoja técnica del fabricante.
- Brunswick `https://brunswickbowling.com/products/balls/current/team-brunswick-white` identifica **Team Brunswick White** SKU **60-400652-93X**, cubierta poliéster y pesos comerciales. USBC `https://bowl.com/approved-ball-list` presenta la entrada genérica **Team Brunswick**. Sin vínculo oficial inequívoco color/SKU con aprobación: **no confirmar identidad de esa entrada**.
- Todas las diez fichas pendientes se mantienen pendientes: **10/20 nivel A, 10/20 pendientes**. No trasladar RG, diferencial, núcleo, acabados, fotografías ni títulos históricos de modelos similares.
- La plantilla independiente puede utilizar un origen de almacenamiento distinto de la PWA instalada. El JSON exportado/importado es una **transferencia explícita local**, no sincronización, ni firma de procedencia.
- No se han efectuado pruebas en Safari de iPhone físico, no se han contactado fabricantes, no hay autorización para fotografías comerciales. Ninguna prueba de usabilidad en emulador certifica compatibilidad de instalación en iOS.

## Gates nuevos de esta fase (sin reabrir CP-001)

`BOWLING-CATALOG100-VARIANTS-LAB-CP-001` queda pendiente hasta confirmar para la PR sucesora, sobre SHA exacto, **CI push/PR static+browser SUCCESS 2/2**. Si se valida el código, añadir cierre documental en una nueva revisión y volver a verificar CI exacta; cerrar definitivamente solo en cuerpo de nueva PR LAB sin un commit posterior. No fusionar con #57 ni #53.


## Gate funcional verificado · 10/11/2026

**Verificación exacta con GitHub Actions, sin reejecuciones manuales.** En la **PR #58**, rama `lab/catalogo100-variant-identity-20261110`, base de PR `lab/catalogo100-mis-bolas-integracion-20261110` (HEAD de PR #57 `c470b44519caf6f27a89d90498a659d573cdb498`), el HEAD funcional `5f642ebee754a1288053985e219f57c09104bb47` ha aprobado ambas ejecuciones:

| Evento | GitHub Actions | Resultado |
|---|---|---|
| push | [42854378127](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42854378127) | **COMPLETED SUCCESS 2/2**, Node y Chromium/WebKit emulados |
| pull_request | [42855129984](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42855129984) | **COMPLETED SUCCESS 2/2**, Node y Chromium/WebKit emulados |

La ejecución `pull_request` apareció posteriormente al comentario provisional [6772927513](https://github.com/josegude-ux/Mi-Bowling/pull/58#issuecomment-6772927513), que registraba honestamente su ausencia durante la consulta anterior. El bloqueo funcional **se considera resuelto**, sin modificación de `main`, rama base, PR #57 o duplicación de PR; se conserva el comentario como histórico, no como diagnóstico actual. Las CI funcionales prueban únicamente la nueva política de colisiones por nombre, altas manuales y transferencia JSON con datos ficticios; NO prueban licencias, variantes exactas por SKU ni Safari/iPhone físico.

**Estado actual del checkpoint:** `BOWLING-CATALOG100-VARIANTS-LAB-CP-001` **funcional aprobado, cierre documental pendiente**. Este cambio documenta la evidencia y no modifica código. Debe verificarse en el **nuevo SHA documental** que `push` y `pull_request` concluyen otra vez **SUCCESS 2/2** cada uno. Solo después actualizar el cuerpo de PR #58 para cierre LAB sin realizar ningún commit posterior. No fusionar ni publicar.

**Inmutabilidad y protección:** PR #57 `c470b44519caf6f27a89d90498a659d573cdb498` permanece LAB cerrada de su propio checkpoint, sin merge; `main=699d877d5ec4f3891ac6c24504a57605105bfb2d` al control; PR #53 `550b635cccf470edc5ee4fda3cba54b41ab02ead` con 10/20 fichas nivel A sin cambios. Sin efectos sobre `sw.js`, FGB CP-020, plantilla independiente, 10 bolas, 12 sesiones, selecciones reales, fotos comerciales ni contactos.
