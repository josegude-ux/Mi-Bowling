# BOWLING-CATALOG100-PHOTO-LAB-CP-004-MULTITAB-20261111

**Ámbito:** únicamente `lab/catalogo100-fotografias-permisos-20261111`. **Base inicial:** `48a283f3c6d1a2859a6baeb453d69782dc4f8b0f`. Fecha: 11/11/2026.

## Defecto nuevo realmente reproducido
Se recuperó el código real del catálogo (LAB CP-003) y se simularon **dos pestañas compartiendo la misma clave local**. Pestaña A importó un PDF ficticio de 100 referencias y archivó una ficha desplazada. La pestaña B, abierta antes, marcó una bola: su `saveLocal()` sobrescribió el almacenamiento con el estado antiguo, eliminando el archivo y el nuevo registro del top 100. Quedó documentado como **pérdida de historial y cambios nuevos**. Se trató de almacenamiento 100 % ficticio.

## Cambio correctivo
Se añade detección de estado de almacenamiento obsoleto mediante comparación del valor leído al abrir/guardar contra el valor más reciente antes de escribir. Se centraliza la escritura en `commitLocalState()`; las selecciones, fichas y restauración revierten sus cambios en memoria si no se puede guardar. La importación de PDF revierte de forma coherente el estado anterior y advierte sobre el conflicto, sin sobrescribir lo importado por otra pestaña. Las pestañas actuales siguen pudiendo guardar.

**Límite técnico:** comparación optimista en localStorage, no transacción CAS atómica entre procesos simultáneos. Esta protección demuestra el bloqueo de pestañas obsoletas **secuenciales**, pero no garantiza exclusión mutua ante dos escrituras estrictamente simultáneas. No afirmar validación completa de concurrencia sin pruebas adicionales.

## Nuevas pruebas, sin repetir trabajo cerrado
Se ejecutó en entorno V8 aislado código JS original recuperado de GitHub y versión correctiva local con dos pestañas ficticias. **10/10 PASS**, incluyendo pérdida histórica reproducida antes del cambio, bloqueo de selección, edición, reset e importación obsoletos, mensaje de conflicto, carga desde pestaña actual, guardado vigente y aislamiento de la clave PWA. Prueba automatizada para Node `tests/catalogo100-photo-multitab-lab.cjs` incluida en esta rama; **NO ejecutada en Node**, ya que el entorno local no pudo clonar GitHub por DNS (sin CI remota ni gasto). Los 26 checks de CP-003 y 19+4 de CP-002 no se han repetido; regresión integral Node/Playwright pendiente.

## Protecciones
No se modifica `main` (699d877d5ec4f3891ac6c24504a57605105bfb2d), PR #53 (550b635cccf470edc5ee4fda3cba54b41ab02ead), PR #54 (160c19f2d7ef9a75de6bb3586913e389e7116f5b), CP-010/CP-001/CP-002/CP-003, 100 referencias `seed`, catálogo técnico 10/20, FGB CP-020, 10 bolas, 12 sesiones, histórico real, PWA o datos personales. Registro de 100 imágenes y `photo-view-lab.js` no se modifican; 0 licencias, 0 fotografías copiadas, 0 contactos. No merge/despliegue/CI remota/costes solicitados.
