# MI BOWLING · Guía de pruebas de LAB (sin modificar producción)

**Checkpoint verificado:** `85bdbefaf6089ed7655669c8c691dddd75f59cd3`.  
**Rama:** `feature/linea-visual-r1-20261108`; PR #1 sigue como borrador.  
**Pruebas GitHub Actions:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42473903340 (conclusión **success**).

## Vistas de ensayo disponibles

1. **Demo interactiva de línea** — archivo `lab/demo.html`: usa `lane-3d.js` y `line-editor.js` reales para arrastrar pies, flecha y breakpoint, cambiar de vista, girar la cámara, editar valores y simular varias tiradas ficticias. Los datos solo existen en memoria.
2. **Aplicación completa en modo LAB** — archivo `lab/app.html`: carga `app.js`, `line-editor.js` y `lane-3d.js` auténticos de la rama. Reemplaza el almacenamiento local por un `Map` temporal ANTES de cargar la aplicación y bloquea la carga de archivos. Se pueden recorrer las pantallas de sesión, registro, marcador e historial con datos ficticios. La prueba se reinicia al refrescar.
3. **Fixtures de CI** — `tests/lane-browser.html` y `tests/browser-smoke.cjs`.

### Para abrir desde móvil o PC con un alojamiento estático de prueba

Este repositorio es público. GitHack permite servir archivos HTML estáticos desde un **commit**. Los enlaces siguientes son para demostraciones, no para producción ni datos sensibles. GitHack es un intermediario externo independiente de GitHub, por lo que en esta fase deben usarse solo datos ficticios:

- Demo de la pista: https://raw.githack.com/josegude-ux/Mi-Bowling/85bdbefaf6089ed7655669c8c691dddd75f59cd3/lab/demo.html
- MI BOWLING completo LAB: https://raw.githack.com/josegude-ux/Mi-Bowling/85bdbefaf6089ed7655669c8c691dddd75f59cd3/lab/app.html

**Limitación de verificación del enlace:** las pruebas de navegador se hicieron sobre los archivos del repositorio en CI, pero la disponibilidad de los enlaces GitHack desde Safari/red del usuario no está certificada por CI. Estos enlaces están sujetos a disponibilidad y caché del proveedor externo.

### Comprobación sugerida

1. Abrir la demo de la pista en Safari o Chrome.
2. Mover pies 25 → 27, flecha 15 → 17, break 8 → 10; variar la distancia del breakpoint.
3. Cambiar de 3D a cenital y confirmar que las cuatro cifras permanecen.
4. Simular dos lanzamientos con valores diferentes: comprobar historial simulado.
5. Abrir la aplicación LAB completa, entrar en «Empezar partida» → «Entrenamiento» → «Comenzar sesión», seleccionar una línea y registrar una tirada.
6. Comprobar «Editar línea» de una tirada anterior en el historial sin alterar el marcador ni las tiradas posteriores.
7. Enviar observaciones de uso: legibilidad de flechas, tamaño de marcadores, velocidad de manejo y facilidad de localizar cada control.

## Separación y limitaciones

- NO se ha fusionado PR #1 ni modificado `main` o el GitHub Pages publicado.
- NO se han copiado ni importado datos de usuario a estos laboratorios.
- En el laboratorio completo `localStorage` es memoria efímera. Si el navegador no permite aislarla, **no carga la aplicación**.
- La carga de archivos está desactivada. No probar PDF reales ni fotos; el `IndexedDB` de este laboratorio no está disponible.
- Los enlaces de GitHack son solo para pruebas rápidas con datos inventados. Para pilotos con datos reales hay que preparar dominio y origen aislados bajo control del proyecto.
- Se ha probado automáticamente en Chrome/Chromium a 390, 768 y 1440 px, con sesiones ficticias y simulación de registros. Sigue pendiente probar Safari/iPhone físico, Chrome/Android físico y experiencia subjetiva.
- No confundir el 3D geométrico con una trayectoria física predicha ni la posición de pies con el laydown real.

## Próximo checkpoint

Validar el manejo en iPhone real. Ajustar marcadores, tamaños, zonas táctiles, colocación de controles y carga de una sesión. Ejecutar nuevamente pruebas automáticas y mantener PR en borrador hasta autorización expresa.
