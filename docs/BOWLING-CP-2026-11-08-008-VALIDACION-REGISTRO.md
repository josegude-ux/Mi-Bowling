# MI BOWLING · CP-008 — Validación del registro compacto
Fecha: 2026-11-08 · Estado: **LAB VALIDADO EN NAVEGADORES EMULADOS, PENDIENTE VALIDACIÓN EN DISPOSITIVOS FÍSICOS Y AUTORIZACIÓN DE PUBLICACIÓN**

## Identidad y continuidad
- Repositorio: `josegude-ux/Mi-Bowling`
- PR #5 (borrador): https://github.com/josegude-ux/Mi-Bowling/pull/5
- Rama: `design/registro-compacto-r1-20261108`
- Commit verificado de LAB previo a registrar este checkpoint: `c4a3619842a7cbda421a20d3b98f7bd0c19e9e24`
- Base publicada/main: `efe4c9b107267f31574db4511721cba433bfcb76` (`3.3.5-prueba`); confirmada sin cambios.
- Versión candidata de LAB: `3.3.6-lab`.
- No integrar PR #1 de animación 3D; el usuario la ha pospuesto.
- No fusionar, publicar ni desplegar sin nueva autorización del usuario.

## Correcciones verificadas desde CP-007
1. **Barra inferior superpuesta:** las capturas de laboratorio mostraron que la navegación inferior fija se situaba por encima de los bolos y el botón de registro. Ahora la barra se oculta **solo** en `tab === 'registro'` (`body.registry-screen`); se conserva en el resto de vistas, con acceso de salida desde el encabezado. Capturas revisadas en Chromium 320 y WebKit 390 tras la corrección.
2. **WebKit / primera instalación PWA:** la transición inicial a un service worker activo podía recargar la página durante la prueba; ahora `controllerchange` distingue primera instalación de una actualización posterior, evitando esa recarga inesperada. Se ha probado una instalación nueva y un registro offline en Chromium.
3. El test del layout ahora comprueba explícitamente que la barra inferior está ausente en la anotación y presente en Inicio.
4. Playwright ejecuta las pruebas de UI con service workers aislados; la PWA se prueba **por separado** con el service worker real para evitar interferencias entre objetivos de test.
5. GitHub Actions se fijó a Ubuntu 24.04 para compatibilidad Playwright; las ejecuciones futuras se agrupan por PR evitando reprocesos concurrentes.

## Verificación reproducible (sin publicar)
GitHub Actions, ejecución final acreditada:
- https://github.com/josegude-ux/Mi-Bowling/actions/runs/42496819105
- Commit sometido: `c4a3619842a7cbda421a20d3b98f7bd0c19e9e24`
- Resultado: **success**, todas las fases finalizadas correctamente.
- Scripts: `node tests/visual-lab-smoke.cjs`, `node tests/registry-compact-smoke.cjs`, `node tests/registry-browser-smoke.cjs`.
- Motores y resoluciones: Chromium y WebKit × 320×640, 390×844, 768×1024 y 1280×900; **8 combinaciones aprobadas**.
- Controles revisados: 10 frames, 10 bolos, miniaturas por frame, botón Cambiar par, deshacer desactivado sin tiradas, registro de strike y deshacer, edición y persistencia de línea, configuración de par desde sesión sin par, refresco y recarga del almacenamiento local.
- No se detectó desbordamiento horizontal; los bolos tienen entre 49 px y 59 px en los dispositivos simulados.
- **PWA offline:** caché de LAB disponible; primera instalación sin recarga inesperada, navegación sin red, interacción de bolos y guardado local de tirada ficticia verificados en Chromium.
- Capturas de pantalla de los ocho formatos: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42496819105/artifacts/13624370338 (sujetas al plazo de retención del workflow).

## Compatibilidad
- Claves originales de almacenamiento conservadas: `mi-bowling-analitica-v2`, `mi-bowling-v1`, `mi-bowling-liga-v1`.
- No cambian motor de puntuación, esquema de sesiones, datos de bolas, patrones, actas de liga ni estadísticas.
- No se han utilizado ni modificado los datos personales reales guardados en el iPhone; pruebas con datos ficticios.

## Preparación para publicación controlada
1. Revisar capturas y probar el flujo en Safari de un iPhone físico y tablet real; son validaciones pendientes, **no** realizadas aquí.
2. Antes de publicar, pedir al usuario que exporte su copia JSON desde la instalación actual; la copia del código GitHub no incluye los datos locales del teléfono.
3. Con la autorización específica del usuario, crear versión `3.3.6-prueba`, actualizar caché/versionado en un commit controlado, probar las suites nuevamente y publicar a través de una PR distinta de la PR #1 de 3D.
4. Verificar GitHub Pages y la versión servida en la URL oficial tras el despliegue.
5. Mantener reversión preparada a la base main `efe4c9b107267f31574db4511721cba433bfcb76` si surgieran incidencias.

## Pendientes no bloqueantes de LAB
- Safari/iPhone y tablet físicos.
- Probar restauración de copia JSON y recorrido de Liga Nacional con fixtures representativos en navegador real.
- Aceptación de ergonomía por el usuario a partir de las capturas.
