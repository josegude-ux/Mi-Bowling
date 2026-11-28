# MI BOWLING · CP004 · PDF oficial FEB Parejas 2026, formato Excel real
**Checkpoint:** MI-BOWLING-PAREJAS-FEB-REAL-CP004-20261128  
**Fecha:** 28/11/2026 · **Estado:** LAB validado; sin publicación ni merge

## Continuidad
- `main` base **1a08c1d738000b8198919178dea8b10c0913cab2** (CP003 desplegado).
- Rama NUEVA aislada: `lab/parejas-2026-clasificacion-feb-real-20261128`.
- Último commit de código/pruebas homologado en GitHub Actions: **4027870500cfccf0088e528e977d29bf0fca754c**.
- Prueba **[46142854626](https://github.com/josegude-ux/Mi-Bowling/actions/runs/46142854626)**: **SUCCESS** · parser+SHA, Chromium con PDF sintético, WebKit con PDF sintético.
- No se ha tocado PWA pública, `main`, datos de Safari, partidas/fotos ni Supabase.

## Fuente real (solo lectura en el chat)
- Archivo aportado por el usuario: `Clasif Serie 1-2.pdf`, dos páginas, Excel exportado PDF con texto seleccionable.
- SHA-256 del archivo original local: `17673c57b707ecfacc1d51049de52ba75bc54493d9a7f1bc25ba773b3a9f0847`.
- No se ha subido el PDF original, sus páginas, ni las puntuaciones reales a GitHub.
- Página 1: «CLASIFICACION 2ª MASCULINA · 1ª SERIE» con 9 parejas completas.
- Página 2: «CLASIFICACION 3ª MASCULINA · 1ª SERIE» con 7 parejas completas y una fila «Total CELTA XUNTA» **vacía**; una segunda fila «Total 0» también vacía.
- Extracción local con `pdftotext -layout` y parser equivalente: **16/16** filas `Total` completas verificadas por suma de seis parciales, `PART=12`, media y máximo, categorías 9+7.
- La pareja del usuario aparece únicamente en la 2ª categoría con puntuaciones válidas. Las filas vacías en 3ª no pertenecen a la clasificación calculable. No deducir una segunda pareja.

## Modificación LAB de alcance mínimo
1. El parser `integracion/parejas-2026-clasificacion.js` reconoce encabezados oficiales `CLASIFICACION 2ª MASCULINA` y `3ª MASCULINA` (también su variante ASCII 2A/3A de test).
2. Extrae solo filas `ORD Total PAREJA [6 puntuaciones de pareja] PART BOLOS PROMEDIO MAXPT`; **ignora filas individuales** de jugadores como participantes separados.
3. Rechaza una fila si le falta categoría, datos, o si no se verifica `PART=12`, `BOLOS=sum(6 parciales)`, promedio = `BOLOS/12` y máximo correcto. Excluye filas incompletas `Total CELTA XUNTA` / `Total 0` de la página 2.
4. Mantiene el formato PDF simplificado anterior, la revisión obligatoria, posiciones y diferencias, historial por jornada/partida, identificación exacta de CELTA XUNTA, no duplicación y escritura protegida existente. No copia los resultados individuales a las partidas y no sobrescribe resultados previos.
5. Actualiza hash SHA-256 y RELEASE LAB del `sw.js`; no borra Service Worker, cachés ni datos históricos.
6. Amplía pruebas puras con texto *ficticio* basado en la estructura oficial y pruebas de navegador con PDF **sintético** (nombres y puntuaciones distintos del original). No utiliza el documento original en CI.

## Verificaciones
- **PASS** datos oficiales en lectura local: 9 filas completas en 2ª, 7 en 3ª, suma y media comprobadas. La tabla de la página 2 contiene una fila CELTA sin puntos, correctamente ignorada.
- **PASS** GitHub Actions 46142854626 · node parser, sintaxis, hashes.
- **PASS** Chromium: PDF ficticio, reconocimiento de filas Total, categorías, ausencia de CELTA duplicado, revisión, varias versiones, persistencia previa conservada.
- **PASS** WebKit motor Safari: mismo escenario ficticio, sin PDF original y sin requerir servidor externo.
- **NO EJECUTADA:** prueba en Safari iPhone físico y guardado de un PDF real dentro de la PWA.
- **NO MODIFICADOS:** `main`, historial real, fotografías, datos personales, otros importadores o parser pdf.js.

## Decisión y siguiente acción
**GO para LAB y candidato de publicación acotada.**  
**NO GO para despliegue** hasta autorización expresa de fusionar/publicar este CP004. Antes de guardar la clasificación en iPhone: mostrar siempre vista previa, verificar 2ª categoría masculina, pareja correcta, posición y acumulado; no aceptar filas vacías de 3ª. No borrar datos locales.
