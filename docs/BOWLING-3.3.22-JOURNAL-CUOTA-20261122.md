# MI BOWLING 3.3.22 · Historiales grandes sin error de espacio

## Problema
Con historiales grandes (≈1,5 MB o más, p. ej. dos años importados), **restaurar una copia desde archivo** y **añadir/vincular una bola del catálogo** fallaban con
`Setting the value of 'mi-bowling-f1-restore-journal-v1' exceeded the quota`. No se perdían datos, pero la operación no se podía hacer.

Causa: el journal de seguridad de `integracion/autoridad-local.js` (v1) guardaba en localStorage una copia completa de las 8 claves **antes y después** del cambio. Con 2,6 M caracteres de historial, journal + datos superaban la cuota de ~5 M caracteres del navegador.

## Solución: journal v2
- Por clave guarda solo huellas (longitud + hash de 53 bits) de `before` y `after`.
- El valor anterior se guarda únicamente para las claves que cambian, comprimido sin pérdida (LZW, 15 bits por carácter). 2,59 M → 65 K caracteres.
- La descompresión se verifica antes de tocar ninguna clave; si no coincide, no se cambia nada.
- Misma semántica de seguridad: recuperación al arrancar siempre vuelve a `before`; conflicto con valores ajenos → no se toca nada y la app no arranca; el journal pendiente bloquea escrituras.
- Un journal v1 pendiente de una versión anterior se sigue recuperando.

## Pruebas
- `tests/autoridad-journal-cuota.test.cjs` (Node, almacén con cuota real): 10 casos — compresión, restauración grande→pequeña, transacción de catálogo, fallo a mitad con rollback exacto, cierre de la app a mitad (2 variantes), conflicto, compatibilidad v1, journal manipulado, escrituras normales.
- `tests/journal-cuota-browser.cjs` (Chrome real, historial de 300 sesiones / 2,6 M caracteres): transacción de catálogo y restaurar copia desde Ajustes. Con el código de 3.3.21 este test falla con el error de cuota.
