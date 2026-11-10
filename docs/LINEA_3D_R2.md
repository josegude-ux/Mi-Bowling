# MI BOWLING · Vista 3D sincronizada · LAB R2

**Proyecto:** MI BOWLING · Rediseño opción A (blanco y azul, referencia visual VISURA INVENTA).  
**Orden:** BOWLING-LINEA-3D-R2.  
**Rama:** `feature/linea-visual-r1-20261108`.  
**PR:** [#1](https://github.com/josegude-ux/Mi-Bowling/pull/1), borrador; NO fusionada.  
**Predecesor:** `docs/LINEA_VISUAL_R1.md` y último checkpoint verificado `1d4e1365`.  

## Resultado funcional de R2

Se añade una pista de bowling **en perspectiva 3D geométrica** renderizada en canvas con una cámara propia y proyección en perspectiva. No depende de bibliotecas externas ni requiere acceso a internet. Esta representación visual **no es una simulación física** de la trayectoria de la bola.

- Vista 3D protagonista en el registro de un lanzamiento, junto a los campos numéricos existentes.
- Botón para alternar con la vista cenital anterior, sin perder posición ni valores introducidos.
- Tres marcadores editables en la vista 3D: posición de pies (naranja), paso por flechas (azul) y breakpoint (morado).
- Arrastre de puntos directamente en la pista 3D, interpretado mediante intersección del rayo de cámara con el plano de la pista.
- Breakpoint editable por tabla (incrementos de media tabla) y distancia en pies (25 a 55).
- Vista con 39 tablas, flechas a 15 ft, línea de falta, canaletas y 10 pinos ilustrativos.
- Cámara con giro táctil sobre el fondo, controles para centro/izquierda/derecha y acercar/alejar, y controles de teclado.
- Sincronización bidireccional: 3D → inputs → cenital, cenital → inputs → 3D, inputs → ambas vistas.
- Reproyección automática si cambia el tamaño de la ventana o la orientación del dispositivo.
- Estilos responsive para móvil, tablet y escritorio con paleta clara y azul de MI BOWLING.
- Se conserva 2D como alternativa y respaldo si no se carga el módulo 3D.
- Los cuatro campos se siguen guardando por lanzamiento mediante el `currentLine` / `roll.line` ya incorporado en R1; no se cambia el formato de backup.

## Decisiones técnicas

| Área | Resultado |
|---|---|
| Render | Canvas 2D con escena 3D proyectada matemáticamente (cámara, plano, profundidad y volumen ilustrativo de pinos) |
| Interacción | Eventos Pointer Events, ray-plane picking para tabla y distancia, zoom y cámara |
| Accesibilidad | Alternativa cenital SVG con teclado, controles numéricos para todos los puntos, acciones de cámara etiquetadas |
| Persistencia | Sin nueva base de datos. Se reutilizan los campos de R1 y la migración `cleanLine` |
| Offline | `lane-3d.js` y `lane-3d.css` añadidos a la lista de recursos del service worker |
| Aislamiento | Cambios solo en rama de LAB; `main` y despliegue GitHub Pages permanecen fuera de alcance |

## Verificaciones automatizadas

Workflow: `.github/workflows/line-editor-lab-tests.yml`.

1. Sintaxis de `app.js`, `line-editor.js`, `lane-3d.js`, `sw.js` y pruebas.
2. Regresión anterior R1 de línea cenital, registro de tiradas y corrección no destructiva.
3. Prueba en **Chrome/Chromium real** de la pista 3D para tamaños 390 × 844 (móvil), 768 × 1024 (tablet) y 1440 × 900 (escritorio).
4. Assert de render de canvas, presencia de tres marcadores, giro de cámara, zoom, arrastre del punto de pies en 3D, actualización en cenital, cambios de distancia y regreso a 3D sin pérdida de los valores.
5. Revisión de desbordamiento horizontal; generación de capturas automáticas de los tres tamaños en artefacto `mi-bowling-lab-pista3d`.

Las pruebas automáticas no sustituyen una comprobación manual con interacción táctil en Safari/iPhone físico, Android/Chrome físico o con partidas reales.

## Pendiente antes de fusionar / publicar

- [ ] Inspección visual manual de capturas y prueba táctil en iPhone real.
- [ ] Prueba táctil en tablet y Android físico, incluyendo cambio de orientación.
- [ ] Validar historial, estadísticas, Liga Nacional y exportación/restauración con datos ficticios sobre copia aislada.
- [ ] Revisar contraste, accesibilidad, cámara en dispositivos antiguos y rendimiento.
- [ ] Autorización explícita del usuario para fusionar y desplegar tras validación.

## Próximos desarrollos propuestos

1. Vista 3D de línea previamente registrada, con selección desde el historial.
2. Comparador de dos líneas por bola, patrón y resultados de lanzamientos.
3. Superposición de patrones de aceite y representación de breakpoint por distancia.
4. Registro independiente del **laydown** (punto de suelta real), distinto de la posición de pies.

**Importante:** el segmento discontinuo de pies a flecha es una referencia geométrica, no el recorrido medido de la bola. El trazado desde el breakpoint hasta el pocket es orientativo, no una predicción física.

