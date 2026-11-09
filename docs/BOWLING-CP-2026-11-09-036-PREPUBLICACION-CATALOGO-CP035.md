# BOWLING-CP-2026-11-09-036 · Prepublicación del catálogo CP-035 — SIN EJECUTAR

**Estado:** CANDIDATA PREPARADA Y VALIDADA EN CI · NO FUSIONADA · NO PUBLICADA.  
**Fecha:** 9 de noviembre de 2026 (Europe/Madrid).  
**Repositorio:** `josegude-ux/Mi-Bowling`.  
**PR de preparación:** https://github.com/josegude-ux/Mi-Bowling/pull/29 — `draft`, apuntada a `main`.  
**Rama candidata aislada:** `release/catalogo-cp035-preparado-20261109`.  
**Código EXACTO validado:** `1bddfc452d5dbccb9471f369b72ddd0026570236`.  
**CI candidata SUCCESS:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42586503541 (job `129057492415`).  
**Base `main` publicada 3.3.9:** `6dd7d486268a4ba23302559bebf209d531cc4964`.  
**Respaldo dedicado previo a futura publicación:** `backup/main-antes-catalogo-cp035-20261109`, exacto `6dd7d486268a4ba23302559bebf209d531cc4964`.  
**Respaldo histórico anterior:** `backup/main-antes-publicacion-arsenal-f1-20261109` → `566aafdc05be163baf8c7f82e60433b0f532d748`.

## Origen y compatibilidad

- Punto inicial: PR #27 (CP-035), rama `feature/arsenal-catalogo-seleccionable-f2-lab-20261109`, HEAD documental `266892c9f586dcf40fc6cbdd4ef04c797cbf6410`.
- Código y pruebas de CP-035: `0b1ff0dacb55a7928c7c08b334f6a7d211508790`, CI anterior SUCCESS: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42585422584.
- Comparación de candidata respecto a `main` a fecha de checkpoint: `ahead` (sin commits por detrás), exclusivamente `app.js`, `index.html`, `sw.js`, `styles.css`, `arsenal-insights.js`, `arsenal-view-lab.js`, workflow de CI, documentación LAB y tests. Sin commits de otras PR.
- Se preserva `KEY='mi-bowling-analitica-v2'` y `db.version=2`; sin alteración del esquema de bola, IDs de partidas, `rolls[].ballId`, PDF de patrones, calendario, puntuación, copias JSON ni cuentas. No se purgan datos locales.
- PR #19 (análisis y asistente originales) sigue abierta `draft`; PR #25 (almacenamiento cifrado) sigue abierta `draft`, independiente; PR #27 sigue abierta `draft`. NO fusionar ni alterar esas PR para la publicación de #29.

## Preparación de versión y PWA

- Versión visible prevista: `3.3.10-catalogo`. La producción **sigue 3.3.9-arsenal-f1** hasta aprobación y despliegue.
- Caché SW candidato: `mi-bowling-analitica-v3-3-10-catalogo-cp035`, separada de la de producción `mi-bowling-analitica-v3-3-9-arsenal-f1`.
- URL de app/CSS candidata: `app.js?v=3310cat1`, `styles.css?v=3310cat1`.
- Módulos del catálogo y asistente: `arsenal-insights.js?v=arsenal-catalog-cp035`, `arsenal-view-lab.js?v=arsenal-catalog-cp035`.
- Los dos módulos, así como JS/CSS versionados, forman parte del precaché. El orden en HTML es calendario oficial → datos del arsenal → interfaz de arsenal → app.
- El test de prepublicación `tests/release-catalog-cp035-smoke.cjs` comprueba explícitamente nombres, orden, recursos precacheados sin duplicados, diez perfiles e inclusión del alta automática; sin cambios de identidad del manifest ni nuevos campos.

## Evidencias de regresión

**GitHub Actions SUCCESS sobre `1bddfc452d5dbccb9471f369b72ddd0026570236`:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42586503541.

- PASS iconos 180/192/512, manifest y caché; portada, navegación y ajustes visuales.
- PASS calendario FGB de **31 fechas** (10 gallegas, 21 nacionales), filtros y offline.
- PASS navegador Chromium/WebKit móvil y escritorio emulados; ocho combinaciones responsivas, PWA offline y copia JSON ficticia exportada/restaurada.
- PASS F1 de selección por sesión/lanzamiento, obsolescencia entre pestañas, retiradas y correcciones de tirada sin cambiar el historial.
- PASS catálogo 10 modelos, datos técnicos, comparador, propuestas 3/4/6 y guía de cuatro problemas.
- PASS alta desde búsqueda, no duplicar modelos ni retiradas/alias, cuota simulada, historial ficticio y control de pestañas; alta con la PWA offline comprobada en Chromium.
- PASS prevuelo release: `3.3.10-catalogo`, caché actualizada y assets.
- Datos de prueba exclusivamente ficticios. No se ha probado la nueva versión en Safari de un iPhone físico, no se ha leído el almacenamiento de su PWA real.

## Control de publicación — autorización EXPRESA pendiente

**PROHIBIDO fusionar o publicar automáticamente.**

Solo cuando el usuario lo autorice expresamente para **PR #29 / CP-036**:
1. Volver a leer `main`, respaldo, HEAD de PR #29 y resultado CI. Si cualquiera ha cambiado o la CI exacta no es `SUCCESS`, reconciliar en LAB y revalidar antes de publicar.
2. Confirmar que el diff sigue acotado y que PR #19 / #25 / #27 quedan independientes.
3. Fusionar **solo** PR #29 con compare-and-swap del SHA HEAD comprobado (no incorporar PR #19, #25 ni #27 por separado).
4. Verificar **GitHub Pages completed/success** del nuevo `main` y que la versión visible es `3.3.10-catalogo`, sin dar por actualizada la instalación local del iPhone hasta observarlo.
5. En Safari/iPhone real, verificar versión de Ajustes, búsqueda, alta de un modelo de prueba, checkbox y recarga. Mantener el acceso antiguo hasta verificar. El respaldo JSON del usuario no debe eliminarse.
6. Si hay un fallo que requiera reversión, preparar **revert por PR independiente** contra `main` y probar antes de desplegarlo. No forzar/resetear `main` al SHA previo sin autorización.

**Checkpoint final del presente encargo:** toda preparación de código, CI y seguridad está realizada; el único siguiente permiso necesario es la **autorización explícita de publicar**. La PR #29 debe permanecer draft y sin fusionar mientras no exista.
