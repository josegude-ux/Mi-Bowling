# MI BOWLING · Parejas 2026 · Clasificación PDF y marcador de Lázaro
**Checkpoint:** MI-BOWLING-PAREJAS-CLASIFICACION-LAB-CP003-20261126  
**Fecha:** 26/11/2026 · **EXCLUSIVAMENTE LAB — NO PUBLICADO**

## Continuidad y baseline
- Versión publicada a partir de CP002: `main a12e10dfb21d87e251399c49bbb7558def6c42ce`. La rama anterior `lab/parejas-2026-registro-20261126` y la PR #84 histórica permanecen sin cambios por este desarrollo.
- Rama LAB creada desde ese `main`: `lab/parejas-2026-pdf-clasificacion-20261126`.
- Commit de código y tests completamente homologado en runner: `cea786c74716ac2c9a544680829c25bd0da74541`.
- No se hace merge, no despliegue, no Supabase, no cambios de fotos, puntuaciones ni historial real. Datos exclusivos de pruebas, en origen localhost efímero.

## Funcionalidad
1. **Lázaro Galguera:** puntuación 0–300 opcional para cada una de las seis partidas de sábado 28 y domingo 29 de noviembre; editar desde resumen de torneo y grabar desde resultado del registro compacto. Total de pareja solo cuando ambas puntuaciones están completas; totales individuales siempre separados.
2. **Clasificaciones PDF:** botón «Clasificación general · Importar PDF» desde el preparador del campeonato, selector de archivo desde Safari, pdf.js **ya incluido** en `vendor/pdfjs/` (carga local/compatible offline). No se envía el PDF a servidor, ni se persiste el archivo original. El importador rechaza archivos mayores de 8 MB o sin firma PDF, más de 12 páginas, sin capa de texto o sin tabla reconocida.
3. **Revisión obligatoria:** tabla editable antes de guardar con selección de filas, posición, pareja, categoría (2.ª/3.ª) y bolos acumulados; casilla expresa de conformidad. No inventa categoría ni puntuaciones. Exige que CELTA XUNTA esté identificada una vez en la categoría elegida; evita posiciones duplicadas y totales inválidos.
4. **Versiones:** hasta 36 instantáneas por jornada en el campo adicional `session.parejas2026.rankings[]` del esquema v2, con día, partida 1–6, categoría, filas revisadas, nombre de fichero, SHA-256 y fecha de confirmación. Una nueva versión no sobrescribe otras; PDF idéntico para el mismo día y partida se bloquea como duplicado.
5. **Clasificación:** fila CELTA XUNTA, posición, bolos, diferencia con 1.º/3.º/equipo inmediatamente anterior y variación respecto a la versión precedente de la misma categoría. Nunca describe la clasificación como "en directo".
6. **Persistencia:** sin nuevas claves de almacenamiento ni tablas. La función `migrate()` recupera el campo `parejas2026`; escritura de snapshot mediante el `MiBowlingEscritura.write(KEY,...)` exclusivo/journal y cambio del estado `db` **solo tras confirmarse la escritura**. El respaldo cifrado existente de la PWA puede incluir el contenido estructurado si está activado; el PDF original jamás se incorpora al registro.
7. **Compatibilidad WebKit:** en el nuevo lector se utiliza `page.streamTextContent().getReader()` en lugar de `getTextContent()` debido a que el último dependía de iteración asíncrona de ReadableStream no disponible en el WebKit probado. `vendor/pdfjs/` y el importador de Liga previo se mantienen intactos.
8. **PWA y offline:** caché de 71→72 entradas con SHA-256 actualizado para `index.html`, el nuevo módulo, registro compacto y app; recursos pdf.js existentes conservados. No se borra la caché anterior ni se toca Cachefix2.

## Calidad: pruebas verificables
**RUN FINAL [45810097499](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45810097499): COMPLETED SUCCESS** en `cea786c74716ac2c9a544680829c25bd0da74541`.

- PASS: sintaxis, modelo por categorías, puntuaciones de Lázaro independientes, snapshots/versiones/duplicados y hashes SHA-256.
- PASS: Chromium, PDF sintético vectorial (no un PDF real), selección local, extracción, revisión y confirmación; rechazo de duplicado y de PDF sin tabla; dos versiones, cálculo de clasificación, domingo, recarga e historial ficticio previo intacto.
- PASS: WebKit motor Safari, mismo caso PDF sintético y sin lecturas externas.
- PASS: regresión de preparador CP002 en Chromium — seis partidas, avance +2 editable, límite séptima, domingo, persistencia.
- PASS: misma regresión CP002 en WebKit.
- Pruebas generadas con `tests/parejas-2026-fixture-pdf.cjs`; no se utilizaron datos reales, la FEB no proporcionó aún un PDF de clasificación para homologar el formato.
- La prueba de WebKit se realizó en el runner, **no** en Safari de iPhone físico.

## Exclusiones / riesgos conocidos
- **Formato PDF oficial pendiente:** la tabla provisional permite `POS [CAT] PAREJA [PART] BOLOS` y encabezados de categoría. Si el primer PDF de la organización difiere, adaptar exclusivamente el parser tras examinar ese documento; no forzar importaciones ni aplicar datos incorrectos.
- **Escaneados/imagen:** no se ejecuta OCR ni reconocimiento visual; solo PDFs con texto extraíble. El rechazo es explícito y reversible, sin guardar.
- **Categoría real de CELTA XUNTA:** la circular de orden muestra 2.ª y 3.ª en conjunto; no se presume cuál corresponde sin confirmación. El usuario debe seleccionar/verificar la categoría en la tabla.
- No se importa el marcador de Lázaro desde otro dispositivo, ni se alteran sus estadísticas, ni se modifica el programa de pistas.
- No se ha homologado Safari físico ni almacenamiento real del iPhone.
- Se protege el historial real: no se lee, descarga, migra, edita ni restaura para probar este cambio.

## Decisión
**GO — implementación y regresión automatizada en LAB.**  
**NO GO — publicación/merge, hasta nueva autorización específica;** revisión del primer PDF oficial antes de prometer compatibilidad de su plantilla.
