# MI BOWLING 3.3.28 · Resultados oficiales de la Federación Galega

Pantalla «Resultados oficiales» (Calendario → Resultados oficiales, y tarjeta en Inicio). Importa varios PDF a la vez, con vista previa.

Formatos reconocidos (PDF de texto de la FGB, temporada 2026-27):
- Clasificación general (masculina y femenina): pos, categoría, nombre completo, club, partidas, bolos, promedio, máxima, hándicap. Se guarda cada clasificación; se compara con la anterior (▲▼ posiciones, ± promedio).
- Parejas (podio y resumen adelantado): categoría, pareja, club, total, J1 + J2, hándicaps; jugadores individuales.
- Copa (resumen por series): categoría, jugador, club, bolos, scratch, serie.
- Orden de pistas: serie, fecha y hora, categoría, pistas (5A → 7A).
- Distribución de series (circuito): serie y hora.
No legibles: PDF escaneados (p. ej. circular 6220). No incluido aún: clasificación por equipos de la Copa del Rey (FEB).

Identificación de jugadores entre formatos («GUDE HERVÉS, Raul», «R. GUDE», «RAUL GUDE»): club + primer apellido + nombre/inicial/apodo por prefijo + categoría. Nombre de uso tomado de copas/pistas («Reydnier Chavez», «Manuel Novo»). Ambiguos se muestran tal cual.

Seguimiento: por defecto todo el club CELTA (en las gallegas todos son Celta B); se puede desmarcar a jugadores o ver todos los clubs. Datos en `liga32.federacion` (entra en copias y nube). Dos versiones de la misma competición (resumen adelantado y definitivo): se conserva la más completa.

Pruebas: `tests/resultados-fgb.test.cjs` (líneas sintéticas) y `tests/resultados-fgb-browser.cjs` (PDF reales fuera del repositorio, `FGB_PDF_DIR`).
