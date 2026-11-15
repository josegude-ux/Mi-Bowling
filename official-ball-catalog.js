'use strict';
/* MI BOWLING · BOWLING-ARSENAL-SOURCES-CP-001 · CATÁLOGO LOCAL DE REFERENCIAS.
 * Nombres observados en páginas oficiales el 2026-11-10. No es una API, ni
 * un feed en directo, ni una base exhaustiva; no importa specs sin verificar.
 * No se consultan URLs ni se escribe en el almacenamiento del usuario.
 */
(function(root){
 const catalogs=Object.freeze({
  "Storm": "https://www.stormbowling.com/bowling-equipment/bowling-balls/",
  "Hammer": "https://hammerbowling.com/collections/balls",
  "Track": "https://trackbowling.com/collections/balls",
  "DV8": "https://dv8bowling.com/products/balls/current",
  "Brunswick": "https://brunswickbowling.com/products/balls"
});
 const models=Object.freeze([
  {
    "id": "official-storm-equinox",
    "brand": "Storm",
    "model": "Equinox",
    "sourceUrl": "https://www.stormbowling.com/bowling-equipment/bowling-balls/",
    "sourceType": "catalog"
  },
  {
    "id": "official-storm-ion-max",
    "brand": "Storm",
    "model": "Ion Max",
    "sourceUrl": "https://www.stormbowling.com/bowling-equipment/bowling-balls/",
    "sourceType": "catalog"
  },
  {
    "id": "official-storm-hy-road",
    "brand": "Storm",
    "model": "Hy-Road",
    "sourceUrl": "https://www.stormbowling.com/bowling-equipment/bowling-balls/",
    "sourceType": "catalog"
  },
  {
    "id": "official-storm-pitch-black",
    "brand": "Storm",
    "model": "Pitch Black",
    "sourceUrl": "https://www.stormbowling.com/bowling-equipment/bowling-balls/",
    "sourceType": "catalog"
  },
  {
    "id": "official-hammer-black-widow-3-0-dynasty",
    "brand": "Hammer",
    "model": "Black Widow 3.0 Dynasty",
    "sourceUrl": "https://hammerbowling.com/collections/balls/products/black-widow-3-0-dynasty",
    "sourceType": "product"
  },
  {
    "id": "official-hammer-deep-ocean-vibe",
    "brand": "Hammer",
    "model": "Deep Ocean Vibe",
    "sourceUrl": "https://hammerbowling.com/collections/balls/products/deep-ocean-vibe",
    "sourceType": "product"
  },
  {
    "id": "official-hammer-zero-mercy-hybrid",
    "brand": "Hammer",
    "model": "Zero Mercy Hybrid",
    "sourceUrl": "https://hammerbowling.com/collections/balls",
    "sourceType": "catalog"
  },
  {
    "id": "official-hammer-black-widow-tour-v1",
    "brand": "Hammer",
    "model": "Black Widow Tour V1",
    "sourceUrl": "https://hammerbowling.com/collections/balls",
    "sourceType": "catalog"
  },
  {
    "id": "official-track-theorem-delta",
    "brand": "Track",
    "model": "Theorem Delta",
    "sourceUrl": "https://trackbowling.com/collections/balls/products/theorem-delta",
    "sourceType": "product"
  },
  {
    "id": "official-track-paragon-fire",
    "brand": "Track",
    "model": "Paragon Fire",
    "sourceUrl": "https://trackbowling.com/collections/balls/products/paragon-fire",
    "sourceType": "product"
  },
  {
    "id": "official-track-synthesis",
    "brand": "Track",
    "model": "Synthesis",
    "sourceUrl": "https://trackbowling.com/collections/balls",
    "sourceType": "catalog"
  },
  {
    "id": "official-track-stealth-mode-hybrid",
    "brand": "Track",
    "model": "Stealth Mode Hybrid",
    "sourceUrl": "https://trackbowling.com/collections/balls",
    "sourceType": "catalog"
  },
  {
    "id": "official-dv8-outsider",
    "brand": "DV8",
    "model": "Outsider",
    "sourceUrl": "https://dv8bowling.com/products/balls/current",
    "sourceType": "catalog"
  },
  {
    "id": "official-dv8-smooth-criminal",
    "brand": "DV8",
    "model": "Smooth Criminal",
    "sourceUrl": "https://dv8bowling.com/products/balls/current",
    "sourceType": "catalog"
  },
  {
    "id": "official-dv8-intense-collision",
    "brand": "DV8",
    "model": "Intense Collision",
    "sourceUrl": "https://dv8bowling.com/products/balls/current",
    "sourceType": "catalog"
  },
  {
    "id": "official-dv8-heckler-taunt",
    "brand": "DV8",
    "model": "Heckler Taunt",
    "sourceUrl": "https://dv8bowling.com/products/balls/current",
    "sourceType": "catalog"
  },
  {
    "id": "official-dv8-double-trouble",
    "brand": "DV8",
    "model": "Double Trouble",
    "sourceUrl": "https://dv8bowling.com/products/balls/current",
    "sourceType": "catalog"
  },
  {
    "id": "official-brunswick-purple-rhino-pro",
    "brand": "Brunswick",
    "model": "Purple Rhino Pro",
    "sourceUrl": "https://brunswickbowling.com/products/balls",
    "sourceType": "catalog"
  },
  {
    "id": "official-brunswick-combat-solid",
    "brand": "Brunswick",
    "model": "Combat Solid",
    "sourceUrl": "https://brunswickbowling.com/products/balls",
    "sourceType": "catalog"
  },
  {
    "id": "official-brunswick-infinity-quest-pearl",
    "brand": "Brunswick",
    "model": "Infinity Quest Pearl",
    "sourceUrl": "https://brunswickbowling.com/products/balls",
    "sourceType": "catalog"
  },
  {
    "id": "official-brunswick-strategy-logic",
    "brand": "Brunswick",
    "model": "Strategy Logic",
    "sourceUrl": "https://brunswickbowling.com/products/balls",
    "sourceType": "catalog"
  }
].map(model=>Object.freeze(model)));
 root.MiBowlingOfficialBallCatalog=Object.freeze({
  verifiedOn:'2026-11-10',catalogs,models
 });
})(typeof window==='undefined'?globalThis:window);
