# BOWLING-CATALOG100-PHOTO-LAB-CP-002-LOCAL-VALIDACION-20261111
Fecha: 11/11/2026. Scope: exclusivamente LAB, verificación sin CI remota ni modificaciones de producción.
Checkpoint anterior: `BOWLING-CATALOG100-PHOTO-LAB-CP-001`, branch `lab/catalogo100-fotografias-permisos-20261111`, HEAD inicial `8f62b8f6c668053371df5064b184a3f4260f18c9`, base main `699d877d5ec4f3891ac6c24504a57605105bfb2d`.

## Resultados verificados
- Código auténtico de GitHub ejecutado en V8 aislado: **19 aserciones PASS**, **0 FAIL**. Controles: 100 registros con ID/marca/modelo/fecha correspondientes a las 100 entradas seed; 14 enlaces a páginas de fabricante, 1 correspondencia candidata y 85 sin enlace acreditado; 0 permisos CONCEDIDA y 0 rutas de fotografías.
- Derechos: 100/100 URLs externas de fotografía arbitraria se bloquearon en `photoHTML`; `hasPhoto` devuelve false para los 100 casos. Casos ficticios: concesión con ruta local válida, revocación, caducidad, alcance `web` solo, referencia documental ausente y hotlink externo bloqueados. Candidato Team Brunswick White no se trata como identidad USBC confirmada.
- Prueba local **Node 22**: `node --check` sobre copia local del visor y `node /mnt/data/photo_lab_synthetic/test.cjs` concluyeron sin error (fixture aislada; no entorno completo de aplicación).
- **Chromium local** `/usr/bin/chromium`, Python Playwright, datos 100 % sintéticos y visor aislado: 320 px (1 columna), 390 px (2), 820 px (3), 1280 px (4). En todos: 100 tarjetas, 100 marcadores, 0 `<img>`, 14 enlaces `Ver página oficial`, 1 candidata sin enlace oficial, 0 conexiones externas, 0 desbordamiento, **PASS**.
- CSS responsive y `loading=lazy` /`decoding=async` comprobados en código de GitHub. El HTML base usado en el banco Chromium **reproduce las reglas de diseño del componente**, no sustituye una ejecución del catálogo GitHub completo.
- Inspección estática de `catalogo-bolas/index.html`: el render previo basado en `x.image` queda desactivado; contador y filtro se basan en `hasPhoto()`. No se han copiado fotos ni insertado URL de fotos reales.
- **No se han ejecutado** `node tests/catalogo100-photos-lab.cjs` sobre clon íntegro del repositorio, pruebas de PDF/importación completa, Safari/WebKit físico ni CI remota. Estas verificaciones quedan pendientes, sin declararlas aprobadas.

## Decisión y límites
**Sin defectos nuevos demostrados en el alcance ensayado; no se modifica código ni se promueven licencias.** Se registra únicamente evidencia documental en este checkpoint. Antes de aceptar permisos reales: validar titular y alcance, prueba de revocación y caducidad, archivo de imagen local autorizado y regresión integrada PWA; requerirá autorización separada para publicar.

## Protecciones
main `699d877d5ec4f3891ac6c24504a57605105bfb2d`; PR #53 `550b635cccf470edc5ee4fda3cba54b41ab02ead`; PR #54 `160c19f2d7ef9a75de6bb3586913e389e7116f5b`; ambas abiertas/borrador. CP-010 (comentario 6762946280), CP-001, catálogo de 100, archivo histórico, selecciones, 10 bolas, 12 sesiones, FGB CP-020, PWA y datos reales no modificados. Sin merge, despliegues, contactos, imágenes reales, nuevas PR ni gastos voluntarios.

La nueva revisión se agrega solo a la rama `lab/catalogo100-fotografias-permisos-20261111` con `[skip ci]`.