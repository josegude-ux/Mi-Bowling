# MI BOWLING · I14 · Ciclo de confianza: rotación y retirada firmada de claves (LAB)

**Orden:** BOWLING-INTEGRACION-CP020-I14-20261109  
**Fecha de trabajo:** 9 noviembre 2026  
**Punto de partida I13 verificado:** PR [#33](https://github.com/josegude-ux/Mi-Bowling/pull/33), draft, checkpoint `BOWLING-I13-CP-001`, HEAD documental `a68f90c5a5641a6ecad28778c9389d6c1d043a27`, código funcional `4fe2ec68e406f02e0fd5ec252191a3260908bb7f`.  
**CI I13 definitivo:** [push 42610253021](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42610253021) y [PR 42610261797](https://github.com/josegude-ux/Mi-Bowling/actions/runs/42610261797), ambos **SUCCESS 2/2** sobre mismo HEAD documental.  
**Rama I14:** `feature/integracion-main-auth-i14-lab-20261109`, creada del SHA exacto I13.  
**Main observado antes de modificar LAB:** `7fbb3fb32d889c3213626e5f73c49b0885ef9911`.  
**Restricciones:** solo A/B/C ficticios, ninguna credencial de servicio, ninguna conexión a datos auténticos, ninguna fusión ni publicación.

## Riesgo prioritario del I13

El quórum de firmas de I13 verifica un conjunto estático de claves. Si una se pierde o se compromete, no existía todavía un contrato de transición que permitiera revisar el conjunto autorizado sin aceptar automáticamente como vigente una clave antigua o una política sustituida. La validez matemática de una firma **no acredita la fecha ni quién controlaba físicamente la clave**. I14 aborda exclusivamente la transición verificable entre políticas, manteniendo pendientes los controles físicos y externos.

## Funcionalidad nueva

1. `lab/i14-policy-lifecycle.js`: protocolo independiente de época criptográfica. La **génesis** se vincula a `.gen14` conservado externamente con SHA de la política pública I13 inicial. Cada etapa posterior contiene una declaración canónica de época, acción, hash de época anterior, SHA de políticas anterior/nueva y digest de último manifiesto I12.
2. `rotate`: requiere al menos una clave pública nueva, un quórum de firmas de la política anterior sobre el contexto `OLD` y otro quórum de la política nueva sobre el contexto `NEW`. No confunde ambas firmas por usar dominios de firma distintos. Sin el quórum antiguo la rotación ordinaria **falla de forma conservadora**; no se habilita una recuperación administrativa tácita.
3. `revoke`: exige al menos la retirada de una clave pública y la doble autorización anterior/nueva. Una huella retirada no puede volver a introducirse en época posterior de esta cadena, ni se permite usarla como firmante nuevo tras la retirada. Un intento de retorno se rechaza incluso si el archivo resulta internamente coherente.
4. Para cada época se recalculan las exportaciones I11/I12 y el testigo I13 con su política y PIN I13 separado. Los manifiestos siguientes no pueden reducir el recuento de exportaciones ni cambiar el prefijo de las entradas antiguas.
5. El último `.pin14` externo debe concordar exactamente con número de épocas, hash de transición final, SHA de la política final y digest de manifiesto. Un paquete antiguo firmado correctamente y todos sus testigos antiguos **no** superan la comparación si el PIN independiente nuevo permanece retenido.
6. `lab/integracion-main-auth-i14.html` y `lab/i14-ui.js`: herramienta de verificación local estrictamente sin escritura con controles para paquete `.ml14`, políticas públicas externas `.trust14`, PIN I13 por época `.pins13`, ancla inicial `.gen14`, PIN final `.pin14` y frase de evidencia exclusivamente ficticia introducida en memoria. No emite firmas, no crea claves privadas y no abre la app pública.
7. `tests/i14-lifecycle-fixture.cjs`: genera exclusivamente **en RAM de Node** claves temporales para A/B/C, tres políticas sintéticas, firmas duales, dos claves retiradas y ficheros I11 cifrados; jamás incluye claves privadas en archivos I14 ni en la UI.

## Matriz de seguridad y pruebas

- Génesis con 2/3 firmas, rotación con 2 firmas de clave anterior y 2 de nueva, retirada posterior con doble quórum y prohibición de reintroducir huellas retiradas.
- Pérdida de firma, firmante ajeno, firma alterada, cambio de acción sin resignar, sustitución de política de génesis, sustitución de PIN final, supresión de época, orden invertido, pérdida de exportación I11, historial anterior y paquete contaminado.
- Contraste de testigo I11 local frente a última época con resultado rollback/bifurcación o estado alineado, sin reparar ni escribir.
- Concurrencia: tres verificaciones paralelas solo lectura, cuentas A/B/C separadas y aislamiento de identidad.
- CI: `.github/workflows/integracion-i14-lab.yml`, jobs Node CP-020/FGB/regresiones I11/I12/I13 y navegador WebKit Linux emulado móvil + Chromium escritorio con HTTPS loopback y bloqueo de red externa.
- Comparación de Git: todos los archivos I14 se añaden sin editar ni suprimir archivos anteriores; ningún cambio a activos CP-020 ni al calendario FGB. La matriz FGB de referencia es 31 eventos (10 gallegos, 21 nacionales).

## Limitaciones no resueltas

**No es un sistema de certificados ni una infraestructura PKI real.** No hay archivo independiente físicamente custodiado demostrado, ni prueba de control de custodios distintos, ni reloj seguro, ni autoridad externa de revocación, ni revocación retrospectiva demostrable. Una firma realizada con una clave que luego se compromete no puede fecharse históricamente mediante esta cadena. La retirada solo impide su **uso lógico en políticas posteriores de esta secuencia**, no invalidaciones retroactivas acreditadas.

La rotación por doble quórum no resuelve compromiso del quórum antiguo: ante pérdida o compromiso del quórum, el protocolo falla y requeriría un proceso externo de nueva raíz con aprobación específica. Tampoco se prueba protección cuando un adversario sustituye conjuntamente todos los archivos, anclas, claves y PIN independientes, ni contra el caso de usuarios que no retengan las referencias externamente. No se ha ejecutado Safari iPhone físico, corte eléctrico ni múltiples dispositivos verdaderos.

## Continuidad

La PR I14 debe continuar draft sobre PR #33. No cambiar `main`, producción, PWA, FGB CP-020, PR anteriores o servicios reales. Añadir checkpoint funcional y SHA **solo después de observar los resultados CI**, y distinguir expresamente CI de código de CI documental.
