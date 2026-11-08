# MI BOWLING — CP-011 · Validación del respaldo y puerta de publicación
Fecha: 2026-11-08
Estado: **Copia JSON del usuario validada en sesión privada; publicación aún bloqueada por PDF local externo al JSON.**

## Continuidad
- Punto de partida: CP-010.
- Candidata: 3.3.6-prueba.
- PR #5 en borrador y sin fusionar.
- Base principal publicada: 3.3.5-prueba, SHA `efe4c9b107267f31574db4511721cba433bfcb76`.
- Respaldo de código: `backup/main-3.3.5-antes-de-3.3.6-20261108`.
- CI: https://github.com/josegude-ux/Mi-Bowling/actions/runs/42498115186 (**success**).

## Evidencia de copia
- El usuario aportó al chat una copia JSON exportada desde el dispositivo el mismo día.
- Se comprobó localmente la sintaxis, estructura y campos esperados de exportación `version=2`, identificación única de sesiones/partidas, arrays de bolos, líneas y contenido de Liga Nacional.
- Se calculó un hash SHA-256 y un informe privado que permanecen en el chat del usuario; **no publicar ni subir la copia real a GitHub**.
- Una prueba previa de exportar/importar JSON con datos **ficticios** fue aprobada.
- La copia real incluye referencias a un PDF de patrón almacenado en IndexedDB. Dicho binario no se incluye en el JSON, por diseño; tampoco se ha acreditado una copia independiente accesible.
- Una búsqueda de solo lectura en recursos personales disponibles no encontró copia externa coincidente.

## Puerta pendiente
- Obtener y verificar respaldo externo del PDF referenciado: desde la app actual (3.3.5-prueba), ir a Patrones de aceitado → seleccionar patrón → Descargar PDF; guardar en Archivos/iCloud y adjuntar si se desea verificación independiente.
- Si la aplicación responde «PDF no disponible», recuperar el documento original antes de publicar. No pulsar «Adjuntar/sustituir» salvo que se disponga del original correcto.
- El documento debe existir en un lugar independiente de los datos de la PWA.
- Una vez verificado, reevaluar `main`, PR #5, pruebas CI y publicar bajo autorización previa condicionada, sin cambiar claves ni borrar datos.
- PR #1 de 3D sigue excluida y aplazada.

**No se ha fusionado ni desplegado nada en producción.**
