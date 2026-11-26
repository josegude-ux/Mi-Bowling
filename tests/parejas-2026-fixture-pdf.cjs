'use strict';
/* PDF sintético generado en memoria, sin información personal ni PDF de terceros.
 * PDF 1.4 con Helvetica y tabla vectorial/texto nativo para pdf.js. */
function pdfFixture(lines){
 if(!Array.isArray(lines)||lines.length<1||lines.length>35)throw Error('invalid lines');
 const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[^\x20-\x7E]/g,'?');
 let stream='BT\n/F1 12 Tf\n60 790 Td\n';
 for(let i=0;i<lines.length;i++)stream+='('+esc(lines[i])+') Tj\n'+(i===lines.length-1?'':'0 -22 Td\n');
 stream+='ET\n';
 const objs=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+Buffer.byteLength(stream,'latin1')+' >>\nstream\n'+stream+'endstream'
 ];
 let pdf='%PDF-1.4\n',offsets=[0];
 for(let i=0;i<objs.length;i++){offsets.push(Buffer.byteLength(pdf,'latin1'));pdf+=(i+1)+' 0 obj\n'+objs[i]+'\nendobj\n'}
 const xref=Buffer.byteLength(pdf,'latin1');
 pdf+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return Buffer.from(pdf,'latin1');
}
module.exports={pdfFixture};
if(require.main===module){
 const fs=require('node:fs'),out=process.argv[2];
 if(!out)throw Error('path required');
 fs.writeFileSync(out,pdfFixture(['CLASIFICACION PAREJAS 2026','SEGUNDA CATEGORIA','POS CAT PAREJA PARTIDAS BOLOS','1 2M EQUIPO UNO 1 400','2 2M CELTA XUNTA 1 380','3 2M EQUIPO TRES 1 360']));
 console.log('PDF ficticio generado: '+out);
}
