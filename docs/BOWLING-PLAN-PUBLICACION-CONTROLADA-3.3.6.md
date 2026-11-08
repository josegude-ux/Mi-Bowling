# MI BOWLING — Procedimiento de publicación controlada · 3.3.6-prueba
Fecha de preparación: 2026-11-08
Estado: **PREPARADO / NO AUTORIZADO / NO EJECUTADO**
Repositorio: `josegude-ux/Mi-Bowling`
PR en borrador: https://github.com/josegude-ux/Mi-Bowling/pull/5
Rama LAB: `design/registro-compacto-r1-20261108`

## 0. Condición de autorización
Este documento **no** autoriza publicación. Hasta que el usuario dé una orden inequívoca de publicar la versión de prueba: mantener `main`, GitHub Pages y los dispositivos en su estado actual.

La animación 3D está excluida; la PR #1 es independiente y no debe integrarse. No modificar el esquema, claves ni registros existentes.

## 1. Base reproducible
- `main` publicado (última base verificada): commit `efe4c9b107267f31574db4511721cba433bfcb76`, versión `3.3.5-prueba`.
- Commit de código LAB con ergonomía final: `d646a43073844b8ccc41537f1f9cc24cce850618`, versión `3.3.6-lab`.
- Acción GitHub de referencia: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42497469017 (**success**).
- Ocho combinaciones aprobadas en Chromium/WebKit, 320/390/768/1280 px; prueba PWA sin conexión con datos ficticios. Capturas: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42497469017/artifacts/13623702621
- El checkpoint siguiente describe las últimas correcciones. Nuevos commits de **solo documentación** pueden cambiar el HEAD de la rama sin alterar el código validado.

## 2. Protección previa de datos
1. El usuario abre la aplicación actualmente publicada e inicia **Ajustes → Copias de seguridad → Exportar copia** en el iPhone original.
2. Comprueba que el JSON se ha guardado y puede localizarlo. **No debe desinstalar la PWA, borrar datos web ni limpiar la caché manualmente.**
3. El respaldo de GitHub es del código; **no contiene el almacenamiento local del iPhone**.
4. Antes de publicar, verificar que no hay otras ramas nuevas en main y preparar un respaldo nominal de su SHA actual.

## 3. Conversión a versión de prueba (solo DESPUÉS de la autorización)
1. Confirmar que PR #5 sigue abierta, que `main` no contiene cambios ajenos y que no se está mezclando la PR #1/3D.
2. Sustituir de forma consistente y exclusiva `3.3.6-lab` por `3.3.6-prueba`:
   - `app.js`: `APP_VERSION`.
   - `index.html`: etiquetas de caché `?v=336prueba` para JS y CSS.
   - `sw.js`: nombre de `CACHE` y archivos versionados precacheados.
   - Pruebas de código que comprueban esas cadenas.
3. Revisar el diff y confirmar que no hay cambios de motor de puntuación, datos, liga, patrones, estadísticas ni API.
4. Mantener las claves de `localStorage` y sus formatos: `mi-bowling-analitica-v2`, `mi-bowling-v1`, `mi-bowling-liga-v1` y demás claves existentes.

## 4. Validación de la candidata
1. Ejecutar `node tests/visual-lab-smoke.cjs` y `node tests/registry-compact-smoke.cjs`.
2. Ejecutar `node tests/registry-browser-smoke.cjs` en CI con Chromium y WebKit; comprobar las ocho resoluciones y el escenario offline.
3. Confirmar visualmente capturas y que marcador/bolos, botones Cambiar par y Deshacer, atajos, plegables y navegación funcionan.
4. Verificar el flujo de archivo JSON y Liga Nacional con datos de prueba. No importar datos reales en entornos de laboratorio.
5. Toda prueba fallida: corregir en LAB, repetir la prueba afectada y retener la publicación.

## 5. Integración y publicación de prueba (solo con autorización)
1. Pasar PR #5 de borrador a lista para revisión **después de aprobar la candidata**.
2. Fusionar únicamente el alcance de PR #5, evitando los cambios 3D.
3. Verificar que el commit fusionado figura en `main`, que GitHub Pages concluye **success** y que la versión servida es `3.3.6-prueba` en https://josegude-ux.github.io/Mi-Bowling/.
4. En el iPhone original, utilizar **Ajustes → Actualizaciones** y actualizar sin desinstalar; verificar que las partidas antiguas siguen presentes.
5. Realizar una partida ficticia controlada, probar Deshacer, cambio de par, historial y regreso a Inicio; verificar la copia JSON ya exportada.

## 6. Criterios de aceptación
- Datos y estadísticas anteriores intactos y legibles.
- Menú de INVENTA sin regresiones; la anotación muestra 10 frames y bolos táctiles.
- Cambiar par disponible siempre; Deshacer solo habilitado si hay lanzamientos.
- Entrada de bolo, strikes, spares, 10º frame, línea y cambio de par sin errores de puntuación.
- Móvil sin controles tapados, botón Registrar visible, sin overflow horizontal.
- PWA offline y versión del service worker coherentes.
- PR #1 de 3D no incluida.

## 7. Reversión
Si aparece un error grave:
1. Detener nuevas modificaciones y conservar copia de datos local.
2. Crear un commit de reversión desde el respaldo de `main` verificado, sin `git reset --hard` público y sin borrar datos.
3. Cambiar también la clave de caché del service worker para que los dispositivos detecten la restauración.
4. Ejecutar validación de sintaxis, puntuaciones y recursos antes de volver a desplegar, documentar el incidente y comprobar el iPhone.
5. Nunca limpiar automáticamente `localStorage` ni importar copias sin la autorización correspondiente.

**Estado de este procedimiento:** únicamente documentación. NO se ha creado una publicación 3.3.6-prueba, no se ha fusionado la PR #5 y no se ha cambiado producción.
