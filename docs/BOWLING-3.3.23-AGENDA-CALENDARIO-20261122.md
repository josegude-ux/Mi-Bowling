# MI BOWLING 3.3.23 · Agenda del calendario legible

Al seleccionar un día con competiciones, las tarjetas de la agenda conservaban el fondo claro del tema antiguo mientras el tema negro/naranja ponía el título en blanco: el nombre de la competición no se veía y la etiqueta «Provisional» se salía por la derecha.

- `tema-negro-naranja.css`: tarjetas `.calendar-official` y `.calendar-session` en fondo oscuro, título blanco, fecha/lugar gris, categoría verde (gallego) o azul (nacional), «Provisional» en naranja; ajuste de texto largo sin desbordar.
- Comprobado en 320, 375, 390 y 430 px: sin scroll horizontal y con contraste correcto. Los datos del calendario no cambian.
