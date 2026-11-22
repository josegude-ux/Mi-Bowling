# MI BOWLING · 3.3.21-prueba · Copia en la nube (Supabase)

**Proyecto:** `control-cargas-movil` (oevetnszmfxeukcncwji), esquema propio `mibowling` (solo aditivo).

## Base de datos (migraciones `mibowling_copias_cifradas`, `mibowling_copias_limite_tamano`)
- `mibowling.copias`: RLS activado y **sin políticas** + `revoke all` → sin acceso directo.
- Acceso solo por `public.mibowling_guardar_copia`, `public.mibowling_listar_copias`, `public.mibowling_obtener_copia` (SECURITY DEFINER, `search_path=''`, filtran por `auth.uid()`, solo `authenticated`).
- Sin duplicados (misma huella), se conservan 30 copias por usuario, cifrado ≤ 7 MB.
- Probado en transacción revertida: guardar, no duplicar, listar, obtener, otro usuario ve 0, anon y acceso directo → 42501.

## App
- `integracion/nube-supabase.js`: login con correo y contraseña (clave publicable), AES-GCM 256 con clave PBKDF2-SHA256 (310 000) derivada de la contraseña y sal = id de usuario; CryptoKey no exportable en IndexedDB; gzip antes de cifrar.
- Copia automática 20 s después de guardar, revisión cada minuto y al salir de la app; nada si no hay cambios.
- Restaurar: descifra, comprueba huella y formato, sube antes copia del estado actual y aplica clave a clave (sin journal local, ver abajo).
- Tarjeta «Copia en la nube» en Ajustes.

## Pruebas
`tests/nube-supabase-browser.cjs` (Supabase simulado, historial ficticio de 300 sesiones / 3,1 MB → 63 KB): PASS.

## Hallazgo previo (no introducido aquí)
`MiBowlingAutoridad.transaction` guarda el journal before+after completo en localStorage: con historiales ≳1,5–2 MB supera la cuota y fallan restauraciones locales y altas desde catálogo (sin pérdida de datos). Propuesta: journal en IndexedDB.
