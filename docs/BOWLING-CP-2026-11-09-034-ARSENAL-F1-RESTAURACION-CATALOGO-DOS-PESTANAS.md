# BOWLING-CP-2026-11-09-034 · Fase 1 LAB — Restauración de un catálogo distinto con dos pestañas

**Resultado:** VALIDADO EN LAB · PR #17 abierta en borrador, sin fusionar ni publicar.  
**Continuidad:** CP-033 → CP-034, misma PR y rama; Fase 2 excluida.  
**Repositorio:** `josegude-ux/Mi-Bowling`  
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`  
**Commit exacto de código + pruebas validadas:** `5c2444d8d2612c0950b3ee055f17e0120b575803`  
**CI SUCCESS (sobre el SHA anterior):** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42542403127  
**Main y backup antes de F1:** `566aafdc05be163baf8c7f82e60433b0f532d748` · `backup/main-antes-arsenal-f1-20261108`.

## Recuperación y no duplicación

- CP-033 leído y verificado desde GitHub: https://github.com/josegude-ux/Mi-Bowling/blob/feature/catalogo-arsenal-f1-lab-20261108/docs/BOWLING-CP-2026-11-09-033-ARSENAL-F1-RETIRADA-DOS-PESTANAS.md
- Código y pruebas en `app.js` y `tests/ball-selection-lab.cjs` recuperados desde el HEAD inicial de PR #17 `baf51875340ed01454e5d3c7de30ab888510f50d`.
- CI CP-033: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42541185764, SUCCESS en código exacto `fbfc3af3c13571f92817d6f6bd8814473d1625e4`.
- Riesgo nuevo diferenciado: CP-032 restauró sesiones manteniendo el mismo catálogo; CP-033 probó retirada de bola desde otra pestaña. **No se había comprobado que una restauración con identificadores de bola totalmente diferentes no resucitase selecciones antiguas ni borrase las del catálogo restaurado.**

## Reproducción negativa con datos ficticios

Nuevo caso `crossTabRestoreReplacesCatalogScenario()` en Chromium/WebKit, 390×844, dos pestañas del mismo contexto y origen, nunca datos personales:

1. A mantiene la vista «Mis bolas» con Alpha (`lab-a`) y la selecciona.
2. B restaura una copia JSON sintética cuyo único modelo es Delta (`lab-d`), con sesión y lanzamiento histórico también ficticios; las selecciones antiguas se limpian.
3. B marca Delta, dejando `__next__: ['lab-d']`.
4. A aún muestra Alpha de su copia antigua en memoria; al pulsarla no debe añadir `lab-a` ni reemplazar Delta.
5. Se exige `__next__: ['lab-d']`, catálogo y lanzamientos restaurados inalterados, Delta marcada en B y vista correcta al recargar A.

**Fallo real reproducido** en `98716870fe934db8bf723991337bdea16dd80628`: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42542224628. El test esperaba `['lab-d']` y obtuvo `['lab-a']`; se perdió la selección vigente y resucitó una bola ajena a la copia restaurada.

## Corrección mínima

Se ajustó solo `cleanSelectedBallIds()` en `app.js` para considerar como fuente autoritativa de bolas disponibles el catálogo **persistido** en `mi-bowling-analitica-v2` cuando sea legible, en lugar de comparar con `db.balls` potencialmente obsoleto. Se mantiene el fallback a `db.balls` si la lectura no es válida; se conservan desduplicación, exclusión de retiradas, contratos de selección y comportamiento de datos locales.

Sin sincronizar ni reescribir `db.sessions`, `rolls[].ballId`, fichas, esquema `version: 2`, campos de bola, calendario, autenticación, SW ni caché de producción.

## Verificación final

**CI SUCCESS** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42542403127 sobre `5c2444d8d2612c0950b3ee055f17e0120b575803`.

Logs:
- `OK chromium 390px: restaurar otro catálogo entre pestañas rechaza IDs antiguos y conserva Delta`
- `OK webkit 390px: restaurar otro catálogo entre pestañas rechaza IDs antiguos y conserva Delta`
- `OK chromium/webkit 390px: selector obsoleto no resucita bola retirada desde otra pestaña` (regresión CP-033)
- `PASS FGB 31 eventos: 10 gallegos, 21 nacionales ... offline`
- `PASS 8 combinaciones, PWA offline y copia JSON exportada/restaurada con datos ficticios.`
- Resto de regresiones del arsenal/registro en Chromium y WebKit ejecutadas sin incidencias en el workflow.

**Diff desde CP-033:** solo `app.js` y `tests/ball-selection-lab.cjs`; cambios funcionales acotados al filtrado de ID vigente. `main` y el backup se verificaron sin cambio, ambos en `566aafdc05be163baf8c7f82e60433b0f532d748`.

## Límites y protección

- PR #17 abierta, **draft**, no fusionada. PR #1, #8, #10, #12, #13 abiertas, draft e independientes.
- Sin fusión, publicación, modificación de datos reales, instalación de servicios ni inicio de Fase 2.
- No se ha validado en Safari/iPhone físico. El laboratorio representa dos pestañas del mismo origen; no implica sincronización entre dispositivos.
- No repetir CP-021 a CP-034 superados salvo que un fallo nuevo o una modificación justifiquen regresión.
- Continuar Fase 1 exclusivamente con casos límite nuevos y justificados en LAB, siempre con fixtures sintéticas; actualizar siguiente checkpoint verificable.
