# MI BOWLING — CP-013 · Publicación controlada 3.3.7-prueba
Fecha: 2026-11-08
Estado al crear: candidata validada y lista para fusionar según autorización explícita del usuario.

## Continuidad
- Origen: CP-012, PR #6.
- Publicado previamente: `main` SHA `2ef1954fd6cdb154d883059473b962892f06fbb5` (3.3.6-prueba).
- Copia exacta de código: `backup/main-3.3.6-antes-rojos-20261108` desde dicho SHA.
- Candidata `3.3.7-prueba`: commit de código verificado `fc7617e7e5f9d5bab1937708b979116bc7a57ede`.
- Pruebas finales de ese mismo commit: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42500202365 — **completed/success**.
- Mantener PR #1 de 3D sin integrar.

## Alcance autorizado
- Señalar en rojo los bolos que siguen en pie únicamente cuando se cierra un frame después de la **segunda tirada**.
- Primera tirada sin puntos rojos; spare/strike sin rojos; deshacer elimina la indicación correspondiente.
- La identificación se dibuja en miniaturas de diez frames sin alterar los datos de lanzamientos ni el motor de puntuación.
- Versionar APP_VERSION, URLs CSS/JS y caché PWA a `3.3.7-prueba`.

## Validaciones efectuadas
- 8/8 vistas en Chromium/WebKit con anchos 320, 390, 768 y 1280.
- Pruebas de segundo lanzamiento, rojo por bolo exacto, deshacer y spare en ambos navegadores.
- PWA offline y guardado local con datos ficticios, exportación/importación JSON sintética.
- Dos suites de lógica y sintaxis superadas.
- `main` y su respaldo de código exactamente coincidentes antes de fusionar.
- Copia JSON real revisada durante el ciclo previo; PDF externo conservado y legible, confirmado por usuario.
- No se han añadido claves de localStorage ni alterado esquemas o registros.

## Cierre
Este checkpoint en GitHub es únicamente técnico: no debe incluir copia JSON del usuario ni PDF privados.
Al completar la fusión, registrar el SHA resultante, revisar workflow de GitHub Pages y confirmar que la app publicada contiene la versión `3.3.7-prueba`. La verificación de las partidas en iPhone físico sigue siendo necesaria después de actualizar sin desinstalar la PWA.
