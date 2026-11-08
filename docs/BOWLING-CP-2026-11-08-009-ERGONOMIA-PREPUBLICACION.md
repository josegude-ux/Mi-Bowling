# MI BOWLING — CP-009 · Ergonomía final y prepublicación controlada
Fecha: 2026-11-08
Estado: **LAB VERIFICADO / PR #5 EN BORRADOR / PUBLICACIÓN NO AUTORIZADA**

## Referencias
- Checkpoints anteriores: `CP-007` y `CP-008`.
- Rama: `design/registro-compacto-r1-20261108`.
- Commit de código verificado: `d646a43073844b8ccc41537f1f9cc24cce850618`.
- Rama principal verificada intacta: `efe4c9b107267f31574db4511721cba433bfcb76` (3.3.5-prueba).
- Pull request: https://github.com/josegude-ux/Mi-Bowling/pull/5 (borrador).
- CI de código: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42497469017 — `completed / success`.

## Correcciones realizadas tras CP-008
1. En 320 px, los cuatro atajos se organizan en una cuadrícula 2×2, sin texto recortado y con botones táctiles ≥44 px.
2. Cabecera del frame en una sola línea en móvil, sin recortes ni aumento horizontal del scroll.
3. Mensaje aclaratorio en la selección: si no se marca ningún bolo en pie, se anotarán todos derribados. Evita strikes involuntarios al interpretar por primera vez la vista.
4. Ajuste de la sección desplegable de bola/línea de juego en dispositivos estrechos, conservando los campos y la lógica.
5. No se alteran `recordRoll`, `undoRoll`, `changePair`, `frameScores`, el esquema de sesiones ni sus claves de almacenamiento.
6. Las animaciones 3D siguen fuera del alcance.

## Evidencia
- Capturas finales de 320, 390, 768, 1280 px con Chromium y WebKit: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42497469017/artifacts/13623702621
- Revisión visual de capturas móviles: controles legibles, ficha de puntuación primero, bolos grandes, acciones presentes, barra de navegación inferior no superpuesta.
- Pruebas de navegador ejecutadas: **8/8 combinaciones aprobadas**.
- Lógica previa de anotación y registro compacto: ambas suites superadas.
- Instalación inicial de PWA, carga sin conexión y guardado local ficticio: aprobados en Chromium.
- Siguen pendientes el uso en un **iPhone físico**, la restauración real de una copia exportada y aceptación final por el usuario.

## Continuidad exacta
- Plan de publicación preparado sin ejecutar: `docs/BOWLING-PLAN-PUBLICACION-CONTROLADA-3.3.6.md`.
- No publicar mientras no exista una autorización explícita nueva.
- Publicación actual 3.3.5-prueba y datos del iPhone intactos.
