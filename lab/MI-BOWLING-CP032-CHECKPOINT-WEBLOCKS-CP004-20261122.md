# MI BOWLING · CP032 · Checkpoint 004 · Estrategia de migración v2/v3

**Identificador:** MI-BOWLING-CP032-CHECKPOINT-WEBLOCKS-CP004-20261122-004  
**Fecha:** 22 de noviembre de 2026 · Exclusivamente LAB · **NO GO producción**

## Identidad verificada
- Repo: `josegude-ux/Mi-Bowling`.
- Producción: `main` = `1fdef63467a980db9a596e3c2c102199ef686022` (PWA `3.3.13-prueba`), sin cambios.
- Rama: `lab/cp032-registro-compacto-v3-20261122`, continuación exacta de checkpoint `003`.
- Código CP032 probado: `df4f0f6faefd2113ffe7ae08b9b02521b7c9cc80`.
- Base CP032: `4524c9ff730a0c1a30dbd0c68fe4bbc3a011a473`.
- Runs anteriores conservados: [45030959823](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45030959823) SUCCESS y [45031094923](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45031094923) SUCCESS.

## Auditoría del contrato original
1. `integracion/autoridad-local.js`: ocho claves gestionadas en LocalStorage; Web Lock exclusivo `mi-bowling-f1-exclusive-writer-v1`, sin fallback optimista; journal y verificación/rollback de los valores gestionados.
2. `integracion/respaldo-local.js`: valida exactamente el mapa de claves, datos v2, liga y selecciones; no admite incrustar tiros `count` o `final_only` en el formato de producción v2 sin adaptación.
3. `integracion/respaldo-pdf-f1.js` (CP003): respalda el prefijo de claves locales y los PDF de IndexedDB `mi-bowling-patrones-pdf/pdf`; guarda hash SHA-256 y tamaño. No respalda fotografías de CacheStorage, borradores abiertos ni recursos precacheados.
4. `integracion/recuperacion-integral.js` (CP004): valida el respaldo, usa journal separado, recuperación y protocolo compensatorio para LocalStorage+PDF. **No es una transacción atómica distribuida.**
5. `integracion/fotos-privadas.js`: paquete de fotos privadas por dispositivo en CacheStorage. No se agrega a CP003/004; debe conservarse por separado.
6. `lab/cp032-v3-journal.js`: sidecar v3 exclusivamente ficticio, en base IndexedDB aislada. La coordinación entre CP004 y v3 necesita una fase de recuperación interalmacenes no homologada todavía.

## Estrategia ensayada (LAB, únicamente ficticios)
- Precondición: origen desechable `127.0.0.1`, contexto seguro, marcador `?cp032lab=ficticio`, ninguna clave personal `mi-bowling-*`, todas las identidades de muestra ficticias.
- Bloqueo: probar `navigator.locks.request` con el **nombre real** del Web Lock y `ifAvailable:true`; otro acceso simultáneo no obtiene permiso ni debe iniciar escritor.
- Fuentes: memoria inyectada con las mismas ocho claves (sin usar el LocalStorage de la PWA); partida v2 y acta de liga ficticias, documento v3 ficticio con espejo exacto del mapa v2.
- Respaldo: usar los módulos CP003/CP004 originales para crear y validar un respaldo con PDF falso real en un IndexedDB aislado en el origen local; SHA-256, MIME, PDF header y relación de patrón.
- Fotos: observar únicamente un valor ficticio en CacheStorage (sin abrir ni importar fotografías de usuario) antes y después de todas las operaciones.
- Paso 1: validar v2, PDF, foto ficticia, JSON y revisión v3 sin cambios; detenerse ante diferencias.
- Paso 2: preparar y guardar el sidecar v3 sintético mediante journal y revisión esperada.
- Paso 3: ejecutar CP004 sobre estado v2/PDF sintético usando el lock; verificar el respaldo ampliado final.
- Paso 4: comprobar invariantes de v2, documento v3, hashes y foto ficticia. En fallo simulado, ejecutar recuperación CP004 y compensación v3; ante cualquier conflicto adicional, detenerse y conservar la evidencia.
- Restricción crítica: **la reversión ensayada solo cubre fallos controlados en el mismo proceso y con el bloqueo vigente. No equivale a recuperarse automáticamente tras un cierre brusco, pérdida de energía o interrupción real de Safari.**

## Nuevos archivos de LAB
- `lab/cp032-migration-simulation.js`: coordinador de simulación solo con almacenes inyectados, validación previa, etapas v3/CP004, dos puntos de fallo, verificación y compensación.
- `lab/cp032-migration-harness.html`: página de prueba con guardas de localhost/contexto seguro y claves personales ausentes; sin incorporar código a la PWA publicada.
- `tests/cp032-migration-strategy-browser.cjs`: un único caso nuevo Chromium (sin repetir cinco tamaños ni suites históricas), Web Locks reales, CP003/004, PDF en IndexedDB, sidecar v3, simulación de fallos tras v3 y CP004, rechazo de un PDF corrupto, comprobación de foto ficticia inalterada.
- `.github/workflows/cp032-migration-strategy-lab.yml`: CI solo de LAB, permisos de lectura, sin publicación ni secretos.

## Pruebas y resolución de incidencia
- Run inicial [45032960486](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45032960486): FAIL controlado por un error del simulador al comparar un campo inexistente (`old.raw`) en lugar del campo real de CP003 (`old.rawAll`). No llegó a modificar estado real.
- Corrección limitada exclusivamente al simulador y su test.
- **Run definitivo [45033113588](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45033113588): SUCCESS**.
- Evidencia de log: `CP032 MIGRATION STRATEGY PASS · real Web Locks contention, synthetic CP003 PDF/IDB and CP004 restore, v3 journal, SHA, compensation after V3/CP004, photos unchanged; production untouched.`
- Confirmación por comparación de commits: **solo cuatro archivos nuevos/alterados** en `lab/`, `tests/` y `.github/workflows/`; sin diferencias en CP003/CP004, Cachefix2, `main`, `index.html`, `sw.js` ni fotos.

## GO / NO GO
- **GO LAB:** estrategia y ejecución de migración ficticia inyectada; bloqueos Web Locks; validación CP003/004 PDF; sidecar v3 y compensación de fallos simulados; conservación de metadata de liga/historial; fotografía ficticia intacta.
- **NO GO producción:** coordinación atómica v2/PDF/v3; recuperación tras cierre brusco Safari o caída durante transición entre stores; evolución del esquema y copias reales; fotos binarias/CacheStorage real; prueba en Safari físico y datos de usuarios; merges y despliegues.
- **Siguiente acción técnica**: diseñar y homologar un journal duradero de intención **interalmacenes** con reglas de reanudación/rollback y test de caída real en nuevo contexto aislado. Después auditar la compatibilidad de respaldo ampliado v3 y asegurar paquete separado de fotos, con autorizaciones futuras diferenciadas.

**Prohibiciones respetadas:** no usar datos reales, no publicar, no desplegar, no fusionar, no modificar `main`, no repetir pruebas históricas CP003/CP004/Cachefix2.
