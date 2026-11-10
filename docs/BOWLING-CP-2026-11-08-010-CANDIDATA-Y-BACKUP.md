# MI BOWLING · CP-010 — Candidata de publicación y bloqueo de seguridad

Fecha: 2026-11-08
Estado: **3.3.6-prueba preparada en rama; publicación DETENIDA hasta validar copia de datos del iPhone real**.

## Estado contrastado
- Repositorio: `josegude-ux/Mi-Bowling`.
- PR abierta: [#5](https://github.com/josegude-ux/Mi-Bowling/pull/5), **draft**, no fusionada.
- Rama: `design/registro-compacto-r1-20261108`.
- Commit candidato comprobado en CI: `95118400e4dc536f9e88878d04a3195940cbd29f`.
- La base publicada `main` anterior a la preparación: `efe4c9b107267f31574db4511721cba433bfcb76` (versión `3.3.5-prueba`).
- Copia del **código** anterior: `backup/main-3.3.5-antes-de-3.3.6-20261108`, creada en el mismo SHA de main.
- No se ha integrado la PR #1/3D. Animación 3D permanece expresamente aplazada.

## Modificaciones de la candidata
Cambios en rama sin publicar: `3.3.6-lab` pasó a `3.3.6-prueba` en:
- `app.js`: APP_VERSION
- `index.html`: referencias CSS/JS con `336prueba`
- `sw.js`: clave de caché y recursos versionados
- Scripts de prueba: aserciones de versión/caché actualizadas.
No se cambian claves `localStorage`, modelo de datos, motor de puntuación, funciones de guardar/restaurar ni pantallas 3D.

## Evidencia técnica
GitHub Actions:
- Ejecución **SUCCESS**: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42498115186
- Commit exacto probado: `95118400e4dc536f9e88878d04a3195940cbd29f`.
- `tests/visual-lab-smoke.cjs` y `tests/registry-compact-smoke.cjs`: correctos.
- `tests/registry-browser-smoke.cjs`: **8/8** combinaciones Chromium/WebKit a 320×640, 390×844, 768×1024 y 1280×900.
- PWA Chromium: carga sin red, caché de la nueva versión y guardado de anotación ficticia: correctos.
- **Exportación y restauración JSON de datos ficticios** en contexto aislado: correctas; conservan sesiones, lanzamientos, bolas, patrones y línea de juego. No se toca ningún dato personal real.
- Esta evidencia técnica **NO** acredita que exista una copia de las partidas del iPhone del usuario.

## Puerta de seguridad PENDIENTE (obligatoria antes de publicación)
1. En el iPhone donde están guardadas las partidas, abrir **MI BOWLING 3.3.5-prueba** y entrar en `Ajustes y copias → Copias de seguridad → Exportar copia`.
2. Guardar el archivo `Mi_Bowling_copia_YYYY-MM-DD.json` en **Archivos / iCloud Drive** u otro almacenamiento conservado. **No desinstalar la app ni borrar datos del navegador**.
3. Verificar el archivo: existe, tamaño mayor que 0 bytes, es JSON válido y contiene `version`, `sessions`, `balls`, además de `leagueNational` si se utiliza Liga Nacional. Recomendado comparar número de sesiones y bolas con Ajustes. Para verificación asistida se necesita adjuntar el archivo exportado al chat; no usar un archivo distinto o de fecha antigua sin advertirlo.
4. Los PDF de patrones están en IndexedDB y **NO** se incluyen como binarios dentro del JSON: conservar por separado los PDF originales que el usuario necesite.
5. Registrar resultado verificable de la copia del iPhone (nombre, fecha, tamaño y comprobación estructural), sin publicar datos personales en documentación pública de GitHub.

Hasta completar esta puerta, **NO fusionar, NO publicar, NO alterar `main`, NO actualizar GitHub Pages**.

## Si llega una copia real válida
- Volver a comprobar HEAD de main y de PR #5 y el estado del CI.
- Pasar PR a revisión y fusionar **solo** después de la validación de copia con autorización ya otorgada condicionada a ella.
- Comprobar despliegue GitHub Pages success, versión `3.3.6-prueba` y continuidad de los datos locales del iPhone sin desinstalar.
- Si aparece fallo, revertir código a rama de respaldo, renovando caché del service worker, sin borrar almacenamiento local.

## Evidencia no ejecutada
- Verificación del archivo JSON real de iPhone: **NO REALIZADA / BLOQUEANTE**.
- Inspección en Safari de iPhone físico: pendiente de prueba del usuario.
- Fusión/producción: **NO REALIZADAS**.
