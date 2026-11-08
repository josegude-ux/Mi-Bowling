# MI BOWLING · Checkpoint 004 — Publicación de prueba (8 de noviembre de 2026)

**Autorización:** El usuario solicitó aplicar los cambios de interfaz para comprobar funcionalidad y manejo, aplazando expresamente la animación 3D.

## Identificación
- Aplicación existente: `josegude-ux/Mi-Bowling`, GitHub Pages (homepage declarado): `https://josegude-ux.github.io/Mi-Bowling/`.
- Versión candidata: `3.3.3-prueba`.
- Rama de integración: `design/inventa-home-r1-20261108`.
- PR: #2.
- Respaldo del código anterior: `backup/main-3.3.1-20261108-before-redesign`, SHA `4a3ebc624626a1aee2b2ad9c7233d0a45e86230b`.

## Cambios autorizados
1. Portada y navegación con tarjetas estilo VISURA INVENTA para móvil, tablet y escritorio.
2. Pista esquemática 2D interactiva para salida, flechas y breakpoint; controles de tabla 1–39 y mano diestro/zurdo.
3. Vista de los tres puntos en historial.
4. Recursos PWA versionados y control de actualización en servicio existente.
5. **Exclusiones:** No se ha implementado animación 3D, ni simulación de movimiento físico de la bola.

## Compatibilidad
- Claves `localStorage`: `mi-bowling-analitica-v2`, `mi-bowling-v1` y `mi-bowling-liga-v1` permanecen sin cambio.
- No se cambia modelo de datos ni algoritmo de puntuación.
- Repositorio de respaldo preserva código, **no** los datos que se encuentran exclusivamente en el iPhone.
- Recomendación: exportar copia JSON desde Ajustes del dispositivo original antes de usar funciones de edición; no desinstalar la PWA.

## Comprobaciones de código
- Sintaxis Javascript y render del menú correctos.
- Prueba `tests/visual-lab-smoke.cjs` ejecutada satisfactoriamente sobre los contenidos de la rama conectada.
- Selección de tablas, límites, controles, modo diestro/zurdo, sincronización y persistencia simulada correctos.
- Verificada correspondencia entre `index.html`, `app.js`, `styles.css`, `sw.js` versión `3.3.3-prueba`.
- **No se ha realizado validación manual en Safari/iPhone, tablet ni navegador hospedado.** Es precisamente el objetivo de esta versión de prueba.

## Plan de comprobación en dispositivo
1. Abrir la URL ya utilizada para MI BOWLING (evitar desinstalar PWA).
2. Verificar portada, tarjetas, botones, tamaños en móvil/tablet/ordenador.
3. Exportar copia JSON y comprobar presencia de partidas anteriores.
4. Crear una sesión de entrenamiento ficticia, introducir tablas en la pista, registrar lanzamiento y revisar historial.
5. Comprobar estadísticas, patrones, Liga Nacional, actualización y uso sin conexión.
6. Documentar problemas para corregirlos en una siguiente versión, sin reconstruir ni eliminar datos.

## Reversión
Si aparece una incidencia grave, restaurar el código de `backup/main-3.3.1-20261108-before-redesign` tras valorar el estado del service worker. La reversión de código no altera por sí sola el `localStorage` del teléfono; no limpiar datos ni desinstalar.
