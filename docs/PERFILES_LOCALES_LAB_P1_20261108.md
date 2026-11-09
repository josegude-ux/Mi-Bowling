# MI BOWLING · PERFILES LOCALES LAB P1 · CHECKPOINT

- **Rama de laboratorio:** `feature/perfiles-locales-lab-20261108`.
- **Base exacta:** `main@3e2e93e055c8bb7c3375a6dfe2f0ce2820830445` — versión pública **3.3.7-prueba**.
- **Checkpoint funcional verificado:** `a354270f8335c1dba41d03f2105071c86fcb5d1b`.
- **Pruebas CI correctas:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42502340382
- **Ámbito:** solo LAB. **No fusionada, no publicada**. Independiente de PR #1 (pista 3D).
- **Producto:** perfiles de jugador locales y aislados en el mismo navegador/dispositivo; NO hay servidor ni sincronización.

## Funciones programadas

1. Pantalla inicial «¿Quién va a jugar?» con selector de jugadores y creación de nuevo perfil. Se recuerda únicamente la selección de la pestaña actual mediante `sessionStorage`; abrir otra pestaña pide elegir jugador.
2. Al crear un jugador se empieza con **cero partidas, cero estadísticas, cero bolas y valores por defecto**. El sistema asigna un identificador único, nunca reutiliza las claves de otro perfil.
3. Los datos por jugador se guardan en `localStorage` bajo `mi-bowling-profile:<id>:<clave original>`. Abarca partidas, bolas, mano, patrones (metadatos), Liga Nacional, rosters y disposición del registro rápido.
4. Los documentos PDF de aceitado nuevos usan una **base IndexedDB por jugador**. En el perfil legado, `oilGet` puede leer la base IndexedDB original **solo en modo lectura** si el PDF todavía no existe en la base de ese perfil. Los PDF originales no se borran.
5. El botón «Cambiar jugador» está en la cabecera y en Ajustes; al salir se reinicia la aplicación para que no permanezcan datos de un usuario en variables de memoria.
6. PIN numérico **opcional de 4–8 dígitos** al crear el perfil, con sal aleatoria y derivación PBKDF2/SHA-256 (160.000 iteraciones). **NO es autenticación segura, no cifra los datos** y puede eludirse con acceso al almacenamiento. No equivale a contraseña de cuenta.
7. La exportación JSON de un jugador incluye `localPlayer:{id,name,...}` y usa el ID en el nombre del archivo. Se impide restaurar directamente sobre otro perfil un JSON que declare un ID de jugador diferente. Copias antiguas sin identificación siguen requiriendo confirmación.
8. Modo sin conexión y sin servicios externos; solo una rama aislada.

## Migración sin pérdida

- La primera apertura detecta si existen datos previos en las claves `mi-bowling-analitica-v2`, `mi-bowling-v1`, `mi-bowling-liga-v1`, `mi-bowling-liga-acta-v32`, `mi-bowling-liga-rosters-v33` y `mi-bowling-quick-layout`.
- Crea **Jugador principal · datos anteriores** y realiza una **copia literal** de cada valor original encontrado a su clave privada, sin eliminar ni modificar los registros de origen.
- Si falla la copia (por ejemplo, por cuota insuficiente), se **revierte cualquier copia parcial**, no se crea un catálogo incompleto y se bloquea el inicio en LAB; los originales quedan intactos.
- Los PDF no forman parte del JSON anterior: **se conservan en la base binaria original** y se recuperan de forma read-only. Antes de un futuro despliegue real se requerirá respaldo/exportación verificable de cada PDF, además del JSON.
- Nunca se asignan registros anteriores a un perfil nuevo. No se borra el perfil legado automáticamente.

## Pruebas realizadas

- [x] Dos jugadores con datos ficticios: A tiene **300 puntos y una bola**, B inicia con **0 partidas, 0 bolas y estadísticas vacías**.
- [x] Mano y claves de almacenamiento completamente distintas.
- [x] Liga Nacional: ninguna puntuación o jugador real del perfil legado pasa al perfil nuevo; sus actas ficticias comienzan sin puntuaciones.
- [x] Claves y valores originales permanecen **literalmente idénticos** después de crear, usar y cambiar los perfiles.
- [x] El PIN correcto y el incorrecto se verifican con WebCrypto en Node; sal/hash sin PIN legible.
- [x] Catálogo corrupto produce bloqueo seguro; fallo simulado de cuota revierte cualquier copia parcial.
- [x] Copia de datos antiguos de `mi-bowling-v1`.
- [x] Interfaz Chrome real a 390 × 844, 768 × 1024 y 1440 × 900: selector, creación, partida ficticia y ausencia de invasión de almacenamiento legado.
- [x] Vista previa de laboratorio con memoria temporal validada en Chromium.
- [ ] Uso real en Safari/iPhone y Android físico; auditoría con VoiceOver y sesión prolongada.
- [ ] Backup externo verificado de los PDF previos; validar límites de almacenamiento en un móvil con datos voluminosos.
- [ ] Pruebas manuales de exportación/restauración con archivos ficticios y varias actas de Liga Nacional.
- [ ] Prueba de actualización PWA y rollback desde dispositivo real.
- [ ] Prueba presencial de selección con PIN tras cerrar/reabrir la pestaña; Node verifica la derivación, pero la automatización Chromium no prueba aún el formulario de desbloqueo.

## Vista de ensayo (ficticia)

`lab/perfiles.html` muestra el selector real, pero redirige las escrituras a memoria temporal de la pestaña y desactiva los archivos. Puede abrirse desde un servidor estático para comprobar el manejo. **No debe usarse para partidas ni archivos reales.**

El acceso externo mediante raw.githack.com, si se utiliza para revisar la UI, procede de un intermediario ajeno a GitHub; su disponibilidad en Safari no está verificada. Se recomienda únicamente con nombres y partidas ficticios.

## Fases siguientes

1. Prueba de manejo en iPhone y cambios puntuales de ergonomía.
2. Exportación/restauración individual con dos perfiles simulados y verificación de pertenencia; preservar actas y PDF.
3. Revisión de la coexistencia con PR #1 (3D) sobre nueva base, en otra integración **solo LAB**.
4. Únicamente tras aprobación explícita y respaldo contrastado, preparar el despliegue en otra orden.

**NOTA:** el usuario no pidió sincronizar entre móviles, ni cuentas con contraseña y nube; estas funciones quedan fuera de alcance.
