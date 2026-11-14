/* CP018: add a read-only backup action to CP004 settings. Do not change the game engine. */
(function(root){'use strict';
 const original=root.settings;
 if(typeof original!=='function'||!root.MiBowlingBackup)return;
 const anchor='<div class="actions"><button class="btn primary" onclick="exportData()">↓ Exportar copia</button>';
 const extra='<p class="hint">La copia completa guarda historial, arsenal, fotos personales, Liga, selecciones, ajustes y PDF locales. Guarda la partida y cierra otras ventanas antes de exportar. El botón Importar copia solo admite el JSON habitual; la recuperación de la copia completa requiere su herramienta de extracción.</p><button type="button" class="btn primary block mt12" onclick="MiBowlingBackup.download()">↓ Exportar copia completa</button>';
 root.settings=function(){const html=original.apply(this,arguments);const i=html.indexOf(anchor);if(i===-1||html.indexOf(anchor,i+anchor.length)!==-1){console.error('MI BOWLING: control de copia completa no disponible; anclaje inesperado');return html;}return html.replace(anchor,extra+anchor);};
})(window);
