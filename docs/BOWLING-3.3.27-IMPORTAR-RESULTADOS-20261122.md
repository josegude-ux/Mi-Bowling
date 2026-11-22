# MI BOWLING 3.3.27 · Importar el PDF de resultados de la FEB tras cada enfrentamiento

Formato de referencia: «XXXIX LIGA NACIONAL BOWLING · 1ª DIVISION MASCULINA · PRIMERA JORNADA · RESULTADOS Nº ENFRENTAMIENTO», clasificación individual acumulada `POS CODG CLUB JUGADORES PART BOLOS PROMD MAX MAXS` (memoria 1ª jornada 2025-26). Pendiente de validar con PDFs reales de cada enfrentamiento.

- Liga Nacional → «Resultados de la Federación» → «Importar resultados (PDF)». Lectura local (pdf.js).
- Cada PDF se guarda como foto del acumulado (`liga32.resultados["jornada-enfrentamiento"]`). Comparando con el anterior: quién jugó (de los dos equipos), sustituciones (1 partida cada uno, con su puntuación exacta) y bolos del enfrentamiento por jugador. En el 1.º enfrentamiento, con la partida máxima se deducen las dos puntuaciones (sin orden).
- Plantillas de los 8 equipos con todos los jugadores del PDF.
- Acta: nombres por partida (sustituciones), puntuaciones exactas solo en huecos vacíos; nunca se pisa lo apuntado ni se reasigna un hueco con puntuaciones; aviso si la suma apuntada no coincide con los bolos de la Federación.
- Sin el PDF anterior: solo se guardan plantillas y el aviso lo indica. Si la tabla es acumulada de temporada, el 1.º enfrentamiento usa el 7.º de la jornada previa.
- Prueba: `tests/importar-resultados-browser.cjs`.
