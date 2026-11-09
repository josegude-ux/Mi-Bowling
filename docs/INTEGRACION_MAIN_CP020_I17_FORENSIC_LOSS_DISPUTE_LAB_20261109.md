# MI BOWLING · LAB I17 · Pérdida total de anclas y conflictos entre custodios

**Orden:** BOWLING-INTEGRACION-CP020-I17-20261109  
**Fecha de trabajo:** 09/11/2026.  
**Base verificada:** PR [#36](https://github.com/josegude-ux/Mi-Bowling/pull/36), draft y sin fusionar, checkpoint `BOWLING-I16-CP-001`, HEAD documental `2e5909cf296e10d16bc0a70b9986daeb46bca8f3`; funcional `541593f819f881ea9989daface62dbda17e46b96`.  
**CI I16 definitiva confirmada:** [push 42633614300](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42633614300), [PR 42633625467](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42633625467); ambas completadas `SUCCESS`, 2/2 jobs, mismo HEAD documental.  
**Rama I17:** `feature/integracion-main-auth-i17-lab-20261109` creada del HEAD I16 exacto.  
**Main observado antes de I17:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**Ámbito:** solamente identificadores y datos sintéticos A/B/C, sin cuentas auténticas, integraciones reales, escrituras, fusiones ni publicación.

## Riesgos genuinos pendientes de I16

Los tres nombres de archivo A/B/C de I16 no acreditan custodia física independiente. Si se pierde la raíz externa o la última marca, un historial firmado sigue siendo criptográficamente plausible, pero no demuestra ser el más reciente. También puede existir una **bifurcación autenticada**: dos historias distintas con firmas matemáticamente válidas y el mismo pasado. Elegir por mayoría de archivos no permite solucionar automáticamente este conflicto y podría hacer desaparecer pruebas. La pérdida total de referencias de confianza I15/I16 no se resuelve fabricando una nueva raíz a partir de las pruebas presentadas.

## I17: funcionamiento implementado

1. `lab/i17-forensics.js`: motor autónomo de solo lectura, llamado exclusivamente en LAB. Exige verificar I15, incluidas I11/I12/I13/I14, **antes** de atribuir firmas válidas a informes I16. Acepta tres posiciones A/B/C con `{slot, history, copy}` o `null`; impide que un informe B se presente como A. Comprueba firmas ECDSA P256 de I16, la huella de la política I15, hash enlazado, orden de generaciones, nonces, recuentos de auditoría y manifiestos I15.
2. **Pérdida de toda confianza I15** (paquete o referencias I15 ausentes): resultado `blocked-total-trust-loss` con `verified:false`, sin inventar contraseñas, identidades ni raíces.
3. **Pérdida de raíz I16 o última marca externa** con I15 aún verificable: resultado `blocked-external-reference-loss`. Se pueden contar informes con firmas internas coherentes, pero `authority:none` y `verified:false`. No se utilizan las copias como fuente autosuficiente de última versión.
4. **Conflictos** entre custodios: se comparan los hashes de declaraciones en los prefijos compartidos. Una historia con quórum de firmas correcto pero alternativa en igual generación se clasifica como `quarantine-conflicting-evidence`, incluso cuando hay dos informes favorables a la marca retenida. La misma medida se aplica a copias incongruentes o malformadas, y a historias con generación superior a la marca guardada. No se selecciona automáticamente una rama para reescribirla.
5. **Copias antiguas**: un informe antiguo es tolerado solo cuando forma un prefijo firmado de la historia actual. Deben conservarse **dos informes actuales**, no basta sumar informes antiguos. Una sola copia ausente es tolerable si quedan dos correctas y se retienen raíz y marca externas originales. El verificador I16 se ejecuta también en la clasificación condicional para confirmar su quórum de referencias.
6. **Resultado positivo condicionado**: `conditionally-consistent` significa que las tres verificaciones históricas y el quórum externo suministrado son internamente coherentes. `authority:conditional-external-inputs`, no certificación física ni cronológica; `externalFreshnessProven:false` y `replayPreventedWithoutRetainedExternalMark:false`. No equivale a una autorización operativa real.
7. `lab/integracion-main-auth-i17.html` + `lab/i17-ui.js`: carga de archivos locales con inputs independientes para paquete I15, referencias I15, raíz/última marca I16 y los tres informes ficticios. Un botón ejecuta el diagnóstico y comunica resultados de bloqueo; no importa claves privadas, no guarda, no escribe partidas ni usa servicios.
8. `tests/i17-forensics-fixture.cjs`: testigos A/B/C creados exclusivamente en Node RAM. Construye a demanda bifurcación con firmas verdaderas de prueba, generación 4 correctamente firmada pero ausente de la marca de generación 3 y copias antiguas con prefijo válido; **no** existen claves privadas en la UI ni en los archivos LAB.
9. CI `.github/workflows/integracion-i17-lab.yml` con jobs independientes de sintaxis/contratos CP-020 y FGB 31 eventos, regresión I11–I16, ataques I17, WebKit Linux móvil emulado y Chromium escritorio por HTTPS loopback con bloqueo de red ajena.

## Criterios de prueba adversarial

- Historial actual con tres informes: consistente condicionado; dos informes actuales y uno ausente: consistente condicionado.
- Uno antiguo con prefijo válido: consistente condicionado con dos actuales; dos antiguos: bloqueo por insuficiencia de actualidad.
- Dos ausentes: bloqueo por quórum; todos ausentes: bloqueo; raíz o marca ausente: bloqueo incluso con tres firmas válidas; confianza I15 ausente: pérdida total bloqueada.
- Dos historias con mismo inicio pero tercer checkpoint diferente y **firmado**: cuarentena, nunca se escoge la mayoría.
- Una historia más nueva con firmas genuinas mientras la marca retenida dice generación anterior: cuarentena, posible marca obsoleta.
- Firma alterada, etiqueta cruzada, copia falsificada, identidad ajena, contraseña incorrecta, PIN I15 incorrecto: rechazo o cuarentena conservadora.
- Tres verificaciones concurrentes, A/B/C aislados, sin cambios de almacenamiento; navegador WebKit/Chromium offline y sin IndexedDB.

## Límites y decisiones que no se automatizan

**I17 no puede recuperar una raíz o un PIN externo destruidos**. No hay forma de demostrar que el último archivo firmado visible sea realmente el más reciente si todo el estado externo más reciente desapareció. Un operador debe buscar copias independientes originales mediante un procedimiento ajeno a este programa; no se autoriza fabricar nuevas marcas retroactivas ni crear un nuevo quórum automáticamente.

**Tres archivos no demuestran tres personas distintas**. El software no certifica control físico de claves, fecha anterior al incidente, WORM, sellos de tiempo, consentimiento, legalidad ni independencia real de custodios. Un tercero malicioso puede producir un informe falso para provocar una cuarentena; la cuarentena indica disputa/no disponibilidad, no culpabilidad ni prueba de alteración. Ante bifurcación se preservan ambas evidencias, sin decidir qué firma se hizo primero.

No se han realizado pruebas en Safari de iPhone físico, ni con varios dispositivos reales, servicio externo, corte eléctrico o backup WORM real. La aplicación publicada y calendario FGB CP-020 permanecen fuera de alcance.

## Checkpoint funcional · BOWLING-I17-CP-001

**Código funcional exactamente probado:** `81723b8dd8fde1d478eac1a6a90167a8e8ba00b0`.  
**CI funcional push:** [42637202508](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42637202508) — **SUCCESS 2/2**, verificada sobre ese SHA junto con ambos logs de trabajo.  
**PR:** [#37](https://github.com/josegude-ux/Mi-Bowling/pull/37), abierta draft y apilada sobre #36; no fusionada.  
**Comparación GitHub:** base I16 `2e5909cf296e10d16bc0a70b9986daeb46bca8f3`; ocho archivos I17 **solo añadidos**, ninguno de I11–I16, FGB CP-020, PWA o producción editado o eliminado. Ahead 11, behind 0 antes de este checkpoint documental.  
**Main corroborado:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`, intacto.

**Resultados extraídos de los logs CI del SHA funcional:**
- Node CP-020 y FGB: PASS, 31 eventos oficiales (10 gallegos, 21 nacionales), sin modificación de datos ni filtros.
- Regresiones I11–I16: PASS.
- Node I17: PASS, bifurcación de checkpoint firmada que resulta en cuarentena, pérdida de raíz y marca exterior, pérdida total de confianza I15, dos copias vigentes y una ausente/antigua, copia incompatible, A/B/C y tres verificaciones concurrentes de solo lectura.
- WebKit Linux emulado móvil: PASS; Chromium escritorio: PASS, pérdidas totales y parciales, bifurcación firmada, identidad cruzada B, sin IndexedDB ni conexiones externas.

**Interpretación estricta:** las pruebas muestran que un sistema puede clasificar evidencias bajo anclas externas suministradas, no que exista realmente una fuente inmutable, sello temporal o tres custodios independientes. Sin referencias exteriores auténticas, el resultado sigue bloqueado. El checkpoint no concede permiso para publicar, fusionar ni recuperar cuentas reales.

**Cierre del SHA documental:** este documento se actualizará mediante un commit distinto del funcional. Su CI definitiva deberá comprobarse antes de declarar el cierre documental.

## Orden de continuidad

I17 debe quedar en nueva PR draft sobre #36, solo archivos nuevos, no reescribir I11–I16 ni modificar `main`. Mantener todos los checkpoints, PRs previas, datos publicados, producción y servicios protegidos. Ejecutar y verificar en GitHub la CI del código funcional, documentar SHA funcional y checkpoint `BOWLING-I17-CP-001`; después comprobar CI del HEAD documental exacto. No afirmar éxito sin registros completos ni prometer que el procedimiento resuelve frescura en ausencia de referencia externa independiente.
