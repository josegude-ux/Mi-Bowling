# BOWLING-CP-2026-11-09-031 · ARSENAL F1 — Corregir y deshacer con bola desmarcada

**Fecha local:** 9 de noviembre de 2026 (CET).  
**Estado:** FASE 1 LAB VALIDADA. PR #17 EN BORRADOR, SIN FUSIONAR NI PUBLICAR.  
**Continuidad:** CP-030 → CP-031; se mantiene orden, rama y PR existentes.  
**Repositorio:** `josegude-ux/Mi-Bowling`. **Rama:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**Commit exacto de código y pruebas:** `d6ea3923ccb68d52e61438dc80d9d0eb3131f216`.  
**Ejecución final CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42537530238 — `completed / success`, misma SHA.  
**Main y respaldo verificados sin cambios:** `566aafdc05be163baf8c7f82e60433b0f532d748`.  
**Respaldo:** `backup/main-antes-arsenal-f1-20261108`, misma SHA.

## Recuperación y resguardos
- Recuperado CP-030 y estado efectivo de PR #17 antes de intervenir.
- Verificados `main`, respaldo, código `app.js`, batería `tests/ball-selection-lab.cjs` y PR independientes #1, #8, #10, #12, #13.
- Ninguna fusión, publicación, modificación de `main`, uso de datos reales, cambio de fichas, introducción de campos nuevos o inicio de Fase 2.

## Incidencia reproducida (prueba nueva)
Con datos totalmente ficticios, una sesión histórica tenía dos strikes registrados con Beta (`lab-b`). Se desmarcó Beta de la selección de la sesión (`[]`), y se intentó **corregir la segunda tirada**:
- Cancelar el diálogo no modificaba los lanzamientos.
- Confirmar `rewindRoll(1)` conservaba correctamente la primera tirada histórica, pero recuperaba `s.currentBallId='lab-b'` de la segunda tirada eliminada, aunque esa bola ya no pertenecía al filtro de la sesión.
- El selector visual mostraba «Sin asignar» y el estado persistido mantenía una bola excluida: inconsistencia en la edición de tiradas.
- **Evidencia anterior al arreglo:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42537314091, commit de prueba `0e921f4af436cf359dae13a845e5ce3575a19f76`, falló en `Corregir no reactiva la bola excluida como bola actual` (`'lab-b' !== ''`). No hay indicios de afectación a partidas reales.

## Corrección LAB acotada
- En `app.js`, `rewindRoll(index)` valida la bola histórica recuperada contra `selectedBallsFor(s.id)` antes de actualizar `s.currentBallId`.
- Si existe una selección explícita y la bola histórica ya no está marcada, la **bola actual** queda en `''` («Sin asignar»); el lanzamiento antiguo conservado continúa mostrando su `ballId` histórico correcto.
- Si no existe filtro de selección (`null`), se conserva el funcionamiento anterior de sesiones heredadas.
- La línea de juego de la tirada seleccionada continúa recuperándose para corregir. No hay cambios en esquema, catálogos, datos originales, servicios ni versiones.

## Evidencias de pruebas
- Nueva función `rewindUndoWithDeselectedBallScenario()` incorporada a `tests/ball-selection-lab.cjs` para Chromium y WebKit en viewport 390×844 con datos ficticios:
  1. Cancelar `rewindRoll` y confirmar que no altera los tiros.
  2. Confirmar corrección y verificar que solo se elimina la segunda tirada, preservando la primera con `ballId='lab-b'`.
  3. Comprobar que `currentBallId` y selector quedan vacíos, sin reactivar Beta.
  4. Repetir el lanzamiento y verificar `ballId:''` y selección de sesión aún vacía.
  5. Cancelar `undoRoll`, confirmar `undoRoll`, volver a repetir la tirada sin asignar Beta y comprobar persistencia tras recarga.
  6. Confirmar fichas de bolas inalteradas y ausencia de errores JavaScript.
- **Pruebas completas satisfactorias:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42537530238; `head_sha=d6ea3923ccb68d52e61438dc80d9d0eb3131f216`.
- Mensajes específicos:
  - `OK chromium 390px: cancelar, corregir y deshacer no reactivan bola desmarcada ni alteran historial`.
  - `OK webkit 390px: cancelar, corregir y deshacer no reactivan bola desmarcada ni alteran historial`.
- Conservada la batería previa de F1, competición, multijuego, correcciones entre pestañas, responsividad, PWA, marcadores, calendario FGB 31 fechas y copias JSON ficticias.

## Límites y continuación
- No se realizaron pruebas en un iPhone físico; WebKit emulado no sustituye Safari real.
- Las garantías de concurrencia previas cubren cambios secuenciales dentro del mismo origen, no transacciones atómicas entre dispositivos.
- La PR #17 permanece en LAB sin merge ni publicación. Mantener las PR independientes y las copias verificadas.
- La siguiente acción puede continuar pruebas nuevas justificadas en Fase 1 LAB o preparar validación privada Safari/iPhone con datos ficticios sin publicar.
