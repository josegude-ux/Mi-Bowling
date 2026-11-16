# MI BOWLING · CATÁLOGO 100 → MIS BOLAS · Integración LAB (10/11/2026)

**Orden:** BOWLING-CATALOG100-ARSENAL-LAB-001. **Estado:** en LAB, no publicado.  
**Base:** `main=699d877d5ec4f3891ac6c24504a57605105bfb2d` verificada antes de crear rama.  
**Rama aislada:** `lab/catalogo100-mis-bolas-integracion-20261110`. Sin cambios en `main`, PWA `sw.js`, FGB CP-020, sesiones reales, PR #53 ni datos particulares.

## Problema confirmado

La aplicación publicada contiene el catálogo de «Mis bolas» de 10 fichas históricas más 21 referencias adicionales, accesible desde `Análisis → Ver mis bolas → Catálogo`. La plantilla independiente de 100 referencias está publicada en `/catalogo-bolas/` (PR #52), pero no estaba integrada en «Mis bolas». PR #53 es un LAB separado (enriquecimiento de 20 fichas y PDF USBC auténtico); **no se incorpora ni publica por esta orden**. El top 100 inicial es una **muestra publicada de referencias recientes**, no el top 100 absoluto confirmado de la lista USBC actual.

## Cambios en rama LAB, sin mezclar bases

- `catalogo100-mis-bolas-bridge.js` contiene exactamente las identidades, IDs y fechas de las **100 semillas ya publicadas** en `catalogo-bolas/index.html`. No agrega fotos o especificaciones. Si el almacenamiento de la plantilla independiente es compartido con la app instalada, puede leer un snapshot de exactamente 100 entradas tras validar sus campos; si no, mantiene la plantilla semilla. **La independencia del almacenamiento de iOS / Safari / PWA no está garantizada.**
- `arsenal-view-lab.js` añade una pestaña «100 bolas · plantilla» **dentro** de «Mis bolas», con búsqueda por marca, modelo y fecha, estado «ya registrada» para evitar duplicados, acceso a la página independiente e importación de JSON seleccionado.
- `app.js` conserva los contratos `mi-bowling-analitica-v2`, `mi-bowling-ball-selection-v1`, esquema v2, estadísticas y partidas. En alta individual o por lote solo usa **marca y modelo** con ID nuevo; no copia técnicas, fotografías, peso ni notas del fichero. Las nuevas bolas NO se seleccionan automáticamente. Rechaza guardar si detecta edición desde otra pestaña; si falla cuota de almacenamiento, revierte las altas del lote. El lote exige archivo JSON válido exportado desde la plantilla, tamaño máximo 1 MiB y confirmación explícita tras señalar nuevas vs existentes.
- `index.html` carga el bridge antes del módulo de vista. **No se ha alterado `sw.js`** ni su versión `mi-bowling-analitica-v3-3-10-catalogo-cp037`. Offline tras una primera navegación en línea queda sujeto al caché de runtime; no se declara precache obligatorio de un recurso nuevo ni actualización publicada.
- `tests/catalogo100-arsenal-bridge-lab.cjs` comprueba paridad exacta 100/100, snapshots corruptos, esquema/selecciones, datos ficticios con 10 bolas y 12 sesiones, alta, idempotencia, lote confirmado, recarga, histórico sin variaciones, web móvil/desktop y PWA offline tras cacheo en navegador emulado.
- `.github/workflows/catalogo100-arsenal-lab.yml` exige Node estático/regresión y navegadores Chromium/WebKit para `push` y PR sobre SHA exacto.

## Restricciones y riesgos

**Sin publicar ni fusionar.** No se modifican `catalogo-bolas/index.html`, `sw.js`, perfiles históricos, selección real, patrones ni partidas. No hay fotografías copiadas ni derechos de reproducción asumidos; nombres técnicos, RG, diferencial, núcleo, superficie, taladro y peso quedan vacíos hasta comprobación documentada. USBC aprueba modelos, pero esto no equivale a autorización vigente en todo torneo, prueba de procedencia ni ficha técnica de 15 lb. Los nombres homónimos de distintas versiones/pesos no se identifican automáticamente como equivalentes reales; si hay coincidencia de marca/modelo, se bloquea el alta duplicada sin reemplazar la bola previa. Confirmar variante antes de añadir manualmente.

Las pruebas solo utilizan **datos ficticios** y navegadores Chromium/WebKit en Linux; no se ha ejecutado en Safari/iPhone físico ni se ha verificado disponibilidad en una PWA instalada. Se respetan las condiciones de uso de fotografías y PDF de terceros; no se copia PDF, fotos ni 100 fichas enriquecidas de PR #53.

## Puertas de aceptación

1. CI funcional `push` y PR **SUCCESS 2/2** (Node + navegador) en mismo SHA de código. En caso de fallo, corregir solo defecto demostrado y repetir en nuevo SHA, conservar runs fallidos como evidencia.
2. Agregar checkpoint funcional `BOWLING-CATALOG100-ARSENAL-CP-001` **solo tras verificaciones** en este documento; al generar nuevo HEAD, exigir CI documental `push` y PR **SUCCESS 2/2** exactamente en ese SHA.
3. Cerrar el checkpoint definitivo únicamente en **descripción de PR LAB** tras la doble verificación, sin otro commit posterior. No merge ni deploy. Conservar continuidad para auditoría iPhone físico, revisión de variantes, permiso de fotografías y decisión de publicación por separado.

**Estado tras control funcional:** el código está aprobado y la validación documental es el último gate; no declarar checkpoint definitivo hasta confirmar las dos CI documentales SUCCESS 2/2 en el HEAD nuevo.

## Checkpoint funcional verificado · BOWLING-CATALOG100-ARSENAL-CP-001 (cierre documental pendiente)

**Evidencia primaria GitHub verificada el 10/11/2026.** [PR #57](https://github.com/josegude-ux/Mi-Bowling/pull/57) abierta, Draft, **sin fusionar**, base `main`.

| Gate | SHA funcional exacto | GitHub Actions | Estado y jobs |
|---|---|---|---|
| Funcional push | `71b3ccd0d5981548cedbde503d38e28d2b9101ca` | [42819970032](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42819970032) | **COMPLETED SUCCESS 2/2** (Node + navegador) |
| Funcional pull_request | `71b3ccd0d5981548cedbde503d38e28d2b9101ca` | [42819981848](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42819981848) | **COMPLETED SUCCESS 2/2** (Node + navegador) |

**Resultados funcionales respaldados:** 100 identidades de plantilla coincidentes con la fuente ya publicada; 10+21 modelos existentes conservados; búsqueda en 100, alta unitaria y selección JSON confirmada e idempotente, sesiones y bolas ficticias (10/12) sin modificaciones previas, validación de snapshots corruptos, recarga, uso offline después de visita online; Chromium 390×844/1280×900 y WebKit Linux 390×844 emulados; FGB CP-020, 31 entradas (10 gallegas + 21 nacionales), e inicio/nav sin regresión.

**Fallos históricos de CI, conservados:** rutas de prueba antiguas ajenas a este flujo, comparaciones antes de normalización de fixtures y comprobación de caché transitoria, corregidos en la misma rama mediante nueva CI. No borrar ni interpretar los runs fallidos como éxitos. Un workflow paralelo de auditoría de CP-036 presenta expectativa anticuada frente al caché publicado CP-037; **NO** se ha alterado el Service Worker ni se declara que esa auditoría esté resuelta.

**Integridad y aislamiento:** base de revisión `main=699d877d5ec4f3891ac6c24504a57605105bfb2d`; diff funcional: 7 archivos, ninguno de los archivos publicados `sw.js` o `catalogo-bolas/index.html`, ni los del calendario FGB. Sin datos personales, fotos copiadas, nuevas fichas técnicas inventadas, publicaciones, fusiones, cambios en `main` ni modificaciones a PR #53.

**Advertencias permanentes:** estas 100 semillas son referencias recientes de la plantilla inicial, no un TOP 100 actual absoluto USBC probado; los registros locales de plantilla no demuestran procedencia externa ni equivalencia entre variantes. La caché runtime offline requiere una carga online previa; WebKit en Linux emulado **no es Safari/iPhone físico**. Sin pruebas en la PWA realmente instalada, ni permisos para redistribuir fotografías.

**Siguiente gate obligatorio:** este commit modifica **solo el presente documento**, con un nuevo HEAD documental. Confirmar los runs GitHub Actions de **push y pull_request** en ese HEAD, **ambos SUCCESS 2/2**. Solo entonces registrar cierre definitivo y continuidad **exclusivamente en el cuerpo de PR #57**, sin commits posteriores. Si el gate documental falla o permanece en curso, `BOWLING-CATALOG100-ARSENAL-CP-001` sigue pendiente de cierre.
