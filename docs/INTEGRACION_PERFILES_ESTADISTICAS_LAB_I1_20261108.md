# MI BOWLING · Integración de perfiles locales + estadísticas visuales · LAB I1

**Fecha:** 8 noviembre 2026  
**Orden:** BOWLING-INTEGRACION-PERFILES-ESTADISTICAS-I1  
**Rama aislada:** `integration/perfiles-estadisticas-lab-20261108`  
**Base:** PR #10 `eb39eb95580defd21932a3d465b00f6ff90f1ef2` (a su vez, `main` 3.3.8-prueba `6d0dfbc73bb7033461c816e0e3c85d2315280191`).  
**PR #8:** origen de `profiles.js`, `profiles.css`, pruebas de migración y políticas de almacenamiento. Su rama permanece intacta.  
**PR #10:** origen del nuevo mapa visual de bolos, también intacta.  
**PR #1:** pista 3D, separada. **No modificada.**

**Checkpoint técnico previamente probado:** `c7a0c45e78b284d531670889307fb3b96b1a608e`.  
**CI verificado:** https://github.com/josegude-ux/Mi-Bowling/actions/runs/42514543287 — **SUCCESS**.

## Trabajo realizado

1. Rama de integración nueva partiendo de PR #10 (no merge, no rebase ni cambios en `main`, PR #1, PR #8 o PR #10).
2. Se han incorporado los componentes reales de PR #8: selector de jugador, creación de perfiles, cambio con reinicio, PIN opcional de comodidad, bloqueo de datos antiguos ante migración fallida, copias literales de claves antiguas y aislamiento de PDF mediante IndexedDB por perfil.
3. Se ha aplicado al código de la versión **3.3.8-prueba** el espacio de datos de PR #8 para **partidas, estadísticas, bolas, mano de lanzamiento, Liga Nacional, rosters y preferencia de registro**. Permanecen las miniaturas negro/rojo y el marcador actual.
4. La aplicación se inicializa **solo después de elegir un jugador**; `app.js` carga `stats-bolos.js` y utiliza el `db` del perfil actualmente activo. El componente de estadísticas no tiene acceso propio a `localStorage`, `IndexedDB`, otros perfiles ni servicios remotos.
5. Las cuatro estadísticas se calculan desde los tiros reales del perfil seleccionado: primer lanzamiento, segundo lanzamiento, bolo único y combinaciones; conserva los filtros de modalidad (entrenamiento/competición), bola y período.
6. Las exportaciones incluyen identificador de propietario. **La restauración de una copia perteneciente a otro jugador está prohibida**; los JSON antiguos sin propietario solo pueden restaurarse en el perfil legado. Los cambios en varias claves del mismo perfil tienen escrituras verificadas y **reversión de mejor esfuerzo** en caso de fallo por cuota.
7. PWA de LAB con JS/CSS nuevos cacheados con versión diferenciada. No se han añadido servicios de nube ni sincronización.

## Evidencias automatizadas (con datos totalmente ficticios)

- [x] Perfil A: partida completa de **300 puntos**; estadísticas visuales **100 %** en primeros lanzamientos.
- [x] Perfil B: **cero partidas y cero bolas**; las cuatro modalidades sin resultados ni porcentajes inventados.
- [x] Perfil C: partida completa distinta; 100 % de derribos iniciales, datos propios.
- [x] UI con selector real y app real 3.3.8 en Chromium a **390 × 844**, **768 × 1024** y **1440 × 900** para **los tres perfiles**.
- [x] Pruebas de las cuatro modalidades y filtros de bola, entrenamiento/competición y período; se impide leer registros de otro jugador.
- [x] Restauración: JSON de A rechazado en B; JSON sin propietario rechazado en B; copia del propio B admitida. Restauración real de prueba con acta y roster; simulación de cuota insuficiente y reversión de valores.
- [x] Copias antiguas literales preservadas. Migración reversible por error de cuota, manifest inválido y soporte legado `mi-bowling-v1`.
- [x] PIN correcto/incorrecto probado con WebCrypto (sal PBKDF2, hash); no equivale a autenticación fuerte ni cifra datos.
- [x] Regresión del registro 3.3.8 con diez frames y diez miniaturas, estadísticas clásicas conservadas.
- [x] Sin desbordamiento horizontal en las resoluciones comprobadas.
- [x] Capturas de jugadores A/B/C en artefacto `mi-bowling-integracion-perfiles-stats` de GitHub Actions.
- [x] Demo aislada `lab/perfiles-estadisticas.html` con `sessionStorage` temporal bajo prefijo exclusivo, adjuntos deshabilitados y elección real de perfiles; Chrome verifica selección y pantalla de estadísticas.

## Probar la demo (solo datos ficticios)

https://raw.githack.com/josegude-ux/Mi-Bowling/c7a0c45e78b284d531670889307fb3b96b1a608e/lab/perfiles-estadisticas.html

Servicio externo ajeno a GitHub Pages; disponibilidad y gestos en Safari físico **pendientes de confirmar**. No introducir datos personales ni adjuntar archivos. A tiene resultados ficticios; B no tiene partidas; C tiene una partida ficticia perfecta. La demo no utiliza ni modifica almacenamiento de la aplicación publicada.

## Limitaciones y controles antes de producción

- [ ] **Prueba táctil real en Safari/iPhone y Chrome/Android** con cambio repetido de jugador, pantalla en vertical/horizontal, cierre/reapertura y acceso offline.
- [ ] **Pruebas de restauración por archivo desde iPhone físico** y exportación individual; la simulación en Node y Chromium no sustituye el flujo de archivos de iOS.
- [ ] **Respaldo recuperable de los PDF existentes en IndexedDB**: la copia de valores de `localStorage` no duplica los binarios, y el perfil legado sigue leyendo los PDF originales únicamente en modo lectura.
- [ ] **Evaluar cuota disponible** antes de copiar grandes historiales: si la cuota no permite duplicar, la migración bloquea el arranque en vez de arriesgar datos.
- [ ] El PIN es una barrera local de comodidad, no una contraseña segura: no cifra las partidas ni impide que un usuario con acceso al navegador altere el almacenamiento.
- [ ] Reconciliar la PR #9 (3.3.9-prueba) y cualquier cambio posterior de `main` antes de fusionar, sin perder mejoras del marcador.
- [ ] Aprobación expresa del usuario antes de publicar o fusionar.

**Estado:** integración de LAB validada con datos ficticios en CI; producción, `main` y las PR de origen **sin modificar**. No se ha hecho despliegue.
