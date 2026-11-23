# MI BOWLING · Estado integrado GitHub + Database
**Checkpoint:** MI-BOWLING-ESTADO-20261123-001  
**Fecha:** 2026-11-23 (Europe/Madrid)  
**Naturaleza:** documentación de estado, sin cambios de código, despliegue ni datos personales.

## Estado verificado
| Área | Valor |
|---|---|
| Repositorio | `josegude-ux/Mi-Bowling` |
| Producción GitHub `main` | `bbf63f65e39f9f33b8017fbd3e0458a190710eb8` |
| Versión de lanzamiento indicada en documentos y caché | `3.3.36-prueba` |
| GitHub Pages | Run `45081239088`, `completed/success`, sobre ese mismo SHA |
| LAB CP032, rama existente | `lab/cp032-registro-compacto-v3-20261122` |
| Código base CP032-006 auditado | `330de4f86bc12d8d32d4a8342d1d2eb736d1fed3` |
| Chromium, journal, cuota ficticia y caídas simuladas | SUCCESS, run `45035950388` y `45036738649` |
| Safari iPhone físico con CP032 | **No homologado** |
| Cloudflare Pages + Access privado | **Sin configuración ni despliegue privado acreditados** |

**Diferencia con CP032 original:** `main` avanzó desde `1fdef634` hasta `bbf63f65`; la versión 3.3.36 de producción no es el mismo artefacto que el LAB CP032-006.

## Base de datos y separación
- Supabase: proyecto existente `control-cargas-movil` (`oevetnszmfxeukcncwji`), **esquema `mibowling`**.
- `mibowling.copias`: copias cifradas, no partidas editadas directamente por esta operación.
- `mibowling.recursos`: recursos/fotografías privadas, sin modificaciones.
- `mibowling.miembros`: control de pertenencia, sin modificaciones.
- `mibowling.estado_proyecto`: registro **administrativo** de este checkpoint; tabla separada, RLS activado, sin privilegios directos para `anon` o `authenticated`; no contiene credenciales, partidas, fotografías ni copias.
- La PWA conserva el almacenamiento local del dispositivo como fuente primaria de partidas; la nube mantiene mecanismos de copia cifrada cuando el usuario los utiliza.

## Límites y decisiones
- La publicación del commit `main` se verifica por GitHub Actions; la actualización efectiva de cada instalación iOS depende también del caché y service worker del dispositivo.
- **No se ha desplegado CP032 por Cloudflare ni se ha fusionado CP032 con producción** en esta operación.
- Sin instalar apps en iPhone, sin migrar datos reales y sin tocar CP003/CP004/Cachefix2 ni la cartera histórica.
- Antes de habilitar CP032 remoto: aislamiento por origen independiente, control de acceso para todas las URLs, contrato de guardas, Safari físico y compatibilidad de almacenamiento.
- El estado de esta ficha es informativo y no implica aprobar CP032 para producción.

## Procedencia
- GitHub: `main` HEAD confirmado y `pages build and deployment` run [45081239088](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45081239088).
- LAB: [CP032-006](../lab/MI-BOWLING-CP032-CHECKPOINT-RESILIENCIA-20261122.md) y run [45036738649](https://github.com/josegude-ux/Mi-Bowling/actions/runs/45036738649).
- Supabase: inspección de metadatos de esquema y comprobación de `estado_proyecto` con RLS; no lectura del contenido de las copias.
