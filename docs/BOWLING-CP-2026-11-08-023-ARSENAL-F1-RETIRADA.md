# BOWLING-CP-2026-11-08-023 — CATÁLOGO Y ARSENAL F1 · Retirada limpia de bolas

**Fecha:** 2026-11-08  
**Estado:** LAB VALIDADO; NO PUBLICADO NI FUSIONADO.  
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`  
**PR:** https://github.com/josegude-ux/Mi-Bowling/pull/17 (borrador)  
**Commit funcional EXACTO validado:** `36cdfc35550e757ba3b53133adf87e2ff225a9e5`  
**CI verificada:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42531827079 — **SUCCESS**  
**Main y respaldo (lectura verificada):** `566aafdc05be163baf8c7f82e60433b0f532d748`  
**Rama respaldo:** `backup/main-antes-arsenal-f1-20261108`  

## Continuidad
Este checkpoint amplía CP-021 y CP-022; no inicia Fase 2 ni añade catálogo externo, cuentas, dependencias, campos a las fichas de bolas o migraciones de datos personales.

## Incidencia corregida
Cuando una bola marcada para una sesión se retiraba del arsenal y posteriormente se reactivaba, podía quedar marcada en la selección interna anterior. La selección de juego almacenada en el sidecar `mi-bowling-ball-selection-v1` ahora se limpia explícitamente al retirar una bola en todas las sesiones y en la selección de próxima sesión. Si se reactiva, no reaparece seleccionada. `db.balls` solo cambia el valor existente `retired`, sin añadir campos. Se conservan los `rolls[].ballId` y estadísticas históricas.

## Pruebas verificables
- Prueba nueva en `tests/ball-selection-lab.cjs`: selección próxima sesión, retiro, desmarcado de selección en varios scopes, conservación de tiros históricos y reactivación sin reselección automática, en Chromium y WebKit a 390 y 1280 px.
- También se ejecutaron: lógica y marcador, calendario FGB 31 eventos, recursos PWA, persistencia, copias JSON ficticias y pruebas de navegador Chromium/WebKit a 320, 390, 768 y 1280 px.
- CI completada con **conclusion: success** sobre exactamente `36cdfc35550e757ba3b53133adf87e2ff225a9e5`.
- Verificación read-only: PR #1, #8, #10, #12 y #13 siguen independientes, abiertas en borrador y no fusionadas.

## Restricciones y pendientes
- `main` y respaldo sin cambios, SHA `566aafdc05be163baf8c7f82e60433b0f532d748`.
- PR #17 abierta en borrador: **no fusionar ni publicar**.
- Se ha utilizado exclusivamente información ficticia; no existe prueba en un iPhone físico ni acceso a los datos reales del usuario.
- Fase 2 fuera de alcance. La selección es un sidecar local, no un campo nuevo ni parte de la copia JSON.
- Se mantendrá CP-023 como referencia para continuar pruebas de Fase 1 o solicitar una orden explícita de nueva fase.
