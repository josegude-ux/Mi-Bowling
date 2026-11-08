# BOWLING-CP-2026-11-09-027 — FASE 1 LAB · Aislamiento entre sesiones

**Estado:** VALIDADO EN LAB. NO FUSIONAR NI PUBLICAR.  
**Continuidad:** CP-026 → CP-027, misma PR #17 en borrador.  
**Repositorio:** `josegude-ux/Mi-Bowling`.  
**Rama aislada:** `feature/catalogo-arsenal-f1-lab-20261108`.  
**SHA exacto de código y pruebas validadas:** `c104fd302e8fd6e3319508f5fec9f1e4adaecb1a`.  
**Evidencia CI:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42534739267 (**SUCCESS**, mismo SHA).  
**Main y respaldo verificados antes y después:** `566aafdc05be163baf8c7f82e60433b0f532d748`.  
**Respaldo:** `backup/main-antes-arsenal-f1-20261108`.

## Recuperación
- Documento CP-026 recuperado directamente de la rama F1.
- PR #17 verificada abierta, draft=true, merged=false; base `566aafdc05be163baf8c7f82e60433b0f532d748`.
- PR #1, #8, #10, #12, #13 verificadas abiertas, no fusionadas e independientes.
- No se ha creado orden nueva ni otra PR; trabajo limitado exclusivamente a pruebas de Fase 1.

## Trabajo técnico
- Nuevo escenario `independentSessionsScenario()` en `tests/ball-selection-lab.cjs`, con **datos 100 % ficticios**, que carga dos sesiones y tres scopes de selección independientes:
  - Sesión A: inicialmente solo Alpha, pero con una bola Beta en su historial antiguo.
  - Sesión B: solo Beta.
  - Próxima sesión: solo Alpha.
- Se comprueba que abrir A no muestra Beta ni la atribuye erróneamente al siguiente lanzamiento; sus tiros previos siguen conservando `ballId` histórico.
- Cambiar la selección de A permite sumar Beta a A sin alterar B ni la futura sesión.
- Al abrir B se mantiene su bola Beta; el nuevo tiro registra Beta sin modificar los datos de A.
- Desmarcar Beta de B deja B con selector «Sin asignar» y no elimina las selecciones de A ni la próxima sesión.
- Tras recargar el navegador, las selecciones particulares de A y B continúan diferenciadas.
- **No ha hecho falta modificar `app.js`** en esta fase: solo se ha ampliado el test. Sin cambios en las fichas ni campos nuevos.

## Evidencia verificada
- GitHub Actions ejecución #42534739267: `completed / success` sobre exactamente `c104fd302e8fd6e3319508f5fec9f1e4adaecb1a`.
- Registros expresos:
  - `OK chromium 390px: dos sesiones independientes, bola excluida sin adjudicar, registros y recarga`.
  - `OK webkit 390px: dos sesiones independientes, bola excluida sin adjudicar, registros y recarga`.
- Se mantuvo verde la regresión existente: F1 en Chromium/WebKit (390/1280 px), competición en viewport emulado 430×932, borrado seguro, sidecar malformado, marcadores, PWA offline, copias JSON y calendario FGB.
- `main` y respaldo `566aafdc05be163baf8c7f82e60433b0f532d748` sin cambios, y PR independientes intactas.

## Restricciones y punto de continuación
- PR #17 permanece en borrador y sin fusionar; Fase 2 no autorizada. Ninguna publicación.
- No modificar `main`, respaldo ni datos reales. Pruebas exclusivamente ficticias.
- Aún no hay validación en un iPhone físico (WebKit emulado no la sustituye).
- Próximo trabajo seguro: pruebas nuevas justificadas de F1 o protocolo de Safari/iPhone real en LAB privado; evitar repetir escenarios ya superados.
