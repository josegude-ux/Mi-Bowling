# MI BOWLING · I15 · Recuperación excepcional con autoridad precomprometida (LAB)

**Orden:** BOWLING-INTEGRACION-CP020-I15-20261109  
**Fecha:** 9 noviembre 2026.  
**Base recuperada y verificada:** PR [#34](https://github.com/josegude-ux/Mi-Bowling/pull/34) abierta draft, checkpoint `BOWLING-I14-CP-001`, código funcional `79bb38b0ba5042d22e5be8b09754716209471479` y HEAD documental `12e723d4736f13b7233ca34e491ab21a346526a6`.  
**I14 CI definitivo:** [push 42612352684](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42612352684) y [PR 42612358610](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42612358610), ambos `SUCCESS` sobre SHA documental exacto.  
**Rama:** `feature/integracion-main-auth-i15-lab-20261109`, creada desde HEAD I14 exacto.  
**Main anterior a I15:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**Alcance:** única y exclusivamente usuarios ficticios A/B/C y documentos generados de prueba. Ninguna conexión a servicios externos, cuentas reales, producción, procesos de publicación, dispositivos auténticos ni cambios en FGB CP-020.

## Riesgo real que I14 deja pendiente

La rotación/retirada ordinaria de I14 requiere un quórum antiguo válido. Si se pierden simultáneamente suficientes claves, o se sospecha que ese quórum está comprometido, no existe un camino de recuperación ordinaria que pueda acreditarse con ese mismo quórum. No debe fingirse que la pérdida de credenciales se resuelve eligiendo arbitrariamente otra política pública.

I15 investiga exclusivamente un **procedimiento excepcional, preautorizado fuera de la aplicación**, con un conjunto de recuperación separado y otro conjunto de claves nuevas. No recupera secretos ni puntuaciones y no constituye autorización de una recuperación operativa real.

## Implementación experimental I15

1. `lab/i15-recovery.js`: verifica íntegramente la **cadena I14 anterior** desde su PIN de génesis `.gen14` y último PIN `.pin14` con todas las políticas y PIN I13 antiguos. No permite saltar, reemplazar ni abreviar la cadena anterior para rescatar. La política excepcional contiene solo claves públicas ECDSA P-256 verificadas por el contrato I13.
2. **Compromiso externo previo `.gen15`:** vincula UUID, SHA del PIN de génesis I14 y SHA de la política de recuperación `.trust15`. Debe existir y guardarse *antes del incidente*, separado de los archivos a verificar, del último PIN y de las claves. El software solo verifica coherencia, **no puede probar que se haya custodiado o creado antes de la pérdida**. Si falta o difiere, cierre conservador.
3. **Separación total de claves:** todas las huellas de la autoridad de rescate deben ser diferentes de cualquier clave activa o retirada de las políticas I14 históricas. Las huellas de nueva política tampoco pueden coincidir con claves I14 ni con ninguna de las claves de rescate. No se acepta que el quórum antiguo se atribuya a sí mismo autoridad de recuperación.
4. **Dos quórums diferentes:** mínimo dos firmas válidas de la autoridad de rescate sobre la declaración canónica con dominio `MI-BOWLING-I15-RECOVERY-v1|` y mínimo dos firmas distintas de la política nueva sobre el dominio `MI-BOWLING-I15-ACCEPT-v1|`. Ambas firman UUID, ID de recuperación, motivo declarado, digest de último PIN I14, hash de declaración anterior, política rescatadora comprometida, política nueva, manifiesto anterior y nuevo, recuentos de exportaciones, recibos y cabeza SHA-256. No se requieren nuevas firmas del quórum perdido I14, pero sí se debe conservar su historia histórica ya firmada.
5. **Continuidad demostrable de archivos:** el nuevo testigo I13, firmado por el nuevo quórum y fijado por un nuevo PIN I13 separado, debe incrementar las exportaciones respecto del último manifiesto I14 y conservar byte a byte todos sus hashes de entradas anteriores. Las exportaciones I11 siguen selladas con AES-GCM y se validan mediante I11/I12 antes de dar el visto bueno. Ningún `.mr15` contiene contraseñas, claves privadas o puntuaciones en claro.
6. **Último PIN I15 externo `.pin15`:** bloquea sustitución de la historia anterior o la nueva política; contiene el digest del compromiso externo, PIN anterior I14, declaración de recuperación, nueva política, PIN I13 y manifiesto. El usuario debe conservarlo realmente fuera del origen y de los demás archivos. Un PIN autocertificado o sustituido al mismo tiempo que todo el resto NO demuestra ausencia de retroceso.
7. `lab/integracion-main-auth-i15.html` y `lab/i15-ui.js`: aplicación aislada de lectura que carga únicamente ficheros de demostración y frase ficticia en memoria. No hace firmas, no genera ni importa claves privadas, no solicita permisos reales, no escribe en IndexedDB ni hace llamadas de red. Dos botones reales ejecutan verificación de documentos y comparación con testigo actual.
8. `tests/i15-recovery-fixture.cjs`: crea temporalmente claves ECDSA y exportaciones I11 de prueba **solo en RAM de Node**. No integra la generación de firmas en ninguna pantalla de usuario.

## Seguridad y fallos esperados (sin omitir)

- Desaparece el compromiso externo: BLOQUEADO, nunca se infiere retrospectivamente de la política presentada.
- Se altera PIN I14 anterior, ancla de génesis I14 o historia: BLOQUEADO.
- Se intenta recuperar desde una historia I14 más antigua que su último PIN externo: BLOQUEADO.
- La autoridad de recuperación se cambia por otra incluso con JWK público válido: BLOQUEADO por huella externa.
- Se reutilizan firmas del quórum antiguo, se repite firmante, falta quórum, se cambia motivo o se cruza el dominio RECOVERY/ACCEPT: BLOQUEADO.
- Las claves nuevas incluyen una clave anteriormente activa/retirada o una clave del grupo de rescate: BLOQUEADO.
- Faltan exportaciones cifradas o se modifica un ciphertext: BLOQUEADO antes de acreditar la recuperación.
- PIN I15 final falso, sustituido o ausente: BLOQUEADO.
- A contra B/C, frase ficticia incorrecta y verificaciones simultáneas sin escritura: comprobación en la CI.

## Límites que I15 no supera

**No se afirma inmutabilidad física, sello temporal auténtico, custodia independiente acreditada, no repudio, autenticidad de la raíz externa ni autorización legal real.** Una política y un compromiso recién confeccionados por un atacante pueden parecer coherentes si también sustituye los PIN que deberían haber permanecido independientes. Tampoco puede demostrarse automáticamente el instante del compromiso de una clave, diferenciar pérdida de robo o negar un replay si se borran todos los estados y la última referencia independiente.

La razón `lost-quorum` o `suspected-compromise` es una **declaración de ensayo**, no prueba de la causa. El flujo no reconstruye contraseñas privadas ni restaura partidas. Solo hay un evento excepcional de recuperación por paquete; la secuencia no dispone de un servicio externo de exclusión de replay ni de consenso. Una futura vía real precisaría aprobación operativa expresa, custodia física verificable, normas de recuperación y un nuevo control de integridad en producción.

Las pruebas del navegador son WebKit Linux emulado y Chromium de laboratorio; no Safari iPhone físico, corte eléctrico, varios dispositivos reales ni servicios.

## Checkpoint verificable · BOWLING-I15-CP-001

**Código funcional exactamente probado:** `717c94450f629407e5455bcbafc3c7ab4d4faccd`.  
**GitHub Actions código funcional:** [push 42616510879](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42616510879), **SUCCESS 2/2 jobs**, comprobado mediante GitHub y registros de ambos trabajos.  
**PR:** [#35](https://github.com/josegude-ux/Mi-Bowling/pull/35), abierta draft sobre PR #34 y no fusionada.  
**Diff GitHub exacto frente a I14:** 8 archivos I15 **solo añadidos** (workflow, documentación, motor, interfaz, página LAB y tres ficheros de pruebas), sin modificar ni eliminar ninguno de I11–I14 o los activos CP-020/FGB; merge base `12e723d4736f13b7233ca34e491ab21a346526a6`, ahead 9, behind 0 antes de este checkpoint documental.  
**Main corroborado:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`, no editado.

**Resultados observados de la CI funcional:**
- **Node CP-020/FGB:** PASS, 31 eventos FGB (10 gallegos y 21 nacionales), contenido y filtros intactos.
- **Node I11–I14:** PASS, regresiones criptográficas y testigos anteriores.
- **Node I15:** PASS, historia previa I14 anclada, 2/3 quórum de rescate precomprometido y 2/3 nueva política disjunta, cifrado, alteración, pérdida, suplantación del quórum antiguo, cambio de políticas/identidades, firmas en dominios separados, A/B/C y concurrencia solo lectura.
- **WebKit Linux móvil emulado:** PASS, archivos separados y PIN, precompromiso, rollback, manipulación, aislamiento sin IndexedDB ni solicitudes fuera de loopback.
- **Chromium escritorio:** PASS, mismos controles con un perfil temporal.

**Historial de CI con fallos documentado:** los primeros SHA I15 anteriores a `717c94450...` fallaron por una expectativa de prueba que exigía un rechazo textual del motivo de rescate. El verificador lo rechaza antes por firma RECOVERY inválida. Se corrigió el caso para aceptar el rechazo criptográfico temprano; se ejecutaron otra vez tanto Node como los navegadores y **solo entonces** se calificó el código funcional como aprobado.

**Límites aún vigentes:** la separación física efectiva, el momento de compromiso previo, la imposibilidad de replay, la titularidad de las claves, los sellos de tiempo y la inmutabilidad siguen sin probarse. No se conectaron servicios o datos reales. No se afirma Safari iPhone físico.

**Checkpoint documental:** el SHA de este documento será distinto del código probado; solo puede acreditarse definitivamente cuando su propia CI del SHA exacto termine correctamente. La PR permanece en borrador, sin merge ni publicación.

## CI, preservación y continuidad

`.github/workflows/integracion-i15-lab.yml`: dos trabajos: contratos CP-020/FGB/regresiones I11–I14 y pruebas de ataque I15 con A/B/C; y navegador WebKit/Chromium mediante HTTPS loopback y bloqueo de red ajena. No usar credenciales ni cuentas reales.

I15 debe permanecer en PR draft apilada sobre #34. Mantener `main`, activos FGB CP-020, producción y todas las PR anteriores completamente independientes. Registrar **SHA funcional, runs CI, SHA documental final y checkpoint BOWLING-I15-CP-001** únicamente cuando GitHub confirme resultados; distinguir CI de código de CI documental. No fusionar ni publicar.
