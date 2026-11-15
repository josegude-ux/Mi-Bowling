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
    "state": "ficha-fabricante-verificada",
    "note": "Ficha PRO-am/ABS de Elite Performer Solid de 2026. Valores de 15 lb; no confundir con Elite Performer Hybrid.",
    "cover": "Pa 65 Solid Reactive",
    "core": "Innovative Core",
    "rg": "2.550 (15 lb)",
    "diff": "0.035 (15 lb)",
    "finish": "Power Edge",
    "technicalSource": "https://www.absbowling.co.jp/news/elite-performer%E3%83%AA%E3%83%BC%E3%82%BA%E6%9C%80%E6%96%B0%E4%BD%9C-elite-performer-solid%E7%99%BA%E5%A3%B2%EF%BC%81/",
    "photoPage": "https://www.absbowling.co.jp/news/elite-performer%E3%83%AA%E3%83%BC%E3%82%BA%E6%9C%80%E6%96%B0%E4%BD%9C-elite-performer-solid%E7%99%BA%E5%A3%B2%EF%BC%81/"
  },
  {
    "rank": 2,
    "brand": "Motiv",
    "model": "(Orion) Nebula",
    "state": "pendiente",
    "note": "Registro PBA confirma Orion Nebula como modelo 2026 independiente de MOTIV Nebula de 2025. Un comercio especializado coincide en datos técnicos, pero no se han trasladado a la ficha porque falta fuente del fabricante o distribuidor oficialmente acreditado; no usar imagen de Nebula 2025.",
    "identityEvidence": {
      "source": "https://www.pba.com/registered-products/motiv",
      "authority": "Registro PBA de productos MOTIV",
      "checkedOn": "2026-11-10",
      "finding": "Orion Nebula, aprobación 2026-11-03; diferente de Nebula 2025"
    },
    "commercialEvidence": {
      "source": "https://www.bowling.com/products/motiv-orion-nebula.htm",
      "authority": "Comercio especializado, no licencia de distribuidor MOTIV acreditada",
      "checkedOn": "2026-11-10",
      "finding": "Ficha comercial de Orion Nebula 2026: cubierta Dynamic Leverage Solid Reactive, Hadron Dual-Density, RG 2.50 y diferencial 0.045 (15 lb), 3000 LSP. Pendiente confirmar técnicamente en MOTIV o distribuidor oficial"
    }
  },
  {
    "rank": 3,
    "brand": "PBS",
    "model": "乾坤 木 (Qiankun Wood)",
    "state": "pendiente",
    "note": "PBS Qiankun Wood (乾坤 木): la lista USBC aporta identidad, pero no localizamos ficha técnica propia del fabricante. Sin inferencias de la versión Qiankun Gold."
  },
  {
    "rank": 4,
    "brand": "Storm",
    "model": "Lunar Orbit (Under 13 lbs.)",
    "state": "pendiente",
    "note": "Storm Lunar Orbit (Under 13 lbs.): variante ligera específica. Sin ficha exacta; no extrapolar RG, cubierta ni núcleo de Lunar Orbit de otro peso."
  },
  {
    "rank": 5,
    "brand": "ABS",
    "model": "Nanodesu Accu-Line Tour Premium Intel III",
    "state": "ficha-fabricante-verificada",
    "note": "Modelo INTEL III, no INTEL II ni Tour Premium IX. Valor 15 lb y diferencial intermedio 0.012.",
    "cover": "Nano-Bond 2.0 Solid (LEVEL 2.0)",
    "core": "Modified Premium Core with Shock-Absorbing Core System IV",
    "rg": "2.523 (15 lb)",
    "diff": "0.040 (15 lb)",
    "finish": "800 Abralon Diamond Compound II Polish",
    "oil": "Medio (fabricante ABS)",
    "technicalSource": "https://www.absbowling.co.jp/product/accu-line-tour-premium-intel3/",
    "photoPage": "https://www.absbowling.co.jp/product/accu-line-tour-premium-intel3/"
  },
  {
    "rank": 6,
    "brand": "Legends",
    "model": "The Black Pearl Phantom",
    "state": "pendiente",
    "note": "Legends The Black Pearl Phantom: distinto de Brunswick Vintage Phantom. Pendiente fabricante, fotografía y especificaciones del modelo exacto."
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
    "note": "Radical The Hitter Teal: no equiparar con The Hitter 2023 ni The Hitter Pearl 2024. RG/diff anteriores NO transferibles; pendiente ficha Teal."
  },
  {
    "rank": 9,
    "brand": "Storm",
    "model": "The Code Black",
    "state": "pendiente",
    "note": "Storm The Code Black aprobado en 2026: hi-sp.co.jp/product/code-black/ corresponde a una reedición de 2022; no atribuirle la misma cubierta, acabado ni foto hasta validar variante."
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
    "state": "ficha-fabricante-verificada",
    "note": "MEGA GRASP 2026 contrastada con página de producto ABS y su reporte oficial de octubre de 2026, distinto de GRASP 2019 y MAX GRASP. RG y diferenciales a 15 lb; foto no licenciada ni copiada.",
    "cover": "Nano-Bond 6.0 Solid (LEVEL.6.0)",
    "core": "Modified BIG Drum Core with Shock-Absorbing Core System IV",
    "rg": "2.501 (15 lb)",
    "diff": "0.045 (15 lb)",
    "finish": "#1000 Abralon",
    "oil": "Medio-alto a alto (ABS)",
    "technicalSource": "https://www.absbowling.co.jp/product/nanodesu-mega-grasp/",
    "photoPage": "https://www.absbowling.co.jp/product/nanodesu-mega-grasp/",
    "sourceAuthority": "Fabricante ABS Japón · reporte de octubre 2026",
    "manufacturerReport": "https://www.absbowling.co.jp/contents/download/ball_report/2026/10/nanodesu_mega_grasp.pdf",
    "intermediateDiff": "0.014 (15 lb)"
  },
  {
    "rank": 12,
    "brand": "Pyramid Bowling",
    "model": "Scarab",
    "state": "ficha-fabricante-verificada",
    "note": "Pyramid Scarab 2026: datos de núcleo y cubierta para el modelo exacto; RG y diff a 15 lb.",
    "cover": "XF Gravitational ATX-XX Hybrid Reactive",
    "core": "SG 19.5 Dual Density Asymmetric",
    "rg": "2.499 (15 lb)",
    "diff": "0.051 (15 lb)",
    "finish": "2000 Grit Abralon",
    "oil": "Medio-alto (fabricante)",
    "technicalSource": "https://www.pyramidbowling.com/bowling-balls/PathPerformance/scarab.html",
    "photoPage": "https://www.pyramidbowling.com/bowling-balls/PathPerformance/scarab.html"
  },
  {
    "rank": 13,
    "brand": "Roto Grip",
    "model": "Idol Star",
    "state": "pendiente",
    "note": "Roto Grip Idol Star (octubre 2026) aparece en USBC; no localizar ficha técnica exacta en sitio del fabricante/distribuidor, evitar heredados de Idol, Idol Helios o Idol Pearl."
  },
  {
    "rank": 14,
    "brand": "Storm",
    "model": "PhysiX Ignition",
    "state": "ficha-fabricante-verificada",
    "note": "Coincidencia exacta PhysiX Ignition (2026), distinta de PhysiX 2018. Ficha de distribuidor oficial de Storm en Japón, 15 lb; diferencial intermedio 0.018.",
    "cover": "R2S Deep Solid Reactive",
    "core": "Atomic A.I. Core",
    "rg": "2.470 (15 lb)",
    "diff": "0.055 (15 lb)",
    "finish": "Power Edge",
    "oil": "Medium / Medium Heavy",
    "technicalSource": "https://hi-sp.co.jp/product/physix_ignition/",
    "photoPage": "https://hi-sp.co.jp/product/physix_ignition/",
    "sourceAuthority": "Distribuidor oficial japonés Storm — Hi-Sports"
  },
  {
    "rank": 15,
    "brand": "Swag",
    "model": "Valkyrie",
    "state": "pendiente",
    "note": "SWAG Valkyrie (octubre 2026) aparece en listado USBC. Ficha técnica del fabricante, producto e imagen aún sin contraste."
  },
  {
    "rank": 16,
    "brand": "Brunswick",
    "model": "Team Brunswick",
    "state": "pendiente",
    "note": "Brunswick Team Brunswick: existe Team Brunswick White (https://brunswickbowling.com/products/balls/current/team-brunswick-white), de poliéster, pero USBC escribe solo Team Brunswick sin color; no asociar automáticamente edición White ni foto."
  },
  {
    "rank": 17,
    "brand": "Brunswick",
    "model": "Vaporize X",
    "state": "pendiente",
    "note": "Brunswick Vaporize X (2026) es diferente de Vaporize (2024). Hoja oficial Brunswick para Vaporize 2024 NO valida Vaporize X; no transferir RG/cover ni fotografía."
  },
  {
    "rank": 18,
    "brand": "Hammer",
    "model": "Black Widow 3.0 Ruby",
    "state": "ficha-fabricante-verificada",
    "note": "Edición Ruby japonesa octubre 2026, distinta de Black Widow 3.0 y de Black Sapphire. Sunbridge es distribuidor oficial de Hammer Japón, acreditado por Brunswick. Valores exclusivos 15 lb. Foto no copiada ni licenciada.",
    "cover": "HK22C² Cohesion Pearl Reactive",
    "core": "Gas Mask Asymmetric Core",
    "rg": "2.500 (15 lb)",
    "diff": "0.058 (15 lb)",
    "finish": "500 / 1000 / 1500 Siaair Micro Pad + Crown Factory Compound",
    "oil": "Medio (Sunbridge Japón)",
    "technicalSource": "https://www.sunbridge-group.com/product/ball/all-balls/black-widow-3-0-ruby/",
    "photoPage": "https://www.sunbridge-group.com/product/ball/all-balls/black-widow-3-0-ruby/",
    "sourceAuthority": "Distribuidor oficial Hammer Japón SUNBRIDGE · octubre 2026",
    "manufacturerReport": "https://www.sunbridge-group.com/pc/download/catalog/ball/2026/2610_black_widow_3_0_ruby.pdf",
    "intermediateDiff": "0.016 (15 lb)"
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
    "state": "ficha-fabricante-verificada",
    "note": "Coincidencia exacta ION MAX VEIL (2026), no ION MAX genérica. Ficha de distribuidor oficial de Storm en Japón, 15 lb; diferencial intermedio 0.014.",
    "cover": "NRG Smooth Solid Reactive",
    "core": "Element Max A.I. Core",
    "rg": "2.470 (15 lb)",
    "diff": "0.055 (15 lb)",
    "finish": "4000-grit Abralon",
    "oil": "Medium",
    "technicalSource": "https://hi-sp.co.jp/product/ion_max_veil/",
    "photoPage": "https://hi-sp.co.jp/product/ion_max_veil/",
    "sourceAuthority": "Distribuidor oficial japonés Storm — Hi-Sports"
  }
].map(x=>Object.freeze(x)));
 root.MiBowlingCatalog20=Object.freeze({updated:'2026-11-10',entries});
})(typeof window==='undefined'?globalThis:window);
