# MI BOWLING · LAB · Rediseño visual unificado R1

**Orden:** BOWLING-UI-LAB-001  
**Checkpoint:** BOWLING-UI-LAB-CP-001 (validación técnica pendiente)  
**Fecha:** 2026-11-09  
**Repositorio:** josegude-ux/Mi-Bowling  
**Base exacta de main:** 7fbb3fb32d889c3213626e5f73c49b0885ef9911  
**Rama aislada:** feature/redesign-blanco-azul-lab-20261109  
**Publicación/fusión:** NO AUTORIZADA. PR solo draft sobre main.

## Objetivo
Aplicar en código LAB el diseño elegido: base blanca y azul de la propuesta A,
claridad de C, estadísticas organizadas de B y un modo oscuro opcional.
Se mantiene la operativa real; las capturas anteriores eran **maquetas**
y sus cifras no se convierten en datos ni en estados de la aplicación.

## Integración real, no maqueta
- Capa nueva \`design-lab.css\`: identidad azul, tarjetas, tipografía,
  orden visual, controles táctiles, responsividad, sidebar de escritorio,
  mejor presentación de pista/marcador/estadísticas/arsenal.
- \`design-lab.js\`: sincronía de navegación lateral con el estado de
  la aplicación, \`aria-current\` y cambio exclusivamente visual de tema
  sin persistir información en el almacenamiento de partidas.
- \`index.html\`: carga de estos dos recursos y navegación visible
  de ocho destinos que llaman a rutas ya existentes de \`app.js\`.
- \`sw.js\`: caché **LAB nueva** \`mi-bowling-lab-visual-20261109-r1\`
  y precarga de ambos recursos, sin modificar el manejador del SW.
- No se cambian las fichas técnicas, claves de almacenamiento, motor de
  puntuación, formatos de competición, selección por check, historial
  ni calendario FGB CP-020.
- En móvil se conserva la navegación inferior existente y los accesos
  internos a MIS BOLAS, incluido el acceso desde la pantalla inicial.
- El modo oscuro no altera las preferencias persistidas del usuario
  y se restablece al recargar la página (función LAB temporal).

## Límites y diferencias respecto a las imágenes
- La pista continúa con su SVG/representación existente, sin activar 3D animado.
- No se han inventado fotografías de bolas, parámetros ni resultados deportivos.
- El rediseño no incorpora funcionalidades nuevas ni cuentas remotas.
- El cambio sólo es visible al servir esta rama LAB. La versión pública
  sigue intacta hasta una aprobación de publicación independiente.

## Comprobaciones previstas
1. Validar sintaxis de app.js, design-lab.js y ensayos Node.
2. Verificar que la nueva capa no escribe sesiones ni selecciona bolas.
3. Ensayar Chromium en 390x844, 820x1180 y 1280x900 y WebKit en 390x844
   con **sesiones y arsenal ficticios**. Comprobar navegación, frames,
   diez bolos, controles juntos, tema y ausencia de desbordamiento.
4. Conservar capturas de prueba como artefactos temporales de GitHub Actions.
5. Comparar rama contra la base exacta para confirmar que no se modifica
   código de juego, catálogo, FGB CP-020 ni PR de integración/autenticación.
6. Los smoke legacy CP-035 contienen aserciones exactas de caché/estructura
   anterior y no son evidencia directa del nuevo skin; se mantienen
   intactos, con nuevo CI específico de LAB.

## Estado
Cambio incorporado a rama LAB y pendiente de CI del HEAD definitivo.
No inferir aprobación de publicación ni compatibilidad real con un iPhone físico
a partir de la emulación de navegador.
