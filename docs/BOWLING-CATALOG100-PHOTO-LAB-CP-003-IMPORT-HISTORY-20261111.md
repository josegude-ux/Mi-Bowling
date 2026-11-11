# BOWLING-CATALOG100-PHOTO-LAB-CP-003-IMPORT-HISTORY-20261111

**Estado:** corrección LAB aislada · **rama:** `lab/catalogo100-fotografias-permisos-20261111` · **base:** `bf0c4399cb98fae824c207616c2e410c8b65eff8`. Fecha: 11/11/2026.

## Defectos reproducidos (antes de corregir)
1. **ID incorrecto al importar PDF:** en el manejador real `#pdfFile` se reemplazaba `ref-*` por `usbc-*` aun si la identidad y fecha ya existían. Se perdía la correspondencia del registro `MiBowlingPhotoLab.get(item)` y los enlaces a páginas oficiales. Evidencia: modelo ABS PRO-am Elite Performer Solid, `ref-5a4a1cc9d264`, pasaba a `usbc-abs-proameliteperformersolid`; desaparecía la URL oficial.
2. **No había archivo histórico:** las entradas que salían del top 100 dejaban de persistir; una bola ficticia con selección y nota no se recuperaba al reintroducirla.

## Corrección precisa, exclusivamente en esta rama
- Reutilizar `old.id` al importar una identidad conocida, de selección activa o archivo. Los modelos nuevos mantienen ID sintético `usbc-*`; la verificación de identidad del registro de imágenes sigue exigiendo coincidencia de marca, modelo y fecha.
- Añadir archivo histórico en el **mismo localStorage** `mi-bowling-plantilla-100-v1` (compatible con registros previos) y deduplicación por la clave de identidad existente, siguiendo el patrón ya documentado de PR #53 sin modificar ni incorporar dicha PR.
- Conservar las fichas desplazadas con sus metadatos, selección y notas; restaurarlas si vuelven al top 100; permitir exportación JSON del archivo y avisar antes de una restauración que lo borraría.
- Importación atómica ante confirmación, PDF insuficiente y error de cuota con rollback de registros, metadatos y archivo.
- **El registro de fotografías y permisos no cambia:** 100 IDs, 14 páginas oficiales, 1 candidato, 85 pendientes, 0 imágenes reales, 0 permisos concedidos, placeholders y enlaces externos sin fotografías copiadas.

## Evidencia nueva (sin repetir CP-002)
Regresión local V8 ejecutando código real recuperado de GitHub, con DOM simulado y PDF USBC sintético de 25 páginas: **26 comprobaciones PASS, 0 FAIL**. Incluye búsqueda, marcas, selección, ficha, enlaces, bloqueos de imágenes, actualización confirmada/cancelada, ID estable, histórico, reaparición, exportación, deduplicación, PDF insuficiente y falta de espacio. Archivo automatizable adicional: `tests/catalogo100-photo-import-history-lab.cjs`; no activar CI. La prueba se realizó **antes de guardar el commit**, sobre la modificación textual exacta del HTML; falta ejecutar la suite Node del repositorio clonado y navegador integrado para cierre de producción.

Las 19 comprobaciones de lógica y los cuatro tamaños responsive acreditados en CP-002 se **recuperaron**, no se repitieron. No se ejecutaron CI remota, Safari físico ni pruebas sobre datos reales.

## Protecciones
main `699d877d5ec4f3891ac6c24504a57605105bfb2d`; PR #53 `550b635cccf470edc5ee4fda3cba54b41ab02ead` y PR #54 `160c19f2d7ef9a75de6bb3586913e389e7116f5b` intactas. CP-010, CP-001, CP-002, catálogo base de 100, 10 bolas, 12 sesiones, FGB CP-020, PWA y producción intocados. Ningún merge, despliegue, foto, licencia supuesta, contacto o gasto provocado.