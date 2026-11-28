# MI BOWLING · Instrucciones para asistentes de programación

PWA estática publicada en GitHub Pages. La usan personas reales con años de historial: nunca borrar ni reescribir sus datos.

## En cada publicación (obligatorio)

1. **Subir la versión visible**: `APP_VERSION` en `releases/catalogo-local-f1-fotos1/app.js` (formato `3.3.N-prueba`, sumar 1 a N). Es lo que el usuario ve abajo en Inicio para saber que su móvil se ha actualizado.
2. **Service worker** (`sw.js`):
   - Añadir un sufijo corto al final de `RELEASE` (no quitar los anteriores: hay pruebas que los buscan).
   - Recalcular `HASHES` (SHA-256 de cada recurso). Si añades un archivo que la app carga, añádelo también a `HASHES`.
3. **Pruebas que dependen de la versión**: actualizar en `tests/cp030-retired-lab.cjs` (marcador de `RELEASE` y número de recursos), `tests/cp030-retired-browser-lab.cjs` (versión) y `tests/registro-compacto-real-browser.cjs` (nombre de caché y número de recursos).
4. Documentar el cambio en `docs/` con el número de versión.

## Datos

- Escribir siempre a través de `window.MiBowlingEscritura` (journal y bloqueo); nunca `localStorage.setItem` directo sobre claves `mi-bowling-*`.
- Formato de datos v2: no cambiar `db.version` ni eliminar campos.

## Diseño

- Tema único negro y naranja: estilos en `tema-negro-naranja.css` (se carga el último). Las hojas antiguas (`design-*.css`) tienen fondos claros fijos: comprobar el contraste de cualquier pantalla nueva o modificada en el tema oscuro.
- Móvil primero (390×844 y 375×667): evitar tablas largas y desplazamiento innecesario; lo secundario, en desplegables.

## Reglas acordadas con el usuario

- Pocket: sin marca, la primera bola se supone en pocket 1-3 (diestro); el check «Entró 1–2» marca un cruce. Nunca cuentan como pocket las bolas al canal ni las que dejan el bolo 1 en pie.
- Fotografías de bolas: privadas (solo cuentas de Mi Bowling en la nube), nunca públicas ni en el repositorio.
