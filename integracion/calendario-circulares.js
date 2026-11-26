'use strict';
/* MI BOWLING · Circulares FEB 6246 (sede/formato) y 6249 (orden, horarios, patrones).
 * Actualización aditiva de los cuatro eventos existentes; no crear inscripciones ni partidas personales.
 * Orden íntegro de 161 participantes en data/circular-feb-6249-parejas-2026.json.
 */
globalThis.BOWLING_CALENDAR_CONFIRMED=Object.freeze((()=>{
 const c6246={source:'FEB · Circular 6246 (03/11/2026)',url:'https://static.febolos.es/2026/11/03092212/cto-espana-parejas-bowling-2026.pdf',
  details:['2 series de 12 partidas por pareja (6 por jugador/a en cada serie), 24 en total.','Inscripción hasta el 21/11/2026 (fuera de plazo hasta el 25/11 si quedan plazas).']};
 const c6249=(id,venue,details,extras={})=>({
  ...c6246,...extras,venue,
  source:'FEB · Circular 6249 (26/11/2026) · Orden y patrones',
  url:'integracion/parejas-2026-6249.html#'+id,
  details:[...details,'Orden completo de los 161 jugadores y ficha del patrón en el enlace de la Circular 6249.',...c6246.details]
 });
 return {
  'FGB-2627-09':c6249('masculino_absoluto','OZONE Bowling Zaragoza · C.C. Plaza Imperial, Zaragoza',[
   'Absoluto masculino: turno único a las 11:00; 40 jugadores.',
   'Pista de inicio asignada por jugador; después de cada partida, dos pares de pistas hacia la derecha.',
   'Patrón PAREJAS 2026 · QubicaAMF HVO Summit; hoja técnica pág. 5; no se deduce un volumen único de la hoja.'
  ]),
  'FGB-2627-10':c6249('masculino_2_3','OZONE Bowling X-Madrid · C.C. X-Madrid, Alcorcón (Madrid)',[
   '2.ª y 3.ª masculina: turno único a las 09:00 según encabezado; 32 jugadores.',
   'CELTA XUNTA: José Gude Bermúdez (ES 0147) y Lázaro Galguera Gómez (ES 1046), pista inicial 17.',
   'Incidencia documental: la columna TURNO señala 0 para CELTA XUNTA; el encabezado señala turno único a las 09:00. Pendiente de confirmar con organización.',
   'Después de cada partida se avanzan dos pistas a la derecha (NO dos pares).',
   'Patrón KEGEL IKON PAREJAS 2026: 41 pies; 26,5 ml (18,85 ml adelante y 7,65 ml retorno); reverse brush drop 34 pies.'
  ]),
  'FGB-2627-11':c6249('masculino_senior','Bowling Chamartín · Estación de Chamartín, Madrid',[
   'Sénior masculino: primer turno 09:00 (36 jugadores); segundo turno 12:30 (19 jugadores).',
   'En el primer turno se desplazan dos pares a la derecha tras cada partida; en el segundo, un par.',
   'Domingo: 10 mejores parejas en segunda serie, con las excepciones solicitadas; resto en primera.',
   'Patrón CTOPARSEN26: volumen 27,21 ml, página 10; la hoja no precisa longitud total.'
  ]),
  'FGB-2627-12':c6249('femenino','OZONE Bowling Torrevieja · Torrevieja (Alicante)',[
   'Femenino: turno único a las 11:00; 34 jugadoras.',
   'Después de cada partida se desplazan dos pares de pistas a la derecha.',
   'Patrón PAREJAS 2026 TORREVIEJA · Kegel: 44 pies, 25,65 ml, proporción 1,94:1.'
  ],{title:'CTO. ESPAÑA PAREJAS 2026 FEMENINA (1.ª, 2.ª y SÉNIOR)',changed:'Sede cambiada respecto al calendario provisional: Torrevieja (no Valencia).'})
 };
})());
