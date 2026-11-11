# BOWLING-CATALOG100-PHOTO-LAB-CP-001 · integración aislada sin fotos copiadas
**Fecha:** 2026-11-11 · **Base:** main 699d877d5ec4f3891ac6c24504a57605105bfb2d · **Branch:** `lab/catalogo100-fotografias-permisos-20261111` · **Estado:** solo LAB. No publicar/fusionar.
**Protocolo recuperado:** `BOWLING-CATALOG100-IMG-PERM-001`, PR #53, `catalogo-bolas/PROCEDIMIENTO-PERMISOS-IMAGENES.md` blob `578c6a9b80a5db32dd5b232ccc4b1ee646cda1b4`. **No duplicado ni modificado.**
**Auditoría recuperada:** `MI_BOWLING_AUDITORIA_IMAGENES_100_LAB_CP010.xlsx`; SHA-256 `c79e52ba8d21cf58f4dee703076057a2cdc87dc664c95d98c2680fc482bb960c`. No se copia el XLSX al repositorio.
**F20 de origen:** PR #53 HEAD 550b635cccf470edc5ee4fda3cba54b41ab02ead; CP-010 comentario 6762946280. PR #54 HEAD 160c19f2d7ef9a75de6bb3586913e389e7116f5b.

## Implementación
- `catalogo-bolas/photo-registry-lab.js`: 100 identidades de `seed` con ID original, marca, modelo, edición literal, aprobación, página de producto y registro de derechos; 14 páginas de producto oficiales exactas, 1 coincidencia **candidata** (Team Brunswick White) y 85 sin página exacta. **0 URLs de archivos de foto; 0 archivos fotográficos; 0 licencias acreditadas.**
- `catalogo-bolas/photo-view-lab.js`: enlace externo únicamente a **página de producto** de una coincidencia exacta. No hay hotlink, descarga, transformación ni incorporación de fotografía comercial. Las 100 tarjetas y modal muestran marcador hasta licencia.
- Una futura foto solo puede renderizarse si el registro de ese **mismo ID/identidad** incorpora `rightsStatus=CONCEDIDA`, titular, referencia documental, alcance explícito **web+pwa**, caducidad vigente y `assetPath` local `./licensed-ball-photos/ref-xxxxxxxxxxxx.webp|avif`. Ningún caso actual cumple estas reglas. La concesión/revocación exigiría autorización separada y revisión del contrato.
- `catalogo-bolas/index.html` en **esta rama** carga los dos módulos, usa el mismo marcador SVG, cuenta/filtra solo fotografías autorizadas (actualmente 0), evita pintar URLs introducidas manualmente y conserva selección/edición/exportación/importación y la **misma clave localStorage** sin migrar ni tocar datos históricos.
- CSS responsive: móvil estrecho, móvil mediano, tablet 651–1023 px y escritorio >=1024 px; proporciones, contenido descriptivo, foco y lectura de enlace. `loading="lazy"`, `decoding="async"`, dimensiones y `object-fit:contain` solo para futuros archivos autorizados. Si falla un archivo autorizado, se retira su `img` y permanece el marcador de reserva.
- **Precaución de privacidad y compatibilidad:** la URL `image` almacenada previamente se mantiene como metadato local por compatibilidad, pero **no se renderiza** sin licencia por ID. No se añade ningún campo obligatorio al arsenal ni se importan datos personales.
- PWA publicada y `main` no cambian. Ningún caché offline de terceros se modifica. Esta rama no incluye imágenes.

## Evidencia y pruebas ficticias
`node tests/catalogo100-photos-lab.cjs`
Verifica 100 IDs exactos, distribución 14/1/85, 0 licencias, inexistencia de IMG sin autorización, URL arbitraria no mostrada, variante candidata no legitimada, y casos sintéticos de concesión, revocación, caducidad, hotlink no permitido y alcance de licencia.
**No se ejecutan Actions/CI remotos ni se abre PR** para evitar gastos y activaciones innecesarias. No deben contarse como aprobadas las pruebas que no se ejecuten.
## Restricciones
Solo LAB; no merge, publicación, carga de fotos reales, permisos por contacto, cambios de PR #53/#54, F20 CP-010, datos reales, historial de 100, 10 bolas, 12 sesiones o FGB CP-020. Gate de futura imagen: documento de derechos acreditado, revisión seguridad, revisión mobile/tablet/desktop, autorizar explícitamente despliegue.