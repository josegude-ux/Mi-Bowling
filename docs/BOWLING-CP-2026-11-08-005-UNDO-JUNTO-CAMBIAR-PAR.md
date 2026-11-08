# MI BOWLING · Checkpoint 005 — Ajuste de controles de anotación
Fecha: 2026-11-08

## Solicitud del usuario
En la pantalla de anotación de partidas, situar «Deshacer último lanzamiento» justo al lado de «Cambiar par».

## Entrega
- Se reorganiza el pie del marcador para agrupar las dos acciones.
- Cuando hay un par de pistas definido, aparecen ambos botones en una misma fila.
- En móvil se distribuyen en dos columnas adaptativas, con altura mínima táctil de 44 px.
- Sin par definido, «Deshacer último lanzamiento» sigue accesible en el marcador.
- La acción de deshacer conserva `onclick="undoRoll()"`, se desactiva si no hay tiradas, y mantiene la confirmación antes de borrar.
- Se retira el botón antiguo, evitando duplicidades y ahorro de desplazamiento vertical.
- Versión candidata: `3.3.4-prueba`; recursos de PWA versionados.

## Seguridad
- No se modifica el modelo de datos, la lógica de puntuación, ni las claves locales.
- Se mantiene aparte la PR #1 sobre 3D, cuya funcionalidad queda aplazada.
- Respaldo previo de `main`: `backup/main-3.3.3-prueba-before-undo-position-20261108` desde `3440d0133b2b500eb6f6a7bd3872c4479ddbe7bb`.

## Verificaciones
- Sintaxis JavaScript correcta.
- Prueba existente `tests/visual-lab-smoke.cjs` extendida con comprobación de posición, unicidad y estado desactivado del botón, CSS para móvil y cache de la PWA.
- Suite ejecutada satisfactoriamente en una ejecución simulada de Node mediante las fuentes leídas del repositorio.
- Pendiente inspección real en Safari/iPhone, tablet y escritorio después del despliegue de prueba.
