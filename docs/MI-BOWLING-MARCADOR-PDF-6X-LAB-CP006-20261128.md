# MI BOWLING · Exportar y compartir marcador PDF · 6 por página

**Checkpoint:** MI-BOWLING-MARCADOR-PDF-6X-LAB-CP006-20261128  
**Fecha:** 28/11/2026  
**Estado:** LAB validado; no fusionado ni publicado  
**Base:** `main 92afd87119883d6cbe9de25adaee9637fad19c58`  
**Rama:** `lab/compartir-marcador-pdf-20261128`  
**Commit exacto probado:** `c5a200ed09d3447a30b2f889bce9167b135f3780`

## Objetivo del usuario
Generar desde MI BOWLING un **PDF del marcador completo**, incluyendo los mini triángulos de bolos y **puntos rojos de bolos fallados tras la segunda bola**. Ajuste explícito del usuario: **seis partidas por página** (no dos). Permitir enviarlo por WhatsApp mediante la función Compartir de iPhone.

## Alcance implementado
1. Nuevo `integracion/marcador-pdf.js`, sin dependencias externas, sin permisos nuevos, sin servidores, sin nuevas tablas ni modificaciones de almacenamiento. Genera un verdadero PDF PDF 1.4 con imágenes JPEG incrustadas, en tamaño A4 horizontal 842 × 595 puntos, renderizado 2× (1684 × 1190 px).
2. **Exactamente seis marcadores por página** (última página parcial), cada uno con diez frames, marcas (X, /, etc.), acumulado, total de partida, pista, día y opcionalmente puntuaciones de Lázaro y pareja cuando ya existen. Doce partidas del torneo (seis sábado + seis domingo) ocupan **dos páginas** en orden cronológico.
3. Triángulo de bolos clonado del algoritmo de `integracion/registro-compacto.js`: gris derribado en la primera, blanco en pie después de primera, rojo cuando queda en pie tras segunda. No se dibujan posiciones que no estén registradas exactamente (`pinDetail:'count'` o `finalOnly`).
4. Botón **«Compartir marcador PDF (6 por página)»** en Informe de sesión. Botón **«Compartir marcadores del torneo PDF · 6 por página»** dentro del preparador Parejas 2026 para reunir las dos jornadas.
5. Generación local sin escrituras. Usa `navigator.share({files:[file]})` de Safari cuando esté disponible; ofrece descarga de archivo PDF si la función Compartir archivos no está disponible. Si el usuario cancela el cuadro Compartir, no se realiza ninguna descarga.
6. `index.html` importa el nuevo módulo y `sw.js` registra sus hashes SHA-256 con nuevo RELEASE LAB. No se limpia ni sobreescribe la caché publicada.

## Pruebas y estado verificable
**RUN [46166711941](https://github.com/josegude-ux/Mi-Bowling/actions/runs/46166711941): SUCCESS**, SHA de código probado `c5a200ed09d3447a30b2f889bce9167b135f3780`.

- **PASS Node:** sintaxis, seis por página, 12 partidas -> 2 páginas, pin rojo/bola fallada y blanco tras primera, strike sin falsas marcas, partida finalOnly sin inventar detalle, totales correctos e integridad SHA.
- **PASS Chromium:** compartición local vía File, PDF 1.4 válido, A4 apaisado, seis partidas/sábado -> una página, 12 partidas -> dos páginas, apertura real de documento con pdf.js, píxel rojo visible y comparación de almacenamiento sin cambios.
- **PASS WebKit (Safari engine):** mismas verificaciones, PDF válido y local, marcador con rojo visible, sin cambios de datos.
- Se corrigió previamente un error de escape de comillas en el onclick del botón del campeonato. Otro fallo inicial del test se debía a que pdf.js transfiere el ArrayBuffer; test ajustado. La prueba final ya incluye ambas correcciones.
- **NO EJECUTADO:** ensayo en Safari físico de iPhone ni entrega real por WhatsApp; únicamente simulado mediante Web Share API en navegador aislado.
- No se utilizan puntuaciones ni fotografías del usuario en el runner; dataset ficticio.

## Límites deliberados
- El PDF contiene una imagen del marcador para conservar el triángulo exacto; no es una tabla PDF de texto seleccionable.
- Solo exporta las partidas ya guardadas localmente; no rellena frames inexistentes ni datos de Lázaro que no estén anotados.
- Por legibilidad y uso de memoria se admite hasta 60 partidas por exportación (10 páginas a seis por hoja).
- El archivo PDF generado se mantiene local hasta que el usuario elige compartirlo. La app no guarda copias ni sube el PDF.
- No se ha tocado `main`, las partidas reales, fotografías, backups, otras estadísticas, clasificaciones, imports ni el Service Worker de producción.

**Decisión: GO en LAB; NO GO publicación hasta autorización expresa.** En publicación futura verificar diff/HEAD de LAB y GitHub Pages; no borrar almacenamiento Safari.
