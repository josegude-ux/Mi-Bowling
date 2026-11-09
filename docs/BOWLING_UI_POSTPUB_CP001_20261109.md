# MI BOWLING · Auditoría postpublicación visual / PWA · R1
**Orden**: BOWLING-UI-POSTPUB-001
**Checkpoint**: BOWLING-UI-POSTPUB-CP-001 (pendiente de cierre CI exacta)
**Fecha**: 2026-11-09
**Fuente real**: josegude-ux/Mi-Bowling · main \`1a8fe012ca6b515dcb35161c1aa5f4fa01a689f3\`
**Publicación original**: PR #41 fusionada; GitHub Pages \`42682738036\` completed SUCCESS (build + deploy)
**Rama independiente**: \`audit/visual-pwa-postpub-lab-20261109\`
**Alcance autorizado**: verificación y correcciones SOLAMENTE en LAB; sin fusiones ni publicación adicionales.

## Recuperación y no duplicidad
- Se confirmó PR #41 closed/merged, HEAD de main exacto y despliegue GitHub Pages SUCCESS.
- Se recuperó BOWLING-UI-LAB-CP-001 y BOWLING-UI-MAIN-CP-001; no se modifican otros checkpoints.
- Ramas/PR I20, I21 y autenticación permanecen independientes; sin duplicados ni fusiones.
- El motor \`app.js\` sigue versión funcional 3.3.10 y datos clave \`mi-bowling-analitica-v2\`.
- La auditoría previa verificó browser local en Chromium y WebKit pero **no** probó HTTPS público ni la PWA en línea / sin red.

## Incidencia reproducible por lectura de código de main
- La web publicada muestra indebidamente "LAB" en el \`<title>\`, y "Laboratorio de diseño" en el pie del menú lateral.
- En la rama LAB se sustituyen por textos neutrales de producción; sin cambiar destinos, selectores, IDs, rutas, datos o funciones.
- La versión del caché PWA en main se denomina \`mi-bowling-lab-visual-20261109-r1\`: la candidata LAB la versiona como
  \`mi-bowling-analitica-v3-3-10-ui-cp036\` para invalidar recursos visuales viejos cuando se publique expresamente.
- **Estas modificaciones NO están publicadas.** La PR debe permanecer draft hasta autorización distinta.

## Plan de validación real
Se añade un workflow nuevo independiente que en GitHub Actions comprueba:
1. \`node --check\` y invariantes estáticos de compatibilidad, caché y texto.
2. Candidato local de rama LAB: Chromium (390×844, 820×1180, 1280×900) y WebKit (390×844).
3. Web realmente publicada en \`https://josegude-ux.github.io/Mi-Bowling/\` con los mismos motores y dimensiones; evaluación de recursos HTTP, CSS y navegación.
4. Solo contextos **efímeros** con datos ficticios: selección por checkbox, anotación de strike, deshacer, partida de 300 calculada, estadísticas, conservación al recargar.
5. Chromium con PWA auténtica: instalación y control del SW, consulta de entradas de caché, desconexión real, recarga sin red, alta de selección local, persistencia de tiradas ficticias.
6. Capturas como artifact temporal de GitHub Actions; sin pruebas humanas en iPhone físico ni acceso a datos personales.

## Criterios para cerrar
- Ambos jobs de CI de push y PR SUCCESS sobre HEAD documental definitivo; logs sin 404 ni errores JS.
- Separación: diff exclusivamente \`index.html\`, \`sw.js\`, workflow, dos tests y este documento.
- Ningún cambio en \`main\`, publicación, motor, diseño funcional previo, FGB CP-020, perfiles, compras, o PR I*.
- Si la verificación de HTTPS da fallo, conservar la evidencia y corregir SOLO tests/código LAB, sin reinterpretar CI fallida.
- La revisión en dispositivo físico continúa pendiente incluso si emulaciones pasan.

## Estado operativo
Implementación de controles y corrección visual de rotulación preparada en LAB; evidencia final pendiente de GitHub Actions.
