# MI BOWLING · I13 · Testigos con quórum de firmas públicas ancladas (LAB)

**Orden:** BOWLING-INTEGRACION-CP020-I13-20261109  
**Fecha:** 9 de noviembre de 2026  
**Punto de partida verificado:** I12 PR #32 (draft) · checkpoint `BOWLING-I12-CP-001` · HEAD documental `fa136ec8f8feca26da76bf9a44ba28fab87cae5f` · código funcional I12 `05afeffd1ebe3ea66bdf8e37ea8606fa506a4b88`.  
**CI I12 final:** [push 42608053991](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42608053991) y [PR 42608061795](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42608061795): ambos **2/2 SUCCESS**.  
**Base I13:** rama nueva `feature/integracion-main-auth-i13-lab-20261109` derivada del HEAD I12, no de `main`.  
**Main observado sin modificaciones:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**Alcance:** solo A/B/C ficticios. Sin servicios, datos auténticos, restauraciones reales, envío o publicación.

## Implementación técnica

1. `lab/i13-witnesses.js` verifica paquetes firmados que encadenan declaraciones I13 por `sequence`, `previousHash`, digest de manifiesto I12, contador de exportaciones y cabeza de recibos I11. Recalcula cada manifiesto desde su archivo cifrado real mediante la verificación AES-GCM/PBKDF2/SHA-256 de I11/I12. Requiere crecimiento estricto de exportaciones y conservación de todos los hashes de entradas previas: rechaza manifiestos antiguos, bifurcaciones, pérdidas y duplicaciones.
2. La política `.trust13` es un archivo **externo distinto del paquete**: 2–5 claves **públicas** ECDSA P-256, huellas SHA-256 de JWK canónicas, umbral 2 o superior. El verificador no lee claves declaradas por el paquete ni admite clave privada, duplicación, huellas discordantes, firmantes ajenos o firmas incorrectas. Las firmas cubren el contenido de cada declaración encadenada mediante dominio `MI-BOWLING-I13-ECDSA-STATEMENT-v1|`.
3. Un segundo archivo `.pin13` conservado separadamente ancla el digest de la política, longitud de cadena, SHA de última declaración y digest del último manifiesto. Sin ambos documentos independientes `.trust13` y `.pin13`, **no se permite atribuir seguridad antirrollback a I13**. El mismo adversario que pueda sustituir ambos documentos puede confeccionar una historia antigua o falsa no identificable por este mecanismo.
4. `lab/integracion-main-auth-i13.html` y `lab/i13-ui.js`: herramienta de verificación local aislada que exige tres archivos separados (paquete cifrado `.mw13`, política `.trust13` y último PIN `.pin13`) más una frase exclusivamente ficticia introducida en memoria. No firma, no crea claves privadas, no abre datos de juego ni IndexedDB y no hace peticiones a servicios externos.
5. Comparación de evidencia I11 actual contra última referencia I12/I13: alineado, pérdida/rollback, bifurcación o testigo obsoleto, sin escribir ni recuperar confirmados, WAL o partidas. Archivo I13 `.mw13` contiene *solo* manifiestos, exportaciones I11 **cifradas** y declaraciones firmadas; **ninguna contraseña ni clave privada**. La separación externa de las referencias debe realizarse efectivamente por quien custodie los ficheros; no puede demostrarse desde el navegador.

## Matriz de pruebas prevista

- Node: A/B/C, dos versiones de manifest con dos firmantes públicos válidos de tres; restauración y conflicto; PIN y política externa.
- Rechazos: quórum insuficiente, firmante duplicado, no autorizado, firma cambiada, política alterada/sustituida, JWK privado, paquete incompleto, testigo anterior recuperado junto con su certificado, pérdida de exportación y adulteración AES-GCM.
- Competiciones de historial: versión desfasada, supresión de un certificado, regresión del ancla y comparación de evidencia vieja frente al último testigo.
- Concurrencia: cuatro verificaciones simultáneas idénticas y sin escrituras, sin base de datos.
- Navegador: WebKit emulado móvil y Chromium escritorio sobre HTTPS loopback con bloqueo de red externa, verificación y comparación, sin actividad en IndexedDB. El par de claves de ensayo existe solo en memoria de Node; **nunca en UI**.
- Regresión: contratos protegidos CP-020, calendario FGB 2026–27 (31 eventos, 10 gallegos/21 nacionales), I11 e I12.

## Límites explícitos

**No se ha demostrado inmutabilidad.** SHA-256 y quórum ECDSA comprueban consistencia y posesión de claves, no control realmente independiente de las claves, custodia del PIN, que la última firma sea la más reciente, hora auténtica, WORM físico, transparencia pública ni imposibilidad de suprimir todos los testigos. Tampoco se ha probado rotación/revocación/expiración de claves, fallo eléctrico físico, Safari en iPhone físico o dispositivos simultáneos reales. Sin gobierno operativo de claves y custodia externa, la verificación criptográfica de I13 es exclusivamente experimental.

Los registros I11 y los archivos `.mae11` no guardan puntuaciones en el manifiesto, y `.mw13` solo puede incluir `.mae11` cifrados: no son copias de recuperación de partidas.

## Checkpoint BOWLING-I13-CP-001 · evidencias verificadas

**Código funcional exacto probado:** `4fe2ec68e406f02e0fd5ec252191a3260908bb7f`.  
**CI funcional:** [GitHub Actions push 42609910018](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42609910018) — **SUCCESS 2/2 jobs**, verificados en GitHub y en logs de Node/WebKit/Chromium.  
**Código + este informe inicial probado:** `f1808996616e423eed56b9cef35df9e221c8d895` — [push 42610051049](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42610051049) **SUCCESS 2/2 jobs**.  
**Ejecución en PR asociada al mismo SHA:** [42610112153](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42610112153) (comprobar conclusión antes de acreditar resultados).  
**PR:** [#33](https://github.com/josegude-ux/Mi-Bowling/pull/33), abierta en borrador y apilada sobre PR #32.  
**Comparación GitHub contra I12:** 8 archivos **añadidos** en el espacio I13, sin editar ni eliminar archivos previos. Merge base exacto I12 `fa136ec8f8feca26da76bf9a44ba28fab87cae5f`; 9 commits nuevos antes del cierre de checkpoint.  
**Protección main:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`, sin cambio verificado antes del cierre.

Logs confirmados de `42609910018`:
- **FGB:** PASS, 31 eventos (10 gallegos, 21 nacionales), filtros y datos intactos.
- **I11/I12:** PASS, contratos regresivos de cadena, prueba externa, manifiestos y firma P-256.
- **I13 Node:** PASS, quórum 2/3, firmas públicas previamente aprobadas, PIN, sustitución de política y firmante, pérdida/corrupción, A/B/C y cuatro verificaciones simultáneas solo lectura.
- **I13 WebKit (móvil emulado)/Chromium (escritorio):** PASS, archivos locales, quórum, PIN, rollback, identidad cruzada, sin IndexedDB ni conexiones externas.

**Precisión:** las claves están separadas criptográficamente en ensayos Node, **no hay prueba de custodia por operadores independientes**, sello de tiempo fiable, inmovilidad física, firma externa real o Safari iPhone físico. Ningún dato/servicio real conectado. El commit documental del presente checkpoint requiere nueva CI sobre su SHA antes de considerarlo aprobado definitivamente.

## Continuidad

CI y checkpoint SHA se completarán solo tras comprobar GitHub Actions reales. **Ningún cambio en main, producción, FGB CP-020, PR #1–#32, PWA, credenciales o servicios reales. No fusionar ni publicar.**
