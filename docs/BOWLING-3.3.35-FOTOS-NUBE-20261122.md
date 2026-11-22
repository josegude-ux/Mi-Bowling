# MI BOWLING 3.3.35 · Fotos privadas compartidas por la nube

- Supabase (proyecto control-cargas-movil): `mibowling.recursos` (un único paquete `fotos-v1`, ≤ 5 MB, huella SHA-256) y `mibowling.miembros`. RLS activo sin políticas; sin permisos directos. Funciones SECURITY DEFINER (`search_path=''`), solo `authenticated`: `mibowling_es_miembro()` (tiene copias o está en miembros), `mibowling_guardar_recurso`, `mibowling_obtener_recurso` (no devuelve contenido si la huella coincide).
- Cliente (`nube-supabase.js`): al entrar o desbloquear, al abrir la app con sesión y tras una copia, si el móvil no tiene fotos las descarga y valida con el módulo de fotos privadas (19 WebP con SHA-256 fijo); si las tiene y la nube no, las sube. Al importar un paquete, se sube. Un usuario sin copias de Mi Bowling no tiene acceso.
- Las fotos no son públicas: solo las cuentas de Mi Bowling del proyecto. Sigue funcionando sin conexión con la copia local.
- Prueba: `tests/fotos-nube-browser.cjs` (Supabase y paquete simulados); funciones verificadas en el servidor con transacción revertida.
