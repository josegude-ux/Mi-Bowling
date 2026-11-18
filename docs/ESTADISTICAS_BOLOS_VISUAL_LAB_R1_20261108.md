# MI BOWLING · Estadísticas de bolos · Propuesta visual 1 · LAB R1

**Orden:** BOWLING-ESTADISTICAS-BOLOS-VISUAL-R1  
**Rama:** `feature/estadisticas-bolos-visual-lab-20261108` (aislada y no publicada).  
**Base:** `main@6d0dfbc73bb7033461c816e0e3c85d2315280191` — **3.3.8-prueba**.  
**PR #8 de perfiles:** `feature/perfiles-locales-lab-20261108`, borrador; **no fusionada ni modificada**.  
**PR #1 de pista 3D:** también permanece independiente.  
**Checkpoint de código probado:** `b3ee9125b73624cb7a0b02098e24dbed8944152d`.  
**Evidencia:** [GitHub Actions 42507916236](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42507916236) — **SUCCESS**.

## Decisión de diseño

El usuario seleccionó **la propuesta visual 1** como dirección del nuevo panel. La pantalla mantiene estilo VISURA INVENTA: fondo blanco, azul corporativo, tarjetas discretas, separación visual clara, formación real de diez bolos y adaptación a iPhone, tablet y escritorio.

Se integra mediante los archivos nuevos `stats-bolos.js` (cálculo y render) y `stats-bolos.css` (estilos). `app.js` de LAB añade acceso directo «Abrir mapa visual de precisión por bolo» dentro de Estadísticas y la opción «Mapa visual de bolos» en el selector. El análisis anterior permanece disponible en «Análisis por bolo · Clásico». El marcador y el registro de tiradas existentes **no se modifican**.

## Datos, cálculos y significado

El módulo **no** consulta LocalStorage, IndexedDB, conexiones remotas ni una lista global de jugadores. Recibe exclusivamente el agregado `periodAggregate(aggregate(statMode,statsBallId))` generado por la sesión activa; una vez fusionado con la futura PR #8, este `db` ya será el del perfil seleccionado. Por lo tanto, el módulo no tiene ninguna ruta de acceso a partidas de otro jugador. *La integración física con PR #8 sigue pendiente y se debe validar antes de publicar.*

| Modalidad | Muestra / denominador | Porcentaje mostrado |
|---|---|---|
| 1er lanzamiento | Tiros con 10 bolos colocados (`a.first`); incluye bonificaciones con rack completo del décimo frame | Para cada bolo: número de derribos / número de tiros con rack completo |
| 2º lanzamiento | Segundas tiradas que disponen de bolos en pie después de la primera (`a.opportunities`) | Para cada bolo: derribos / veces que ese bolo seguía en pie |
| Bolos únicos | Oportunidades de spare con **exactamente un bolo restante** | Derribos del bolo y porcentaje de conversión |
| Combinaciones | Oportunidades de spare con **dos o más bolos restantes** | Mapa por bolo: derribos / oportunidades con ese bolo en pie; tabla adicional: conversión **completa de la combinación** |

La «Efectividad global» representa el total de bolos efectivamente derribados dividido por los bolos disponibles en la categoría, y **no** una media aritmética de porcentajes individuales ni necesariamente el porcentaje de spares convertidos.

Los rankings de mejores y peores bolos incluyen solo bolos con al menos **cinco oportunidades**, evitando clasificaciones poco significativas por una única tirada. Si no hay datos, se muestran porcentajes «—», intentos 0 y explicaciones, sin inventar resultados.

Se aplican los mismos filtros de entrenamiento/competición, bola elegida y período (todo, mes, trimestre y año actuales) que a las estadísticas existentes. Al igual que el sistema de estadísticas original, **se incluyen solo partidas completas** para mantener consistencia con sus métricas.

## Accesibilidad, responsive y PWA

- Formación de bolo **7–8–9–10 / 4–5–6 / 2–3 / 1** y detalles de porcentaje **y fracción** por bolo.
- Elementos seleccionables mediante botones nativos con `aria-label`, `aria-pressed` y áreas táctiles mayores a 44 px.
- Pestañas táctiles para las cuatro modalidades; filtros de período, selección de un bolo y gráficos KPI/rankings.
- Distribuciones de 1–2 columnas adecuadas para ancho de iPhone, tablet y escritorio; gráficos sin bibliotecas ni servicios externos.
- Service worker de LAB con cacheo de los recursos nuevos, incluidas sus versiones exactas.

## Pruebas verificadas (datos ficticios)

- Cálculo unitario 1ª bola: 13/20 = 65 %, 2ª bola: 4/8 = 50 %, bolo único: 1/1 = 100 %, combinaciones: 3/7 = 42,9 %, 1 spare completo de 3 combinaciones = 33,3 %.
- Aislamiento de jugador A (con tiros) y B (nuevo, estadísticas vacías) con pruebas automáticas. La vista recibe únicamente datos del jugador al que pertenece la sesión.
- Sanitización de nombres HTML, protección de datos originales y no mutación de los objetos de partidas al calcular estadísticas.
- Integración en `app.js` real 3.3.8-prueba; diez miniaturas del registro y marcador de diez frames conservados.
- Chrome/Chromium a **390×844**, **768×1024** y **1440×900**; cuatro modos, bolos táctiles, vaciado de perfil, ningún desbordamiento horizontal.
- Vista de demostración independiente en `lab/estadisticas.html` con jugadores A/B y cifras ficticias, sin almacenamiento ni datos reales. Capturas de los tres tamaños adjuntas en el artefacto CI `mi-bowling-stats-visual-lab`.

## Límites y próximos pasos

- La PR #8 de perfiles, aún en LAB, **no se ha fusionado**. Se ha verificado el modelo de aislamiento por entrada y la simulación A/B, pero falta una prueba E2E conjunta sobre ambas ramas después de que la PR #8 se actualice a la última versión de `main`.
- No se han probado dispositivos físicos Safari/iPhone o Android; Chromium en CI no equivale a certificación física.
- La PR #9 de anotación compacta, si continúa en borrador, debe compararse antes de publicar.
- No se han alterado `main`, datos almacenados en producción, repositorios del proyecto VISURA ni otras PR.
- **No publicar ni fusionar sin copia verificable, pruebas de integración y autorización expresa.**

**Continuidad recomendada:** validación visual y táctil en iPhone; posteriormente consolidar estadísticas + perfiles locales PR #8 en una rama de integración aislada, actualizar compatibilidad con el último `main` y realizar prueba de separación real de estadísticas con varios perfiles ficticios.
