# BOWLING-CATALOG100-PHOTO-LAB-CP-005-WEBLOCKS-20261111

**Estado:** LAB únicamente · **rama:** `lab/catalogo100-fotografias-permisos-20261111` · **base de recuperación:** `7662b56b2f062a338979dfdb72652d1e0a14f80e` · 11/11/2026.

## Defecto demostrado
El guardado de CP-004 lee `localStorage`, comprueba `storedSnapshot` y hace `setItem` sin transacción atómica. Simulación determinista de dos pestañas: se detiene A antes de `setItem`, entra B con la instantánea vieja; ambos pasan la comparación y A sobrescribe la selección de B. Pérdida demostrada **solo con datos ficticios**.

## Corrección experimental en esta rama LAB
La operación `commitLocalState` utiliza `navigator.locks.request('mi-bowling-catalogo100-local-v1',{mode:'exclusive'},persist)`, de modo que la comparación y escritura se ejecutan dentro de la misma exclusión mutua, siempre que los participantes respeten el mismo bloqueo. Se adaptan selección, ficha, restauración e importación ficticia para esperar los resultados asíncronos y revertir la memoria ante rechazo. Sin Web Locks se conserva la comprobación optimista preexistente, **que sigue sin ofrecer atomicidad**.

## Evidencias realizadas
- Código real de LAB CP-004 recuperado por conexión GitHub, ejecutado en V8 con DOM y dos pestañas simuladas: se reprodujo la pérdida pre-corrección; con bloqueo sintético **8 verificaciones nuevas PASS**, incluida la intercalación conflictiva y recarga posterior.
- Node v22 aislado: reproducción del algoritmo en `node_atomic_fixture.cjs` con bloqueo simulado: pérdida en fallback y serialización con lock **PASS**. Este *fixture* no es la suite Node del repositorio.
- Intento Chromium de dos pestañas con `http://127.0.0.1`: navegador del entorno bloqueó navegación local (`ERR_BLOCKED_BY_ADMINISTRATOR`); ni Web Locks real en navegador ni app íntegra fueron probados.
- Test versionado `tests/catalogo100-photo-atomic-lock-lab.cjs` para ejecución futura desde checkout completo; **no ejecutado directamente en Node del repositorio**, por falta de acceso de clonación privada desde container.
- Se preservan sin repetir las 26 pruebas CP-003, 19+4 CP-002 y 10 CP-004. **No afirmar** haber revalidado suite completa, PDF integrado, safari físico, simultaneidad de navegador real, comportamiento de Web Locks entre trabajadores, ni concurrencia en navegadores sin dicha API.

## Criterio de seguridad
La rama **no está apta para merge/despliegue** hasta ejecutar en navegador real aislado Chromium y Safari/WebKit las operaciones simultáneas, cancelación y falta de soporte, y regresiones Node del checkout, preferentemente sin acceso a datos personales. Compatibilidad estimada de Web Locks en Safari iOS >=15.4 según documentación MDN, pero *no* validada aquí en iPhone físico. Las importaciones con cambios en carrera no deben perder notas ni histórico.

## Protecciones
main 699d877d5ec4f3891ac6c24504a57605105bfb2d · PR #53 550b635cccf470edc5ee4fda3cba54b41ab02ead · PR #54 160c19f2d7ef9a75de6bb3586913e389e7116f5b. CP-010/001/002/003/004, 100 IDs, registro de imágenes, cero licencias, historial real, selecciones, 10 bolas, 12 sesiones, FGB CP-020, PWA y producción no modificados. No hay nuevas fotografías, contactos ni costes/CI solicitados.