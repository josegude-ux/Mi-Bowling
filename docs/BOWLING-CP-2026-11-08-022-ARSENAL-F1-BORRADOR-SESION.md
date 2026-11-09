# BOWLING-CP-2026-11-08-022 · CATÁLOGO Y ARSENAL F1 · Conservación del borrador de sesión

**Estado:** LAB VERIFICADO. NO FUSIONAR NI PUBLICAR.
**Fecha:** 2026-11-08.
**PR:** #17 — https://github.com/josegude-ux/Mi-Bowling/pull/17
**Rama:** `feature/catalogo-arsenal-f1-lab-20261108`
**Código exacto validado:** `bda41e854b00a50fc2439a32bc49e8bec53ef8fc`
**CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42531431312 — **SUCCESS**

## Referencia de continuidad
- CP-021: Selección de bolas de «Mis bolas» por sesión y por lanzamiento, datos sintéticos; notas existentes para el taladro.
- Main y copia previa: `566aafdc05be163baf8c7f82e60433b0f532d748`.
- Copia de código en `backup/main-antes-arsenal-f1-20261108`, SHA exacto `566aafdc05be163baf8c7f82e60433b0f532d748`.

## Incidencia corregida
Si se abría «Mis bolas» desde «Nueva partida» después de escribir bolera, título, pista, notas, fecha, objetivo o bola inicial, al volver se regeneraba el formulario y se perdía el trabajo no enviado.

**Solución**: conservar temporalmente en memoria los valores del formulario, sin nuevos campos en base de datos ni en bolas. Se capturan antes de abrir el selector y se restauran después de regenerar el formulario; se reconstruyen las opciones dinámicas de pareja/pista y la vista previa del patrón. Si una bola dejara de estar seleccionada, no se fuerza a elegir una opción inválida.

## Evidencias
- CI final sobre el SHA de código probado: **SUCCESS**.
- PWA, recursos, calendario FGB 31 entradas, lógica de registro: **SUCCESS**.
- Navegadores Chromium + WebKit a 320/390/768/1280 px, PWA sin conexión y restauración JSON con datos ficticios: **SUCCESS**.
- Test específico `tests/ball-selection-lab.cjs`, Chromium + WebKit a 390 y 1280 px: **SUCCESS**.
- Nuevos casos ficticios: pérdida de borrador tras entrar a «Mis bolas», restauración de bolera/título/notas/par/pista/objetivo/bola inicial, comprobación de los valores finalmente guardados, selección y desmarcado por sesión, persistencia y datos históricos.
- Ninguna prueba utiliza datos del iPhone real. Safari en dispositivo físico sigue pendiente.
- No se crea esquema nuevo ni nuevos atributos de bolas; se mantiene `db.version = 2` y los `ballId` históricos.

## Restricciones
- PR #17 sigue en **borrador**, no fusionada.
- PR #1, #8, #10, #12 y #13 siguen fuera del alcance; no incorporar ni modificar.
- Ningún cambio en main, publicación, despliegue, servicios externos ni cuentas.
- No iniciar Fase 2 del catálogo sin una orden nueva.
- Los datos de selección temporal están en `mi-bowling-ball-selection-v1`, separados de la copia JSON; el formulario pendiente solo se guarda en memoria mientras se navega dentro de la PWA.

## Punto de continuación
Continuar únicamente pruebas y correcciones justificadas de Fase 1 LAB, o solicitar autorización distinta para nuevas fases/publicación. Revalidar el commit y backup antes de cualquier integración.
