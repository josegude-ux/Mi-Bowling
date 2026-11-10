# MI BOWLING — CP-007 · Registro compacto (LAB)
Fecha: 2026-11-08 · Referencia de diseño: estilo VISURA INVENTA + captura de anotación aportada por el usuario.

## Base y límites
- Rama de origen: `main` en commit `efe4c9b107267f31574db4511721cba433bfcb76`, versión publicada `3.3.5-prueba`.
- Rama de laboratorio: `design/registro-compacto-r1-20261108`.
- Versión de LAB: `3.3.6-lab` (no publicada).
- Queda expresamente aplazada la animación/simulación 3D. La PR #1 de pista 3D permanece independiente y **no se incorpora**.
- **No fusionar ni desplegar** sin comprobación real del diseño y autorización.

## Implementado
1. Marcador de **diez frames** al inicio de la pantalla, con frames activos y marcador acumulado reutilizando `scoreStrip` y `frameScores` existentes.
2. Mini-diagramas de los diez frames; se muestran los bolos que quedan en pie tras el primer lanzamiento de cada frame, con indicación especial para splits. No se alteran ni duplican registros.
3. Bolos táctiles ampliados y centrados, seleccionables mediante la lógica de `togglePin` existente. Etiqueta accesible y estado `aria-pressed` coherentes.
4. Botones `Cambiar par` y `Deshacer último lanzamiento` juntos, visibles aunque no se haya definido un par; `Deshacer` sigue desactivado sin tiros.
5. Registro principal con `recordRoll`, `fastRoll`, `foulRoll` intactos, controles rápidos `Todos en pie`, `Todos derribados`, `Falta` y `Limpiar`. Un aviso indica que los primeros tres atajos **guardan al tocar**.
6. Bola, pista visual 2D, posición inicial, flechas y breakpoint en sección desplegable; historial completo y correcciones anteriores en otra sección desplegable.
7. Estilos scoped en `.registry-v4`, adaptados a escritorio, tablet y móviles pequeños. Respetan preferencias de tamaño de botones.
8. Recursos versionados `3.3.6-lab` en `index.html`, `app.js` y `sw.js`.

## Continuidad y seguridad
- Sin modificaciones en esquema, claves de `localStorage`, reglas de puntuación, sesiones, estadísticas, tablas de aceitado ni Liga Nacional.
- Los formularios plegados permanecen en el DOM; el registro sigue leyendo los datos de la bola y la línea de juego.
- Se reusa `rollLog`, `pairEditor`, `undoRoll`, `scoreStrip`, `rackUI`, `laneVisual` y el resto de funciones previas.
- Se mantienen las posibilidades de exportar JSON y volver a la versión anterior antes de cualquier publicación.

## Evidencias
- Sintaxis JavaScript validada.
- `tests/visual-lab-smoke.cjs` y `tests/registry-compact-smoke.cjs`: ambas superadas mediante ejecución de su código con adaptadores del entorno.
- Renderizado simulado de cuatro combinaciones (par/no par × sin tiradas/con tiradas), y caso de partida terminada.
- Comprobado el marcador con diez frames, miniaturas, deshacer desactivado, existencia de registro rápido y presencia de ambos desplegables.
- **Pendiente:** validación visual real en Safari de iPhone, tablet y escritorio, prueba de accesibilidad táctil, guardado/reapertura con sesión real y funcionamiento offline tras actualización de PWA.

## Próximo objetivo
Preparar vista previa de LAB verificable y corregir los problemas de manejo detectados antes de proponer la versión de prueba pública. No publicar 3D.
