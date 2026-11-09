# BOWLING-CP-2026-11-08-018 — Inicio VISURA + Calendario
Fecha: 2026-11-08
Estado al crear: CI VALIDADA / PUBLICACIÓN AUTORIZADA / DESPLIEGUE PENDIENTE.

## Requisitos confirmados
- Aplicar la propuesta visual seleccionada: portada azul-blanca VISURA, tres tarjetas fotográficas roja (Registrar partida), azul (Consultar partidas) y dorada (Analizar estadísticas).
- Navegación inferior: Inicio / Partidas / Nueva / Estadísticas / Calendario en lugar de Mis bolas.
- «Mis bolas» continúa disponible desde Más herramientas y desde el calendario.
- Liga Nacional y Patrones de aceitado se conservan accesibles.

## Implementación
- Nueva rama design/inicio-visura-calendario-20261108; PR #14.
- Tres fotografías estáticas derivadas del diseño elegido: home-registro.jpg, home-partidas.jpg, home-estadisticas.jpg.
- Nuevos estilos responsive, tarjetas, nav y calendario en CSS; sin animación 3D interactiva.
- Calendario de solo lectura: meses, días con sesiones, agenda del día y acceso a detalle existente.
- NO se agregan eventos ficticios, cuentas, nuevas claves ni cambios en la estructura de datos.
- APP_VERSION mantiene 3.3.8-prueba y la caché PWA es nueva: mi-bowling-analitica-v3-3-8-prueba-viscal1. Recursos JS/CSS con v=338viscal1.
- PR #1, #8, #9, #10, #12 y #13 no se integran.

## Evidencias
- CI aprobada: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42519863510
- Commit exacto probado antes de documentar: 5d78ddc1e7db719e9282f44b6219d91a2f30463e
- Lógica y prueba de calendario con datos ficticios, imágenes y caché offline: SUCCESS.
- UI Chromium y WebKit 320x640, 390x844, 768x1024, 1280x900: 8/8 combinaciones con navegación y sesiones ficticias.
- Pruebas anteriores: marcador compacto, 10 frames, rojos/negros, deshacer, PWA sin conexión y exportar/restaurar JSON ficticio.
- Respaldo exacto de main previo: backup/main-3.3.8-antes-inicio-calendario-20261108, SHA af927b807658e51c5988f36dcb1c1ca4686f105c.

## Validación de publicación
- Fusionar únicamente si el diff posterior a CI contiene solo este documento.
- Verificar SHA main, APP_VERSION, cache y workflow Pages antes de declarar publicado.
- En iPhone NO desinstalar ni borrar datos locales; confirmar visualmente calendario, menú Mis bolas y partidas anteriores.
- Las partidas reales del iPhone no son accesibles a los tests: persistencia verificada con fixtures y misma clave de almacenamiento.