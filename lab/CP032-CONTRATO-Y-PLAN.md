# MI BOWLING · CP032 · Contrato y alcance LAB

Fuente de producción verificada: main `1fdef63467a980db9a596e3c2c102199ef686022`, 3.3.13-prueba. Branch aislada: `lab/cp032-registro-compacto-v3-20261122`. No merges ni Pages.

## Hallazgos
- v2 `migrate` descarta atributos v3 `entryKind`, `finalOnlyScore`, `count`, `pinDetail`, `pinIds`; no activar escritura de v3 en producción.
- CP013 motor independiente; CP014 proyección v2→v3 exacta; proyección inversa rechaza `count` sin posiciones y `final_only`.
- CP015/CP021 tienen solo sesiones ficticias en memoria; CP018/CP025 trabajan con shadow IDB sintético localhost. No son la persistencia real.
- En LAB, la PWA existente monta el registro compacto únicamente en localhost, contexto seguro, `?cp032lab=ficticio` y sin claves `mi-bowling-`. En presencia de datos se utiliza registro v2 sin alteración.

## Contrato a homologar antes de activar datos reales
1. Persistencia v3 con journal/respaldo, rollback y sin pérdida de v2. IDB real y Safari físico aún pendientes.
2. Reglas semánticas: cantidad no crea posiciones; solo puntuación no crea frames; nunca proyectar v3 desconocido al formato v2 existente.
3. Estadísticas: media incluye partidas finales completas, pero los análisis por bolo, split, pocket, frame y spare solo datos aplicables a su precisión real.
4. Compatibilidad de historial, liga, exportación JSON, PDF/IDB, fotos/CacheStorage y bloqueo Web Locks.
5. Homologar 375×667, 390×844, 393×852, 428×926, 430×932 en navegador real y, antes de publicar, Safari iPhone físico.

## Estado
GO únicamente para pruebas sintéticas en la rama LAB. **NO GO** persistencia real, publicacion, merge, despliegue o manipular datos reales. No repetir suites históricas CP003/CP004/Cachefix2.
