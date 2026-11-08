# BOWLING-CP-2026-11-08-025 — CATÁLOGO Y ARSENAL F1 · Multijuego y selección vacía

**Estado:** LAB VERIFICADO · PR #17 EN BORRADOR · SIN FUSIONAR NI PUBLICAR.
**Fecha:** 2026-11-08.
**Origen recuperado:** CP-024 (documento de la PR #17). Continúa CP-021, CP-022 y CP-023.
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`
**Commit de prueba exacto:** `ff976573a22e6c186f01d31616d2ad76a1b3ebd5`
**Pruebas:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42533075080 — **SUCCESS**.
**Main publicado y respaldo:** `566aafdc05be163baf8c7f82e60433b0f532d748`, ambos verificados sin cambios.
**Rama de respaldo:** `backup/main-antes-arsenal-f1-20261108`.

## Trabajo ejecutado en este ciclo
- Inspección de la PR #17 y de `app.js` en LAB, sin cambios funcionales en el código de la aplicación.
- Comprobación de las PR independientes #1, #8, #10, #12, #13: continuaban abiertas como borradores, no fusionadas.
- Ampliación del archivo ya existente `tests/ball-selection-lab.cjs` con escenarios sintéticos:
  1. Completar una primera partida de competición tras un spare ficticio y varios strikes.
  2. Empezar una **segunda partida dentro de la misma sesión**, conservando el conjunto de bolas seleccionado por identificador de sesión.
  3. Desmarcar la última bola disponible para el juego actual, verificar que solo se presenta «Sin asignar» y que puede registrarse un lanzamiento con `ballId:''`.
  4. Confirmar que desmarcar no reescribe el `ballId` del primer juego ni las fichas del arsenal.
- Las pruebas existentes siguen cubriendo el patrón, los datos no enviados del formulario, la vuelta al lanzamiento con bolos elegidos, importación JSON, retiradas y reactivaciones de bolas, y el historial.
- No se creó ninguna sesión ni bola real, ni se alteró el esquema; únicamente fixtures de prueba.

## Validaciones verificadas
- GitHub Actions 42533075080: **completed / success** sobre el SHA `ff976573a22e6c186f01d31616d2ad76a1b3ebd5`.
- Sintaxis y lógica del registro, calendario FGB de 31 eventos, recursos, PWA offline y copia JSON: **success**.
- Navegadores Chromium y WebKit: pantallas 320 × 640, 390 × 844, 768 × 1024, 1280 × 900; pruebas especiales F1 a 390 y 1280, más viewport móvil 430 × 932: **success**.
- Regresión F1 con segunda partida, conjunto persistente y selección vacía: **success**.
- Ningún commit de aplicación nuevo en este ciclo; exclusivamente prueba reforzada y este checkpoint.

## Restricciones y siguientes acciones
- **NO FUSIONAR, NO PUBLICAR, NO MODIFICAR MAIN**.
- No iniciar Fase 2 sin solicitud expresa, ni crear campos nuevos de bolas.
- No alterar PR #1/#8/#10/#12/#13.
- Las pruebas de WebKit en emulación **no equivalen a Safari en un iPhone real**. Esa es una validación pendiente.
- Al concluir cada ciclo, dejar botones ejecutables: continuar las comprobaciones de LAB o preparar la validación manual del iPhone sin tocar producción.
