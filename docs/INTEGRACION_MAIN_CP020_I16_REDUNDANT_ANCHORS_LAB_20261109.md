# MI BOWLING · I16 · Referencias redundantes y replay condicionado (LAB)

**Orden:** BOWLING-INTEGRACION-CP020-I16-20261109  
**Fecha:** 9 de noviembre de 2026.  
**Referencia previa verificada:** PR [#35](https://github.com/josegude-ux/Mi-Bowling/pull/35) abierta en borrador, checkpoint `BOWLING-I15-CP-001`; HEAD documental `1222b0ec1d68bb8a7533e04beefb998938d92c41`, SHA funcional `717c94450f629407e5455bcbafc3c7ab4d4faccd`.  
**CI I15 final verificada:** [push 42616826445](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42616826445) y [PR 42616835240](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42616835240), ambas `SUCCESS` sobre el SHA documental exacto.  
**Rama nueva:** `feature/integracion-main-auth-i16-lab-20261109`, derivada del HEAD I15 indicado; ninguna reconstrucción de plataforma.  
**Main observado antes de actuar:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`, sin alterar.  
**Entorno:** A/B/C exclusivamente ficticios, sin cuentas reales ni servicios, sin producción, fusiones ni publicación.

## Riesgo de I15

El verificador I15 exige anclas y PIN separados, pero no da respuesta ante la desaparición de una copia externa ni ante copias diferentes que atribuyen la misma versión a estados contradictorios. La repetición de un documento antiguo con firmas auténticas puede parecer válida si se borran o sustituyen todas las referencias más recientes. **Sin estado exterior conservado, ninguna firma o secuencia interna puede probar la versión más reciente.**

## Desarrollo I16

1. **Historial firmado:** `lab/i16-anchors.js` crea el contrato verificable de hasta 12 declaraciones de checkpoint con identidad UUID ficticia, ID de serie, generación estrictamente creciente, nonce UUID distinto, hash de declaración anterior, digest del PIN final I15, digest de la política pública I15 y digest de su último manifiesto I12. Cada declaración se verifica contra el quórum I13 de la nueva política I15 mediante firmas ECDSA P-256 sobre el dominio `MI-BOWLING-I16-CHECKPOINT-v1|`. No se crean firmas ni claves en producción.
2. **Verificación I15 completa antes de autorizar I16:** los nuevos testigos no sustituyen los antiguos. Cada validación reconstruye y verifica la historia de I11–I15 desde los archivos cifrados, declaraciones, PIN y políticas existentes. Si la recuperación I15 no se valida íntegramente, no se considera correcto ningún checkpoint I16.
3. **Génesis externa `.gen16`:** fijada a la primera declaración, serie, política I15 y último PIN I15; debe mantenerse separada. Impide autorizar una raíz arbitraria mientras esa génesis retenida permanezca protegida.
4. **Última marca externa `.mark16`:** guarda raíz, generación, hash de última declaración y hash de PIN I15. Solo una marca **realmente conservada fuera del paquete** permite rechazar una reproducción de las primeras generaciones. Esta marca es obligatoria; no se deriva de las copias sin verificación.
5. **Tres copias lógicas separadas `.copy16` A/B/C:** cada una vincula el identificador de ubicación declarado, serie, generación, hash de último testigo y hash de la marca. **Se requieren al menos dos copias actuales coincidentes** con la marca externa. Se admite una copia ausente, deteriorada o legítimamente antigua y se informa cuál; dos faltantes/antiguas provocan cierre conservador. Una copia con generación superior a la marca retenida obliga a investigar una referencia obsoleta; una ubicación duplicada es rechazo, no cuenta como segundo testigo.
6. **Reproducciones y conflictos:** el historial rechaza supresión/reordenación de generaciones, bifurcación de hashes, nonce duplicado, firmantes duplicados/no autorizados, firma alterada o PIN incongruente. Una copia antigua solo se clasifica como tal cuando coincide con un hash y marca **que constan en la historia firmada**; no basta declararse vieja.
7. **Solo lectura:** `lab/integracion-main-auth-i16.html` e `i16-ui.js` verifican ficheros locales. La UI permite seleccionar las tres copias separadas y dejar una sin archivo. Hay botón para verificación y otro para comparar exportación I11 actual, sin modificar partidas, WAL, producción ni IndexedDB. El archivo JSON de referencias I15 consolidado se ofrece únicamente como simplificación de pruebas: **no constituye custodia independiente**.

## Matriz adversarial

- **Tolerancia:** 3/3 válidas; 2/3 con una ausente; 2/3 con una corrupta; 2/3 con una antigua acreditada.
- **Rechazo:** dos faltantes, dos antiguas, dos corruptas, ubicaciones duplicadas, copy con generación superior a la marca, marca externa ausente o alterada, génesis ausente o sustituta.
- **Replay:** un paquete antiguo y auténticamente firmado (primera o segunda generación) falla si se conserva la última marca externa de generación tres; firma legítima no vence al control de última versión externo.
- **Tamper:** alteración de manifiesto I15, política, PIN, declaración, nonce, orden de certificados, firma, firmante, propietario A/B/C o raíz.
- **Concurrencia:** tres verificaciones criptográficas independientes y de solo lectura del mismo paquete y validación de datos sintéticos A, B y C.
- **Navegador:** WebKit Linux con pantalla móvil emulada 390 px y Chromium de escritorio, HTTPS loopback privado, conexión a cualquier otro origen bloqueada, ausencia de modificaciones en localStorage y IndexedDB.
- **Regresiones protegidas:** contratos CP-020 y calendario FGB de 31 eventos (10 gallegos, 21 nacionales), testigos I11, I12, I13, I14 e I15. Se ejecutan sin modificar el calendario o sus datos.

## Límites técnicos y de seguridad que permanecen abiertos

La repetición puede seguir siendo invisible si un atacante sustituye **simultáneamente** historial, raíces, las tres copias y la última marca, o si el usuario pierde la marca de versión más reciente. Sin un registro externo auténticamente monotónico/WORM, el software no puede acreditar la frescura real. Tampoco hay un reloj fiable, sellado de tiempo ni autoridad pública.

**Dos archivos no son dos custodios independientes.** Las copias lógicas A/B/C no prueban ubicación física, titularidad de hardware, ausencia de coordinación, permisos, backups auténticos ni inmutabilidad. Un ataque de disponibilidad puede falsear una supuesta copia más nueva y provocar bloqueo; es una elección conservadora, no prueba de contenido comprometido.

Los tres checkpoints firmados en pruebas no equivalen a tres cambios en los datos reales de partidas: están enlazados a la misma recuperación I15 sintética y su orden es una declaración comprobable solo en presencia de referencias independientes retenidas. No se hacen operaciones sobre cuentas reales.

No se pretende curar una pérdida total de anclas, recuperar claves privadas, certificar cronología ni desplegar infraestructura PKI. Las claves privadas de firma de los ensayos se mantienen únicamente en RAM de Node. No se ha probado Safari iPhone físico ni concurrencia de dispositivos reales.

## Control de continuidad y CI

Nuevo workflow `.github/workflows/integracion-i16-lab.yml`: dos jobs independientes de pruebas Node con CP-020/FGB/I11–I15 y ataques I16, y WebKit/Chromium en entorno local aislado. Solo pruebas con A/B/C ficticios. Mantener PR I16 en borrador apilada sobre #35. La recuperación I15 queda inalterada, y ninguna orden da permiso de fusionar, publicar o tocar producción.

Antes del cierre, recopilar de GitHub el SHA funcional exacto, logs reales de CI, checkpoint `BOWLING-I16-CP-001`, SHA documental final y verificación de `main`. **No declarar éxito sin trabajos finalizados, ni convertir una marca interna en prueba de inmovilidad física.**
