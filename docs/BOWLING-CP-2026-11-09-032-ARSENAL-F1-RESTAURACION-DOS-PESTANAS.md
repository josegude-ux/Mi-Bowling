# BOWLING-CP-2026-11-09-032 · Fase 1 LAB — Restauración JSON con otra pestaña abierta

**Estado:** VALIDADO EN LAB · PR #17 en borrador, no fusionada ni publicada.  
**Continuidad:** CP-031 → CP-032, misma rama y PR sin duplicación de trabajo.  
**Repositorio:** `josegude-ux/Mi-Bowling`.  
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**Commit exacto de pruebas y código evaluado:** `0f6a520342347a203c17f2821b2b124d9ebb48b7`.  
**GitHub Actions:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42539997007 — `completed / success`, mismo SHA.  
**Main y respaldo verificados:** `566aafdc05be163baf8c7f82e60433b0f532d748`.  
**Rama de respaldo:** `backup/main-antes-arsenal-f1-20261108`, mismo SHA.

## Recuperación verificada
- Recuperado CP-031 desde la rama y verificados los archivos `app.js` y `tests/ball-selection-lab.cjs`.
- Comprobado que PR #17 está abierta en borrador y no fusionada; PR independientes #1, #8, #10, #12 y #13 continúan independientes y no fusionadas.
- Se mantuvieron intocados `main`, respaldo, partidas reales, fichas y calendario FGB publicado.

## Riesgo concreto revisado sin repetir las pruebas anteriores
La restauración JSON en una pestaña elimina el almacenamiento lateral de selecciones `mi-bowling-ball-selection-v1`, pero otra pestaña del mismo origen puede mantener abierta la interfaz «Mis bolas», con checks todavía visibles de la sesión anterior. Era necesario comprobar que, después de restaurar, **no se resucitan selecciones de la instalación sustituida**.

## Prueba nueva de Fase 1
Se añadió `crossTabRestoreClearsSelectionsScenario()` a `tests/ball-selection-lab.cjs`. Cada motor ejecuta el escenario sintético en dos pestañas del mismo contexto y viewport móvil 390×844:

1. Crear únicamente en la memoria local del entorno de prueba dos sesiones ficticias y selecciones `__next__:['lab-a']`, selección de sesión histórica y de sesión descartable.
2. Verificar que la pestaña B muestra inicialmente el check Alpha.
3. Intentar importar una copia JSON **ficticia**, **cancelar** el diálogo y comprobar que no se modifican las sesiones ni los checks de ninguna pestaña.
4. Confirmar la restauración de una copia ficticia distinta y comprobar que se reemplazan las sesiones y se limpia el almacenamiento lateral.
5. Verificar que B recibe el cambio sin recarga y desmarca automáticamente Alpha.
6. Marcar Beta en B y comprobar que el nuevo almacenamiento contiene **solo** `{__next__:['lab-b']}`, sin resucitar selecciones previas.
7. Comprobar que A también muestra Beta, sin conservar Alpha, y que los lanzamientos históricos de la copia restaurada y las fichas de bolas permanecen intactos.
8. Verificar ausencia de errores JavaScript.

## Resultados y evidencia
- **CI SUCCESS:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42539997007, sobre SHA `0f6a520342347a203c17f2821b2b124d9ebb48b7`.
- Log:
  - `OK chromium 390px: cancelar/restaurar JSON con otra pestaña borra selecciones antiguas y conserva historial`.
  - `OK webkit 390px: cancelar/restaurar JSON con otra pestaña borra selecciones antiguas y conserva historial`.
- Continúan pasando las regresiones de la Fase 1: concurrencia secuencial de selecciones, tirada abierta, corregir/deshacer, formulario de sesión, multijuego, borrado seguro, importación y memoria temporal, marcador, calendario FGB 31 eventos, PWA y responsive.
- **No se ha modificado `app.js` durante este ciclo**: comportamiento correcto demostrado; único cambio en el código de pruebas más este checkpoint.

## Restricciones y continuidad
- No se ha fusionado ni publicado, no se ha iniciado Fase 2, no se han añadido campos de bola y no se han usado partidas reales.
- Esta comprobación se limita a dos pestañas del **mismo navegador y origen**; no implica sincronización entre distintos dispositivos ni validación Safari/iPhone físico.
- Se mantiene pendiente la prueba física de Safari en iPhone. Otra continuación de LAB debe cubrir únicamente casos nuevos justificados o preparar un protocolo privado para Safari físico; evitar repetir escenarios superados.
