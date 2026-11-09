# BOWLING-CP-2026-11-09-033 · Fase 1 LAB — Retirada en otra pestaña y selector obsoleto

**Estado:** VALIDADO EN LAB, sin fusión ni publicación.  
**Continuidad:** CP-032 → CP-033 · PR #17 (draft).  
**Repositorio:** `josegude-ux/Mi-Bowling`.  
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**Último commit exacto de código + pruebas validadas:** `fbfc3af3c13571f92817d6f6bd8814473d1625e4`.  
**CI SUCCESS (mismo commit):** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42541185764  
**Base `main` y respaldo `backup/main-antes-arsenal-f1-20261108`:** `566aafdc05be163baf8c7f82e60433b0f532d748`.

## Riesgo nuevo y evidencia negativa

CP-023 cubría retirar/reactivar bolas en una pestaña; CP-028 cambios de checks entre pestañas; CP-032 restauración JSON entre pestañas. No se había probado **retirar una bola desde B mientras A conserva abierto un selector basado en un catálogo `db` obsoleto**.

Escenario `crossTabRetirementStalePickerScenario()` en `tests/ball-selection-lab.cjs`: dos pestañas, misma instancia ficticia con Alpha/Beta, viewport 390×844, sin datos personales.

1. A marca Alpha para la próxima sesión; B observa la marca.
2. B retira Alpha: ficha persistida con `retired: true` y sidecar `__next__: []`.
3. A, todavía con ficha en memoria anterior, intenta volver a marcar Alpha.
4. Se exige que el sidecar siga en `__next__: []`, que la bola no sea seleccionable y que las partidas permanezcan intactas.

**Fallo reproducido con código anterior:** commit `2b7756e61a8d81c6d812432abe9b408acee1abe9`, CI https://github.com/josegude-ux/Mi-Bowling/actions/runs/42540727531, aserción: `actual ['lab-a']` frente a `expected []`.

## Corrección mínima

En `app.js`, únicamente `cleanSelectedBallIds()` consulta las bolas marcadas `retired` en el catálogo persistido actualmente para descartar selecciones obsoletas de una pestaña con `db` anterior. No fuerza una sincronización general de fichas/partidas, no cambia el esquema ni reescribe `rolls[].ballId`.

La prueba fue ajustada para usar `click()` al intentar marcar la bola obsoleta, porque tras la corrección el componente desmarca inmediatamente el checkbox y `Playwright.check()` espera incorrectamente un estado inválido (timeout del test, no defecto del código). Resultado definitivo en `fbfc3af3c13571f92817d6f6bd8814473d1625e4`.

## Pruebas y resultados finales

**CI SUCCESS:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42541185764.

Logs confirmados:
- `OK chromium 390px: selector obsoleto no resucita bola retirada desde otra pestaña`.
- `OK webkit 390px: selector obsoleto no resucita bola retirada desde otra pestaña`.
- Regresiones de Fase 1 previamente validadas en el workflow: restauración de dos pestañas, borradores, sesiones, tiradas, deshacer/corregir, sidecar dañado, cuota simulada.
- Regresión general de marcador, recursos PWA/offline, responsive y calendario FGB 2026–2027: 31 competiciones (10 gallegas, 21 nacionales).

**Diff respecto al CP-032:** solo `app.js` (validación acotada) y `tests/ball-selection-lab.cjs` (nuevo escenario). No se han modificado `index.html`, `sw.js`, fichas reales, calendario ni otras PR.

## Protección y límites

- `main` y respaldo en SHA base, sin intervención.
- PR #17 permanece abierta en borrador; PR #1/#8/#10/#12/#13 independientes.
- Sin merge, publicación, Fase 2, servicios externos, cuentas o lectura de partidas del iPhone.
- Validación de **dos pestañas del mismo navegador y origen** con datos ficticios; no equivale a sincronización entre dispositivos ni a prueba en Safari físico.
- Pendiente validación voluntaria en iPhone Safari físico en entorno privado, sin datos reales de producción.
- Continuación: solo nuevos casos límite de Fase 1 justificados; no repetir CP-021…CP-033 superados sin incidencia o cambio que lo exija.
