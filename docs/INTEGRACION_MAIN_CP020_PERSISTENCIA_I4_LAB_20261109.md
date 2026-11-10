# MI BOWLING · LAB I4 · Puerto privado del motor, diario y recuperación segura

**Orden:** BOWLING-INTEGRACION-MAIN-CP020-I4-20261109  
**Fecha:** 9 noviembre 2026  
**Origen I3:** PR #20, checkpoint documental d561f0f6f71b6fb3daa81fe8e07be957f684ae3b. Código I3 probado 66d3cede69abc6bca2a4d3fff5d5c5acfa168d4e.  
**Rama nueva:** feature/integracion-main-auth-i4-lab-20261109, derivada del checkpoint I3.  
**Main observado:** 566aafdc05be163baf8c7f82e60433b0f532d748; conservación de portada VISURA y FGB CP-020.  
**Código I4 validado en CI:** 5d9a9d238f3156b336c7970d8557508d6107bfc6.
**Resultado CI I4 push:** SUCCESS, run 42535884170 (contratos y WebKit/Chromium).
**PR I4:** #21, borrador apilado sobre #20; no fusionada.

## Arquitectura implementada (LAB)

- lab/integracion-main-auth-i4.html: nueva ruta sin alterar las pantallas I2/I3. Simula correo y contraseña, tres UUID ficticios y ofrece inspeccionar/reanudar/conciliar pendientes. No incluye PWA ni acceso a cuentas reales.
- lab/i4-guard.js: bloquea acceso a datos locales del visitante, registro PWA e IndexedDB; conserva un aislamiento equivalente al de I2, pero solo en la ruta I4.
- lab/i4-engine-port.js: descarga **solo** el app.js CP-020 del mismo origen del LAB, calcula y exige SHA de blob Git 8787aeba7ef9eb5dee23af4daabf5b35d2c766c2. Ejecuta una transformación *en memoria* que sustituye cada uso del símbolo localStorage por MiBowlingI4Port y cada sessionStorage por un puerto efímero. Nunca modifica ni sirve una versión de producción distinta en GitHub. Si el hash cambia, la página se bloquea. El puerto mantiene un snapshot JSON exclusivamente en RAM y expone un evento explícito al recibir puntuaciones; no accede al localStorage real. Las llamadas sincrónicas del motor sobreviven como **puerto de compatibilidad**, no como persistencia del navegador.
- lab/i4-persistence.js: verdadero canal de datos I4 LAB, con repositorio privado de identidad simulada y revisión CAS. Primero escribe instantánea pendiente en un journal inyectado, y solo después intenta el guardado de personal en el repositorio fake. La confirmación exige lectura posterior de la misma revisión y contenido. No escribe Liga Nacional, ni mueve partidas a otro usuario. El journal es un **doble en memoria**, no almacenamiento duradero real.
- lab/integracion-main-auth-i4.js: reutiliza lógica de portada, calendario, PDF de muestra y acceso ficticio I2, pero abre el motor por el nuevo port I4, no por app.js directo ni por el adaptador I3. La PR #20 conserva su ruta anterior intacta.

## Recovery no destructivo

1. En un arranque posterior **simulado** con el mismo journal en memoria, el borrador se verifica: propietario, revision base, SHA-256 de base, SHA-256 de pendiente y checksum del envelope. Si falla, se bloquea.
2. Nunca restaura ni escribe silenciosamente una copia pendiente. La cuenta abre únicamente los datos remotos permitidos y muestra si existe recuperación en espera.
3. Recuperación explícita si el servidor conserva exactamente revisión y hash del documento base. La escritura vuelve a usar CAS y verificación de lectura.
4. Si el intento remoto se aplicó, pero la respuesta se perdió, se reconoce la revisión y el hash sin emitir un segundo INSERT/UPDATE.
5. Si el remoto cambió, se declara conflicto. Es posible inspeccionar/exportar una copia en RAM sin borrar el servidor ni el journal.
6. La fusión segura requiere confirmación explícita y prueba de *tres vías*: documento base, pendiente local y actual remoto. Solo concatena sesiones **nuevas y con IDs diferentes** si ninguno editó o eliminó sesiones preexistentes, ni cambió bolas, patrones o metadatos. La escritura de la fusión usa CAS. Si hay cualquier solapamiento, el journal original se conserva y el remoto sigue intacto.
7. Un cierre con petición en vuelo invalida la respuesta tardía. El journal permanece como evidencia para la próxima apertura simulada.

## Limites sin ocultar

- No hay acceso a Supabase/Auth/RLS/Storage, cuentas reales, datos de partidas del usuario, redes externas fuera de HTTPS loopback de test, correo, SQL, buckets, migración, merge ni despliegue.
- **Durabilidad:** el journal I4 es un Map de memoria. La recuperación se valida reiniciando el adaptador con ese Map inyectado; si se cierra/recarga de verdad la página, el Map se pierde. Por tanto, I4 prepara la lógica, pero **no conserva borradores tras cerrar el navegador**; esto deberá implementarse después con almacenamiento cifrado/seguro y autorización independiente, o un mecanismo equivalente verificado. No usar I4 para partidas reales.
- **Compatibilidad:** el motor transforma referencias en tiempo de ejecución y conserva los métodos getItem/setItem para no reescribir los 551 renglones de CP-020. Queda desacoplado de la API real del navegador, pero **no** es una refactorización del motor a API asíncrona nativa. El adaptador privado es asíncrono y la fachada de lectura es síncrona solo en RAM.
- **Liga:** los datos de Liga en la demo permanecen en RAM; no se afirma su persistencia remota. El contrato solo cubre puntuaciones personales.
- **PDF:** la demo solo verifica el respaldo con archivos ficticios ya preparados; el problema Blob nativo en Safari/iPhone físico sigue no validado. WebKit Linux emulado no lo certifica.
- **Producción:** app.js, index.html, styles.css, sw.js, official-calendar-2026-2027.js y data/calendario-fgb-2026-2027.json deben conservar SHA de blob verificado de CP-020. Total FGB: 31, 10 gallegos y 21 nacionales.
- PR #1/#8/#10/#12/#13/#18/#20 se mantienen abiertas e independientes; la rama I4 tendrá PR apilada en borrador, no se fusiona ni publica.

## Criterios de aceptación comprobados en CI

- [x] Contrato del motor CP-020 por hash; seis activos intactos y calendario FGB 31 (10+21).
- [x] Tests Node con UUID A/B/C: inicialización read-only, journal previo a escritura, conflictos, timeout ambiguo, corrupción, identidad cruzada y cierre de sesión.
- [x] Fusiones conservadoras de sesiones nuevas diferentes sin sobrescribir cambios anteriores y rechazo de solapamiento.
- [x] WebKit iPhone/tablet emulados y Chromium escritorio con motor CP-020 transformado, autosave ficticio y localStorage real sin modificación.
- [x] Regresiones I2/I3 SUCCESS, checkpoint de código probado y evidencia CI final.

**NO FUSIONAR · NO PUBLICAR · NO CONECTAR SERVICIOS REALES.**


## Checkpoint I4 validado · 9 noviembre 2026

**Código original ensayado:** 5d9a9d238f3156b336c7970d8557508d6107bfc6.
**Evidencia principal:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42535884170 · **SUCCESS**, 2/2 jobs.
**Rama:** feature/integracion-main-auth-i4-lab-20261109.
**Documento:** docs/INTEGRACION_MAIN_CP020_PERSISTENCIA_I4_LAB_20261109.md.

Resultados Node observados:
- Los seis activos de CP-020 originales siguen idénticos; calendario 31 eventos (10 gallegos y 21 nacionales).
- UUID A/B/C con lectura privada y creación del primer documento B. Ninguna acta de Liga entra al documento personal.
- Journal escrito antes de la petición remota; recuperación explícita desde el mismo journal de memoria tras reiniciar el adaptador.
- Timeout tras commit reconocido por hash y revisión sin repetir la escritura.
- Fusión conservadora de dos sesiones con IDs nuevos y diferentes mediante confirmación explícita. Los cambios solapados se rechazan y conservan copias.
- Journal corrupto o de otra identidad bloqueado; cambio de usuario durante escritura no provoca fuga ni sobrescritura.
- Regresiones de I3 aprobadas.

Resultados Playwright observados:
- Regresión de I2: WebKit iPhone A/B, tablet C; Chromium escritorio A/B; portada, calendario, perfiles y estadísticas.
- Regresión independiente I3: aprobada.
- I4: WebKit iPhone A, tablet B y Chromium escritorio C. Motor CP-020 verificado por SHA en tiempo de ejecución y cargado en memoria; guardado asíncrono con repositorio ficticio y aislamiento del almacenamiento real. No se ha iniciado PWA ni accedido a servicios externos.

**Alcance del checkpoint:** I4 preparado y validado contra dobles ficticios en Linux y navegadores emulados. **No** hay journal duradero después de recargar realmente la página, Auth/RLS real, sincronización de dispositivos reales, PDF Blob Safari físico ni publicación. La siguiente etapa debe resolver ese gap antes de cualquier piloto con datos auténticos.

**Prohibiciones permanentes para este trabajo:** no merge, no despliegue, no datos reales, no tocar las PR #1, #8, #10, #12, #13, #18, #20 o main.
