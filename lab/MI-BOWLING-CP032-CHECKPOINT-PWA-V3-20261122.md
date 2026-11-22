# MI BOWLING · CP032 · Checkpoint PWA v2/v3
ID: **MI-BOWLING-CP032-CHECKPOINT-PWA-V3-20261122-003**  
Fecha: 22/11/2026 · Exclusivamente LAB · **NO GO producción**

## Identidad y base exacta
- Repositorio: `josegude-ux/Mi-Bowling`.
- Producción `main`: `1fdef63467a980db9a596e3c2c102199ef686022`, `3.3.13-prueba` (**sin cambios**).
- Rama autorizada: `lab/cp032-registro-compacto-v3-20261122`.
- Commit de código y pruebas verificado: `a87866f7adcf55c3bd7971f613634fd0a5f904d6`.
- Versión declarada solo LAB: `3.3.14-lab-cp032-1`. No hay despliegue ni URL pública de esta candidata.
- No hay PR de fusión ni publicación autorizadas.

## Trabajo nuevo realizado
1. `lab/cp032-pwa-adapter.js`: adaptador de contrato sin I/O entre formato real de la PWA y v3. Usa las **ocho claves** de `integracion/autoridad-local.js` y `integracion/respaldo-local.js` mediante mapas ficticios, conserva el JSON v2 exacto y rechaza IDs que no sean de laboratorio.
2. `lab/cp032-fixture.js`: sesiones v2 ficticias, liga nacional ficticia con enlaces a partidas v2 y v3, resultados rápidos y enlaces rotos expresamente representados, arsenal y bola retirada ficticios, selecciones y patrón ficticios, metadatos de foto y PDF sin binarios.
3. Proyección `lab/cp032-history-stats.js` y adaptador: historial v2+v3, exclusión de rivales `leagueOther` de estadísticas personales, medias de partidas completas, frames solo cuando hay tiradas, estadísticas por bolo solo con posiciones reales conocidas; partidas incompletas excluidas de estadísticas por lanzamiento. Liga con resultado enlazado validado, rápido o pendiente; sin sustituir enlaces rotos por puntuaciones inventadas.
4. `lab/registro-cp021/cp021-entry.js`: controles LAB para cargar ejemplo realista ficticio, consultar historial/estadísticas, exportar copia ampliada y restaurar un JSON ficticio sellado. No se guarda automáticamente ni se usan claves personales.
5. `lab/cp032-v3-journal.js`: validación fail-closed de espejo ficticio v2 dentro de documento v3 antes de cada grabación. Persistencia exclusivamente en IndexedDB `mi-bowling-cp032-synthetic-v3` con CAS, revisión monotónica, journal, recuperación y rollback; no se conecta al almacén real.
6. `index.html` y `sw.js` exclusivos de LAB: carga de los dos nuevos scripts, 71 entradas SHA-256 coherentes y actualización de identificador de caché; lógica de activación y Cachefix2 sin alterar.
7. Nuevos tests `tests/cp032-pwa-adapter.cjs`, `tests/cp032-pwa-bridge-browser.cjs`; ajuste de conteo 69→71 en el test CP032 del journal, necesario por los dos recursos añadidos. Ningún test CP003/CP004 fue modificado.

## Evidencia verificable
- Contratos v2/v3, datos de liga, enlace ausente, selecciones, activos retirados y copia ampliada sellada: **SUCCESS** run [45030574028](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45030574028).
- PWA real de LAB en Chromium sobre localhost; carga muestra, guardado, reinicio, descarga JSON, rechazo SHA-256 alterado, restauración y cero claves personales: **SUCCESS** run [45030959823](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45030959823).
- Journal y recuperación ante fallos simulados, precisión de estadísticas y manifest **71/71**: **SUCCESS** run [45031094923](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45031094923).
- Las cinco resoluciones sin scroll y los tres modos ya estaban superados en run [45028031525](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45028031525), sin repetirlas en esta fase.

## Invariantes protegidos
- `main` y la PWA publicada no se modifican.
- Datos personales, fotografías originales, PDF reales, historial existente y claves de almacenamiento reales no se leen, escriben, migran ni restauran.
- `CP003`, `CP004`, `Cachefix2` y pruebas históricas se conservan.
- La maqueta CP032 solo se activa con `localhost` o `127.0.0.1`, contexto seguro, parámetro `?cp032lab=ficticio`, ocho claves declaradas y ausencia de cualquier clave local `mi-bowling-*`. Si existen datos, no se activa.
- El formato v2 no puede recibir registros count-only o final-only sin perder precisión; toda proyección que inventase bolos o frames se rechaza.

## Decisión
- **GO LAB**: integración sintética v2/v3, contratos, proyección de historial/liga/estadísticas, respaldo ampliado, restauración, journal y un caso Chromium real.
- **NO GO**: migración de datos personales, sincronización con el almacenamiento real bajo Web Locks, compatibilidad de PDF/fotos binarios reales, sustitución del motor v2 productivo, Safari físico, fusión o despliegue.
- Próxima fase, solo con nuevo mandato: diseñar transacción de producción sobre copias anónimas y probar aislamiento/concurrencia, importación PDF/IDB y Safari físico antes de solicitar autorización de publicación.

**Condición de continuidad:** mantener esta rama y su último HEAD; no repetir suites cerradas salvo cambios directamente afectados.
