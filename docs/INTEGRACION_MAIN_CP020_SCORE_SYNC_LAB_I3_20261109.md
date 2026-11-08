# MI BOWLING · Integración LAB I3 · Autosave privado asíncrono

**Orden:** BOWLING-INTEGRACION-SCORE-SYNC-LAB-I3-20261109
**Fecha:** 9 noviembre 2026
**Origen:** PR #18, checkpoint I2 14f1d5b73c3ede4fe479d01c1a4722e79fd10de6.
**Main recuperado:** 566aafdc05be163baf8c7f82e60433b0f532d748; portada VISURA y calendario FGB CP-020.
**Rama I3:** feature/integracion-main-auth-i3-lab-20261109; rama independiente derivada de I2, NO fusionada.
**Validación CI:** pendiente hasta verificar ejecuciones de esta rama.

## Alcance implementado

- lab/score-sync-i3.js: adaptador asíncrono que recibe explícitamente repositorio privado, UUID verificado y función lectora de la base db en memoria. No contiene SDK, credenciales, fetch, IndexedDB ni llamadas a localStorage.
- lab/integracion-main-auth-cp020.js: activa I3 únicamente después del acceso ficticio y tras cargar el motor CP-020 sin modificar app.js. Envuelve la función global save() del motor para observar cambios; el botón de guardar compara respuesta remota y contenido.
- lab/integracion-main-auth-cp020.html: carga I3 solo en el LAB protegido, sin manifest ni registro de PWA.
- tests/score-sync-i3.test.cjs: contrato de tres UUID A/B/C, CAS, fallos ambiguos, modo offline, cola de cambios, identidad y cierre de sesión.
- tests/score-sync-i3-browser.test.cjs: funcionamiento del propio save() del motor CP-020 en WebKit emulado y Chromium.
- .github/workflows/score-sync-i3-lab.yml: jobs de contratos/regresiones y navegador.

## Contrato de autosave

1. Inicio de solo lectura mediante repository.load(owner); exige UUID y documento personal válido. NO escribe Liga Nacional.
2. Los cambios de db se copian en RAM después de save(); debounce agrupa cambios consecutivos, sin autosave artificial por abrir cuenta.
3. Solo una operación de escritura en curso; cambios nuevos esperan y usan revisión recién confirmada. Compare-and-swap por revisión vía repository.write(owner, personal, payload, expectedRevision).
4. Conflicto, error remoto o resultado ambiguo BLOQUEAN la siguiente escritura; no hay sobrescritura forzada ni reintentos a ciegas.
5. Reconcile relee la revisión y contenido remoto. Reconoce una escritura aplicada antes de un timeout sin duplicarla; permite reintento solo si el estado remoto sigue idéntico al verificado; si hay divergencia señala conflicto.
6. Simulación offline: cambios solo en memoria; reconexión exige releer la revisión. Cierre invalida resultados tardíos y desvincula save().
7. Un cierre con cambios pendientes devuelve un indicador unsaved pero NO aporta una cola duradera ni conserva datos de prueba después del reload.

## Protecciones

- Main, portada, calendario, motor, PWA y activos publicados CP-020 permanecen intactos byte a byte conforme al test contractual I2. Calendario: 31 competiciones, de ellas 10 gallegas y 21 nacionales.
- Las identidades y el servidor se simulan en RAM. NO se crean servicios Supabase reales, cuentas, claves, correos, RLS SQL, PDF remotos ni migraciones.
- A1-A8 de PR #13, perfiles PR #8, estadísticas PR #10, integración PR #12, PR #1 3D y PR #18 I2 no se editan. I3 es una PR apilada de borrador contra la rama I2, sin fusionar.
- El motor existente sigue escribiendo en la fachada RAM de I2; el adaptador I3 NO equivale todavía a sustituir completamente el almacenamiento para producción.
- La persistencia de PDF Blob en Safari/iPhone físico y las reglas RLS reales siguen pendientes. WebKit CI no acredita Safari físico.

## Matriz de pruebas a verificar en GitHub Actions

- [ ] Inicialización de solo lectura; A/B/C separados y B con documento inicialmente inexistente.
- [ ] Debounce, cola serial y autosave sin pérdida de cambios intermedios.
- [ ] Conflicto remoto y bloqueo sin sobrescribir cambios ajenos.
- [ ] Commit remoto con timeout y conciliación sin duplicados; error anterior al commit.
- [ ] Offline, reconexión, logout durante escritura y rechazo de Liga dentro de documento personal.
- [ ] WebKit iPhone/tablet emulados, Chromium escritorio, portada, FGB y no exposición de datos reales.
- [ ] Verificación binaria CP-020 y CI de I3 SUCCESS.

## Pendientes fuera de alcance

Antes de un uso real: migrar guardado del motor sin depender de almacenamiento local, recuperación duradera de operaciones pendientes, manejo de conflictos entre dispositivos, Auth y RLS de servidor probados, PDF/Storage privado real con autorización independiente y pruebas Safari físico.

**NO FUSIONAR · NO PUBLICAR · NO CONECTAR SERVICIOS REALES.**
