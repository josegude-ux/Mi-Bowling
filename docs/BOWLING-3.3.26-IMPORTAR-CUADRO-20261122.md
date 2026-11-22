# MI BOWLING 3.3.26 · Importar cuadro de enfrentamientos de Liga (PDF)

- Liga Nacional → «Cuadro de enfrentamientos» → «Importar cuadro (PDF)». El PDF se lee en el móvil con pdf.js 6.2.108 (legacy, Apache-2.0, `vendor/pdfjs/`), sin enviarlo a ningún servidor; disponible sin conexión.
- `integracion/importar-cuadro.js`: deduce el orden de los 7 rivales de «Mi equipo» con dos estrategias: nombres en la misma línea (con pistas «PISTAS 1-2» si aparecen) o equipos numerados con cruces por número («Nº 5 · …», «8A-5A»). Si el PDF trae las 3 jornadas, las asigna a las tres.
- Vista previa obligatoria; «Aplicar» reordena. Las actas con resultados se mueven con su rival; si una tiene resultados contra un equipo que no está en el cuadro, no se cambia nada.
- PDF escaneado (sin texto) o formato no reconocido: mensaje claro y opción «Copiar texto del PDF» para adaptarlo.
- Pendiente: alineaciones de jugadores cuando se disponga de un PDF real.
- Prueba: `tests/importar-cuadro-browser.cjs` (PDF reales generados con Chrome: tabla con nombres y pistas, numerado, escaneado).
