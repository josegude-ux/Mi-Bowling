# MI BOWLING · Pocket real / cruce 1–2 · LAB CP005
**Checkpoint:** MI-BOWLING-POCKET-REAL-LAB-CP005-20261128  
**Fecha:** 28/11/2026 · **Estado:** LAB validado; no publicado  
**BASE:** `main 7a2a445cdb7a5a590665c2c2258b66fd62581fcb`  
**Rama:** `lab/pocket-entrada-real-20261128`  
**Código verificado:** `e60ead652cfc06d2bdedd349135c599a15850cab`

## Orden del usuario y criterio
El valor previo mostrado como «Pocket 1–3» se calculaba por `pins.includes(1) && pins.includes(3)`. Es erróneo como indicador de **entrada**: la bola puede entrar por 1–2 y derribar después el 3.

El usuario ha especificado expresamente **«Si no se marca nada se da por supuesto que fue 1/3»**.
- Una primera bola **sin marcar** se interpreta como **pocket 1–3 supuesto** para jugador diestro; en configuración zurda el pocket propio es 1–2.
- Un check **«Entró 1–2»** para diestro excluye ese lanzamiento del pocket, aunque caigan 1 y 3; para zurdo, el check muestra «Entró 1–3».
- **No** hay detección automática del punto de entrada: la nueva tarjeta se llama **«Pocket 1–3 (estimado)»**. Sin cruces registrados, primeras bolas históricas contarán como pocket **supuesto**. En la captura original se veían 55/60 (92 %) por caída de bolos; el nuevo criterio puede mostrar 60/60 (100 %) mientras ninguna entrada 1–2 haya sido marcada. No presentar esto como comprobación real del 100 %.

## Modificación LAB de alcance restringido
1. Nuevo módulo puro `integracion/pocket-entrada-real.js`, sin dependencias ni escritura. Computa `hit / total`, `cross`, `assumed` y permite auditar el diagnóstico histórico por bolos caídos sin usarlo para la tasa real.
2. En `integracion/registro-compacto.js`, checkbox de un toque a la derecha del texto «Frame N, bola 1». Desmarcado por defecto, no ocupa nueva fila en pantalla; la selección se retiene cuando se repinta el rack. Se aplica al guardar la primera bola, también en modo por cantidad.
3. En registro clásico el mismo checkbox aparece únicamente para la primera bola; un estado temporal preserva la selección tras repintados de bolos.
4. En `releases/catalogo-local-f1-fotos1/app.js`, `recordThrow` y `recordRoll` registran solo la excepción `impactSide` en la primera tirada. No modifican `pins`, `count`, `frame` o las puntuaciones. `migrate()` conserva el nuevo campo opcional; todos los registros v2 anteriores siguen válidos.
5. Estadísticas oficiales y entrenamiento cambian a «Pocket 1–3 (estimado)», mostrando el recuento conforme a la presunción y cruces marcados. Se puede abrir «Revisar entradas 1–2» para marcar o desmarcar retrospectivamente las primeras tiradas en las partidas existentes, sin tener que rehacerlas.
6. La revisión retrospectiva clona el registro y usa `MiBowlingEscritura.write(KEY,JSON.stringify(copy))` antes de sustituir el estado; si falla, no confirma el cambio. Historial de bolas, sesiones, fotografías, Liga y PDF FEB quedan fuera de alcance.
7. `index.html` carga el módulo antes del registro, `sw.js` incorpora recurso + hashes SHA-256 de archivos afectados y nuevo RELEASE LAB. No limpia ni sobrescribe cachés productivas.

## Pruebas objetivas
**RUN [46151607795](https://github.com/josegude-ux/Mi-Bowling/actions/runs/46151607795) — SUCCESS.** Commit probado `e60ead652cfc06d2bdedd349135c599a15850cab`.
- **PASS:** sintaxis Node de todos los archivos afectados, test puro de inferencia, cruce 1–2 cuando caen también 1+3, configuración zurda, cuatro hashes de integridad, compatibilidad del esquema.
- **PASS Chromium navegador real aislado:** 10 primeros lanzamientos ficticios, supuesto 10/10; marcar 1–2 convierte en 9/10 sin tocar bolos; guardar y recargar conserva el cruce; desmarcar vuelve a 10/10. Registro compacto y clásico, check conservado al tocar un bolo y al repintar la pantalla.
- **PASS WebKit motor Safari en runner:** mismo recorrido y mismos criterios, sin datos reales y con Service Worker bloqueado.
- No se ha ejecutado validación visual en Safari del iPhone físico ni prueba sobre datos personales. No se repiten regresiones históricas cerradas.

## Protección, publicación y límites
- No se ha creado PR ni realizado merge, despliegue, escritura en Supabase ni interacción con las partidas o fotos del dispositivo real.
- Cualquier publicación requiere autorización **expresa** adicional, revisión del diff frente al `main` vigente, comprobación del HEAD, pruebas y despliegue GitHub Pages; no limpiar datos de Safari.
- Si se publica, el 92 % histórico basado en caída de bolos dejará de mostrarse como «pocket real». El nuevo 100 % supuesto inicial no representa medición verificada: depende de que el usuario marque los cruces.
- **Decisión: GO LAB; NO GO publicación hasta autorización.**
