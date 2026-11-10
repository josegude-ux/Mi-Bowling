'use strict';
/* LAB 10/11/2026 · FUENTES / IMÁGENES. No incrustar imágenes de terceros sin permiso.
 * Los 3 enlaces de fotografía abren la PÁGINA ORIGINAL DEL FABRICANTE;
 * la imagen no se copia ni se almacena en MI BOWLING.
 * El resto de 17 entradas se mantienen expresamente pendientes.
 */
(function(root){
 const entries=Object.freeze([
  {
    "rank": 1,
    "brand": "ABS",
    "model": "PRO-am Elite Performer Solid",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 2,
    "brand": "Motiv",
    "model": "(Orion) Nebula",
    "state": "pendiente",
    "note": "No confundir con MOTIV Nebula de 2025; Orion Nebula aún requiere ficha propia."
  },
  {
    "rank": 3,
    "brand": "PBS",
    "model": "乾坤 木 (Qiankun Wood)",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 4,
    "brand": "Storm",
    "model": "Lunar Orbit (Under 13 lbs.)",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 5,
    "brand": "ABS",
    "model": "Nanodesu Accu-Line Tour Premium Intel III",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 6,
    "brand": "Legends",
    "model": "The Black Pearl Phantom",
    "state": "pendiente",
    "note": "No confundir con Brunswick Vintage Phantom."
  },
  {
    "rank": 7,
    "brand": "Brunswick",
    "model": "Purple Rhino Pro (2026)",
    "state": "ficha-fabricante-verificada",
    "note": "Correspondencia con edición Purple Rhino Pro de 2026; RG y diferencial indicados para 15 lb.",
    "cover": "Savvy Hook 4.0 Solid · Solid Reactive",
    "core": "Vintage Light Bulb",
    "rg": "2.568 (15 lb)",
    "diff": "0.032 (15 lb)",
    "finish": "500 / 1000 / 1500 Siaair + Crown Factory Compound",
    "technicalSource": "https://brunswickbowling.com/products/balls/current/purple-rhino-pro",
    "photoPage": "https://brunswickbowling.com/products/balls/current/purple-rhino-pro"
  },
  {
    "rank": 8,
    "brand": "Radical",
    "model": "The Hitter Teal",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 9,
    "brand": "Storm",
    "model": "The Code Black",
    "state": "pendiente",
    "note": "Hay un Code Black histórico; no trasladar datos sin verificar la edición 2026."
  },
  {
    "rank": 10,
    "brand": "Track Inc.",
    "model": "Synthesis Prime",
    "state": "ficha-fabricante-verificada",
    "note": "Ficha Track Synthesis Prime; 15 lb, diferencial intermedio 0.020 disponible en fabricante.",
    "cover": "Prime Response Pearl (HK22C²) · Pearl Reactive",
    "core": "I-Core Gen4",
    "rg": "2.480 (15 lb)",
    "diff": "0.053 (15 lb)",
    "finish": "500 / 1500 / 3000 Siaair Micro Pad",
    "oil": "Medio (fabricante)",
    "technicalSource": "https://trackbowling.com/products/synthesis-prime",
    "photoPage": "https://trackbowling.com/products/synthesis-prime"
  },
  {
    "rank": 11,
    "brand": "ABS",
    "model": "Nanodesu Mega Grasp",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 12,
    "brand": "Pyramid Bowling",
    "model": "Scarab",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 13,
    "brand": "Roto Grip",
    "model": "Idol Star",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 14,
    "brand": "Storm",
    "model": "PhysiX Ignition",
    "state": "pendiente",
    "note": "Ficha localizada en fuente secundaria; falta confirmación de fabricante."
  },
  {
    "rank": 15,
    "brand": "Swag",
    "model": "Valkyrie",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 16,
    "brand": "Brunswick",
    "model": "Team Brunswick",
    "state": "pendiente",
    "note": "Sin ficha exacta contrastada en fabricante; conservar parámetros técnicos vacíos y fotografía pendiente."
  },
  {
    "rank": 17,
    "brand": "Brunswick",
    "model": "Vaporize X",
    "state": "pendiente",
    "note": "No confundir con Brunswick Vaporize histórico."
  },
  {
    "rank": 18,
    "brand": "Hammer",
    "model": "Black Widow 3.0 Ruby",
    "state": "pendiente",
    "note": "No equiparar a Black Widow 3.0 u otras variantes."
  },
  {
    "rank": 19,
    "brand": "Motiv",
    "model": "Raptor (Pursuit)",
    "state": "ficha-fabricante-verificada",
    "note": "La lista USBC escribe «Raptor (Pursuit)»; ficha del fabricante «Raptor Pursuit»; comprobar identidad visual del ejemplar.",
    "cover": "Aerial Propulsion Pearl Reactive",
    "core": "Affliction V2 Symmetric",
    "rg": "2.48 (15 lb)",
    "diff": "0.055 (15 lb)",
    "finish": "5500 Grit LSP",
    "technicalSource": "https://www.motivbowling.com/products/balls/heavy-oil/raptor-pursuit.html",
    "photoPage": "https://www.motivbowling.com/products/balls/heavy-oil/raptor-pursuit.html"
  },
  {
    "rank": 20,
    "brand": "Storm",
    "model": "Ion Max (Veil)",
    "state": "pendiente",
    "note": "La variante Veil no está verificada como la ficha genérica Ion Max."
  }
].map(x=>Object.freeze(x)));
 root.MiBowlingCatalog20=Object.freeze({updated:'2026-11-10',entries});
})(typeof window==='undefined'?globalThis:window);
