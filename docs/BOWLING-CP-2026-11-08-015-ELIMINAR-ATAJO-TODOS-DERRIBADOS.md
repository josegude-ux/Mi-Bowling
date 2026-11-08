# MI BOWLING · CP-015 — Quitar atajo duplicado «Todos derribados»
Fecha: 2026-11-08

## Estado
- Trabajo realizado en **LAB**, no publicado ni fusionado.
- Rama: `fix/remove-atajo-todos-derribados-20261108`
- PR #9: https://github.com/josegude-ux/Mi-Bowling/pull/9 (borrador)
- Commit de código verificado: `458e6b3ac61128ae214dff4ee18050416a3c287a`
- Base publicada inalterada: `main` = `6d0dfbc73bb7033461c816e0e3c85d2315280191`, versión `3.3.8-prueba`.
- Candidata de LAB: `3.3.9-lab`; no actualizar a versión pública hasta autorización explícita.

## Solicitud
Eliminar el botón secundario «Todos derribados» por redundante con el botón principal de registro.

## Implementación
1. Se elimina solo el botón de acceso directo «Todos derribados» en `registry()` y se conserva la función existente `fastRoll(false)` por compatibilidad interna.
2. El botón principal de registrar **no** cambia: muestra «✕ Strike» en primera tirada con los diez bolos y «✓ Derribados todos» cuando quedan bolos después de la primera, permitiendo realizar spare correctamente.
3. Permanecen «Todos en pie» (registra 0 bolos derribados), «Falta» (registra falta) y «Limpiar» (borra selección sin registrar).
4. Ayuda textual actualizada para distinguir acciones que registran de la que solo limpia.
5. La cuadrícula secundaria utiliza tres columnas; a 320 px conserva dos columnas y «Limpiar» ocupa toda la segunda fila. Los botones no se recortan.
6. Claves y estructuras locales, lógica de puntuación, estados de bolos negros y rojos, Liga, bola/posición y datos anteriores permanecen sin alterar.
7. Recurso PWA en LAB versionado `3.3.9-lab` con caché diferenciada de producción.

## Verificaciones
- GitHub Actions **SUCCESS**: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42503298091
- JS y pruebas de registro de laboratorio completados sin errores.
- Chromium y WebKit × 320, 390, 768 y 1280 px: **8/8** aprobadas.
- Atajos: tres botones, ausencia de acceso directo «Todos derribados», y mantenimiento del botón principal «Strike».
- En segunda tirada el botón principal «Derribados todos» continúa disponible para completar spare.
- Pruebas previas de colores rojo/negro, deshacer y anotación siguen pasando.
- Guardado offline y exportación/restauración JSON con datos ficticios aprobados.

## Siguiente paso
- Solo si el usuario autoriza expresamente publicar, convertir a `3.3.9-prueba`, versionar APP_VERSION, caché PWA y referencias a CSS/JS, volver a ejecutar pruebas, respaldar la versión 3.3.8 de `main`, fusionar PR #9 y comprobar GitHub Pages.
- No incluir cambios de perfiles (PR #8) ni animaciones 3D (PR #1).
- No desinstalar la app ni borrar almacenamiento local del iPhone.
