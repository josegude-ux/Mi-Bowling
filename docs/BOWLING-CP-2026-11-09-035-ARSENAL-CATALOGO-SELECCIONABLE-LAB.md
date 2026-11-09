# BOWLING-CP-2026-11-09-035 · Catálogo seleccionable «Mis bolas» — LAB

**Estado:** VALIDADO EN LAB; SIN FUSIONAR NI PUBLICAR.  
**Repositorio:** `josegude-ux/Mi-Bowling`.  
**PR nueva:** https://github.com/josegude-ux/Mi-Bowling/pull/27 (draft).  
**Rama LAB:** `feature/arsenal-catalogo-seleccionable-f2-lab-20261109`.  
**Base exacta de la versión 3.3.9 publicada:** `6dd7d486268a4ba23302559bebf209d531cc4964`.  
**Código + prueba ampliada validados:** `0b1ff0dacb55a7928c7c08b334f6a7d211508790`.  
**CI SUCCESS:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42585422584 (Chromium y WebKit; móvil y escritorio emulados).  
**Versión de LAB:** mantiene el identificador `3.3.9-arsenal-f1` sin publicar ni renumerar producción.

## Recuperación y alcance

Se recuperó el trabajo original de PR #19 (rama `feature/arsenal-analisis-asistente-lab-20261108`, HEAD al reanudar `1de02ca7248baa749d2125c6c8163300ada54ecf`), que ya contiene el catálogo consultivo de 10 modelos, análisis por bola, comparador de selecciones, propuestas 3/4/6 y asistente para cuatro síntomas. No se ha intentado fusionar esa PR antigua sobre F1 ni sustituir archivos completos obsoletos. Se han trasladado sus módulos consultivos y adaptado quirúrgicamente la interfaz al `main` ya publicado (F1 CP-034; versión 3.3.9).

Se añade al catálogo:
1. Búsqueda local instantánea por marca, modelo, función y condición de aceite; diez perfiles iniciales que se pueden consultar sin conexión.
2. «Añadir a Mis bolas» desde el modelo elegido. La incorporación crea solo una bola de esquema actual `{id,brand,model,weight:'',kind:'Reactiva',notes:'',photo:'',retired:false}`. No rellena peso, superficie ni layout imaginados; taladro y fotos opcionales.
3. Si ya existe un modelo (incluidas formas equivalentes del nombre, aliases históricos o fichas retiradas), aparece como «Registrada» en lugar de crear duplicado. Una bola retirada **no** se reactiva de forma implícita.
4. Tras incorporarla, el usuario puede marcarla para próxima sesión o sesión abierta con los checks F1 anteriores. No se autoselecciona sin intención del usuario.
5. `registerBallFromCatalog()` comprueba frente al catálogo local persistido que otra pestaña no haya cambiado los datos antes de grabar; ante divergencia se bloquea y se pide recarga, sin sobrescribir. Si falla la escritura por cuota se deshace la incorporación en memoria.
6. Se incorpora entrada clara desde «Mis bolas» y se mantiene el formulario manual; acceso al asesor desde el marcador preservando bolos aún no enviados.

Se conserva `db.version=2`, `mi-bowling-analitica-v2`, `db.sessions`, `rolls[].ballId`, PDF, marcador, calendario FGB e importación/exportación. No hay APIs externas, cuentas ni base de datos remota: catálogo técnico local inicial de 10 modelos con parámetros orientativos, algunos pendientes de verificación histórica (Rhino Pro Gold y Bully).

## Pruebas y evidencias

1. Primera implementación (`17639d7ff59645513ac2683f72d7cf954037ce26`) y primera batería completada SUCCESS en `00d2155d709010164fbdfafb24d8fbf7007bf3d1`: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42584515325. Se confirmaron R1, F1, catálogo y reglas de datos.
2. Prueba nueva con partida histórica ficticia y catálogo offline añadió una comparación errónea de la copia sin normalizar frente a la estructura que `migrate()` normaliza al guardar: fallo del test, NO pérdida de lanzamientos. Evidencia: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42585055893, SHA `339afe23fbf79880f6e0a61340e17d672628cb6c`.
3. Corrección de la aserción para comparar el historial **normalizado antes de añadir** frente al persistido después; sin cambio de lógica de negocio. Commit `0b1ff0dacb55a7928c7c08b334f6a7d211508790`; **CI SUCCESS** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42585422584.
4. Logs positivos: Chromium y WebKit 390/1280 px para R1 y nueva búsqueda; modelos preexistentes, retirados y alias sin duplicados; añadir ficha no obliga peso/notas; checks, recarga, selección y dos pestañas; fallo de cuota inyectado sin falsos positivos; histórico y atribución de bola intactos; nuevo catálogo funcional sin red en Chromium PWA 390px.
5. Regresiones generales SUCCESS: FGB 31 fechas (10 gallegas y 21 nacionales), PWA/offline, JSON ficticio, marcador, responsive 320/390/768/1280 px, CP-033/034, historial y asistente.

## Protección y límites

- `main` **sin cambios por esta PR**, base `6dd7d486268a4ba23302559bebf209d531cc4964`; respaldo de publicación anterior `backup/main-antes-publicacion-arsenal-f1-20261109` en `566aafdc05be163baf8c7f82e60433b0f532d748`.
- PR #19 sigue abierta, draft; PR #25 I8 cifrado sigue independiente, abierta y draft; PR #17 sin fusionar en su rama de origen. Ninguna se ha modificado.
- La PR #27 es nueva y **draft**; no fusionar, desplegar ni alterar la aplicación instalada del iPhone sin autorización de publicación.
- No se ha probado un iPhone físico ni Safari real. WebKit y Chromium son emulados con fixtures, y la prueba offline específica de catálogo cubre Chromium. No afirmar certificación de dispositivo físico.
- Antes de eventual publicación hay que renovar el identificador de caché/versionado PWA y repetir pruebas en rama candidata, sin introducir otras PR.
- Próxima ampliación solo si está justificada por nuevos casos o se autoriza una biblioteca técnica mayor de diez modelos; no inventar características.
