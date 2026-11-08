# BOWLING-CP-2026-11-08-024 · Arsenal F1 — Competición, tiradas e importación JSON

**Fecha:** 8 de noviembre de 2026  
**Estado:** Fase 1 LAB VALIDADA; SIN FUSIONAR NI PUBLICAR.  
**PR existente:** [#17](https://github.com/josegude-ux/Mi-Bowling/pull/17) (borrador).  
**Rama existente:** `feature/catalogo-arsenal-f1-lab-20261108`  
**Commit exacto probado:** `fd4b75ceb73500f593cd8fb566336d343efc33bf`  
**Ejecución de pruebas:** [GitHub Actions 42532433512](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42532433512) — **SUCCESS**  
**Main publicado, sin cambios:** `566aafdc05be163baf8c7f82e60433b0f532d748`  
**Respaldo:** `backup/main-antes-arsenal-f1-20261108`, misma SHA `566aafdc05be163baf8c7f82e60433b0f532d748`

## Continuidad / alcance
Este checkpoint sigue a CP-021, CP-022 y CP-023 y pertenece a la PR #17. Solo se han ampliado pruebas de Fase 1. No se ha iniciado Fase 2 ni integrado ningún dato de Tenpin Toolkit. Se conservan todos los datos y el modelo de bolas existente, sin campos adicionales; no se modifican producción, PWA publicada, autenticación, base de datos ni otras PR.

## Cobertura añadida
1. **Competición oficial ficticia:** selección con check desde «Mis bolas», ida y vuelta al formulario, y persistencia de modalidad oficial, fecha, bolera, nombre, notas, patrón de aceite, par de pistas, pista inicial y bola inicial. La sesión oficial se crea una sola vez.
2. **Tirada en progreso:** se marca el bolo 1 en pie, se abre «Cambiar selección» y al volver persiste la selección de bolos; al registrar el lanzamiento se guardan los nueve derribados con el `ballId` correcto.
3. **Restauración JSON:** fixture sintético mediante carga de archivo; espera explícita al proceso asíncrono de importación; comprueba que las sesiones y bolas importadas se respetan, que se conserva el `ballId` histórico y que se vacía únicamente el sidecar temporal de selección `mi-bowling-ball-selection-v1`.
4. **Compatibilidad:** Chromium/WebKit en 390 y 1280 px, y prueba adicional de competición en viewport emulado 430 × 932 px; verificación de ausencia de errores de JavaScript y de desbordamiento horizontal.
5. **Regresión general:** calendario FGB (31 eventos), recursos PWA, marcador, iconos, persistencia, importación/exportación JSON y motores Chromium/WebKit en 320/390/768/1280 px, con pruebas offline.

## Ejecución y resolución
- Primer intento de tests: [run 42532304087](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42532304087), **FAILURE** por una aserción prematura: el test examinaba las sesiones antes de que terminara el manejador asíncrono `File.text()` de importación. No era evidencia de pérdida real de datos.
- Se corrigió exclusivamente el test agregando la espera a la persistencia comprobable.
- Reejecución final del conjunto: [run 42532433512](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42532433512), **SUCCESS**, código `fd4b75ceb73500f593cd8fb566336d343efc33bf`.
- Los registros finales acreditan las pruebas específicas a 390, 1280 y 430 × 932 px para ambos motores.

## Estado / pendientes
- `main` y respaldo sin cambios; PR #17 abierta en borrador, sin merge ni publicación.
- Las PR #1, #8, #10, #12 y #13 permanecen independientes.
- Sin test en Safari de iPhone físico: WebKit emulado no lo sustituye.
- El borrador de nueva sesión se conserva temporalmente mientras navega en la misma ejecución; no se promete recuperación del borrador tras cerrar/reiniciar la app.
- Las selecciones operativas se guardan fuera del JSON de partidas; al restaurar copia se descartan. No son campos de las bolas.
- Próximos trabajos: solo aceptación en dispositivo físico o nueva orden autorizada; Fase 2 y producción quedan fuera de alcance.
