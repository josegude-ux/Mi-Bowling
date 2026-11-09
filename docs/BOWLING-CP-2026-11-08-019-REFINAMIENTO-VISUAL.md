# MI BOWLING — CP-019 · Refinamiento portada VISURA

Fecha: 2026-11-08
Estado: LAB VALIDADO; PR #15 en borrador; NO PUBLICADO.

## Alcance confirmado
1. Sustituir símbolos planos de Registrar partida, Consultar partidas y Analizar estadísticas por iconos SVG con gradientes, relieve y sombras 3D, sin animaciones.
2. Reemplazar el fondo de Estadísticas con el 85 % ficticio por un gráfico ilustrativo sin porcentajes inventados (`home-estadisticas-limpio.jpg`).
3. Homogeneizar Más herramientas: Patrones de aceitado, Liga Nacional y Mis bolas con tarjetas blanco-azul, iconos y flechas, manteniendo las rutas y nombres.

## Código y recursos
- PR #15: https://github.com/josegude-ux/Mi-Bowling/pull/15
- Rama: design/inicio-visura-refinamiento-3d-20261108
- Commit exacto validado: 6bd20eb5f49c09bdbc423ef0e07a626d8df7098a
- SVG: icon-registro-3d.svg, icon-partidas-3d.svg, icon-estadisticas-3d.svg.
- Foto: home-estadisticas-limpio.jpg, recorte de la propuesta visual generada, sin el dato ficticio.
- CSS: tres tarjetas principales con iconos gráficos de carga inmediata, tres herramientas con presentación uniforme, diseño responsive.
- Cache PWA diferenciada: mi-bowling-analitica-v3-3-8-prueba-visref1; recursos CSS y JS con v=338visref1.
- Versión funcional se conserva en 3.3.8-prueba, sin cambios en claves de localStorage ni estructuras de datos.
- Sin mezclas de PR #1 (3D interactivo), #8, #9, #10, #12 y #13.

## Pruebas
- GitHub Actions final: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42522057954 — **SUCCESS**.
- Chromium/WebKit: 8 combinaciones 320/390/768/1280 px; sin desbordamiento ni cambios de comportamiento.
- Iconos cargados en ambos motores, sin carga diferida del icono de menú.
- Mantiene navegación a Calendario, Mis bolas, Patrones, Liga y Nueva partida.
- Validación estática: imagen sin cifra ficticia, 3 SVG 3D, caché offline y rutas de menú.
- Pruebas anteriores de registro (bolos rojos/negros, deshacer, spare), almacenamiento local, exportación/restauración JSON y modo offline con datos sintéticos: correctas.

## Protección de datos
- No se han modificado ni leído partidas reales del dispositivo del usuario; las pruebas usan copias ficticias.
- Respaldo exacto del código previamente publicado: backup/main-3.3.8-antes-refinamiento-20261108, SHA 85f09e9082512f111a70d9739964126688fc23cb.
- `main` mantiene ese mismo SHA al cerrar LAB; PR #15 no fusionada.

## Publicación controlada
- Requiere autorización expresa del usuario para fusionar PR #15 y publicar los cambios visuales.
- Después, comprobar SHA de main, GitHub Pages y cambios de caché PWA sin desinstalar la aplicación.
- Verificar en iPhone físico la representación de las tres tarjetas y Más herramientas, y que las partidas históricas sigan presentes.