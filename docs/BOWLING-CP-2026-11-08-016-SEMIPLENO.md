# MI BOWLING · CP-016 — Semipleno en la segunda tirada
Fecha: 2026-11-08

## Requisito confirmado
Sustituir el texto del botón principal «Derribados todos» por **«Semipleno»** cuando se registran todos los bolos disponibles en la segunda tirada de un frame. Mantener «Strike» si hay diez bolos disponibles y la tirada los derriba todos.

## Implementación LAB
- Rama de trabajo: `fix/remove-atajo-todos-derribados-20261108`.
- PR #9: https://github.com/josegude-ux/Mi-Bowling/pull/9 (borrador).
- Versión candidata de LAB: `3.3.9-lab`.
- Código verificado: commit `84722f1660e8f3293f873220ffd75fdbf4a61c22`.
- El botón principal usa ahora `n.available.length===10?'✕ Strike':n.ball===2?'✓ Semipleno':'✓ Derribados todos'` cuando no se ha seleccionado ningún bolo en pie.
- La excepción de tercera tirada con menos de diez bolos en el décimo frame conserva un texto diferente a «Semipleno», evitando confundir la bola de bonificación con una segunda tirada.
- Se mantiene el trabajo anterior de la PR: eliminación del atajo secundario redundante «Todos derribados» y conservación de «Todos en pie», «Falta» y «Limpiar».
- La acción `recordRoll()`, los cálculos de puntuación, los colores de las miniaturas, las claves del almacenamiento y los registros antiguos no se han modificado.
- Fuera de alcance: 3D y perfiles locales.

## Pruebas
- GitHub Actions **SUCCESS**: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42503850320 (mismo commit de código).
- Comprobaciones específicas de nombre en primera tirada, segunda tirada con bolos restantes y tercera tirada especial del décimo frame.
- Navegador WebKit/Chromium: 8 vistas responsive y prueba de semipleno en segunda tirada.
- Pruebas de anotación, spare, deshacer, PWA sin conexión y exportación/importación sintética siguen correctas.

## Continuidad
- Base publicada: `main` commit `6d0dfbc73bb7033461c816e0e3c85d2315280191` (versión 3.3.8-prueba), comprobada intacta.
- No fusionar ni desplegar desde LAB sin autorización expresa del usuario.
- Cuando se autorice, convertir `3.3.9-lab` en `3.3.9-prueba`, actualizar caché PWA, probar y verificar copia de seguridad antes de publicación.
