/* MI BOWLING · LAB I4 · verified CP-020 engine + injected persistence port.
 * Deliberately no browser localStorage reads/writes. Only in-memory staging.
 * Production app.js is NEVER overwritten; same-origin source is Git-blob verified
 * before lexical API substitution in the isolated, authenticated LAB.
 */
(function(root){
'use strict';
const SHA='8787aeba7ef9eb5dee23af4daabf5b35d2c766c2';
const KEY='mi-bowling-analitica-v2';
const LEAGUE='mi-bowling-liga-v1';
function createPort({personal,league,onPersonal}){
 if(typeof onPersonal!=='function'||!personal||!league)throw Error('I4: puerto no inicializado');
 const mem=new Map([[KEY,JSON.stringify(personal)],[LEAGUE,JSON.stringify(league)]]);
 let live=true;
 function check(){if(!live)throw Error('I4: puerto cerrado');}
 return Object.freeze({
  getItem(k){check();return mem.has(String(k))?mem.get(String(k)):null;},
  setItem(k,v){
   check();k=String(k);v=String(v);
   if(k===KEY){
    // Validate before replacing the staged score snapshot.
    const next=JSON.parse(v);
    if(next?.version!==2||!Array.isArray(next.sessions)||!Array.isArray(next.balls)||
        !Array.isArray(next.patterns)||Object.prototype.hasOwnProperty.call(next,'leagueNational'))
     throw Error('I4: puntuaciones inválidas');
    mem.set(k,v);
    onPersonal(next);
   }else{
    // Other CP-020 preferences/league UI stay ephemeral, NEVER enter personal scores.
    mem.set(k,v);
   }
  },
  removeItem(k){check();if(String(k)===KEY)throw Error('I4: borrado de puntuaciones deshabilitado');mem.delete(String(k));},
  clear(){throw Error('I4: no se permite borrar estado completo');},
  key(n){check();return [...mem.keys()][n]??null;},
  get length(){check();return mem.size;},
  close(){live=false;mem.clear();}
 });
}
async function verifiedMain(){
 if(!root.crypto?.subtle)throw Error('I4: no hay verificación criptográfica de engine');
 const url=new URL('app.js?v=338fgb1',root.document.baseURI);
 if(url.origin!==root.location.origin||url.pathname!=='/app.js')
  throw Error('I4: origen de engine no permitido');
 const response=await root.fetch(url.href,{credentials:'omit',cache:'no-store',redirect:'error'});
 if(!response.ok||response.url!==url.href)throw Error('I4: fuente CP-020 no disponible');
 const src=await response.text();
 const raw=new TextEncoder().encode(src);
 const prefix=new TextEncoder().encode('blob '+raw.length+'\0');
 const bytes=new Uint8Array(prefix.length+raw.length);
 bytes.set(prefix);bytes.set(raw,prefix.length);
 const digest=await root.crypto.subtle.digest('SHA-1',bytes);
 const got=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 if(got!==SHA)throw Error('I4: app.js difiere del CP-020 aprobado');
 if(!/\blocalStorage\b/.test(src))throw Error('I4: falta contrato original de almacenamiento');
 const rewritten=src.replace(/\blocalStorage\b/g,'MiBowlingI4Port')
                    .replace(/\bsessionStorage\b/g,'MiBowlingI4Ephemeral');
 if(/\blocalStorage\b|\bsessionStorage\b/.test(rewritten))
  throw Error('I4: acceso a almacenamiento del navegador residual');
 return rewritten;
}
async function loadMain(port){
 if(root.MiBowlingI2Isolation?.status().ready!==true)
  throw Error('I4: guard de aislamiento ausente');
 if(root.MiBowlingI4Port)throw Error('I4: engine no puede cargarse dos veces');
 const src=await verifiedMain();
 root.MiBowlingI4Port=port;
 // Explicit, inert memory-only fallback for any sessionStorage token.
 const sessions=new Map();
 root.MiBowlingI4Ephemeral=Object.freeze({
  getItem:k=>sessions.get(String(k))??null,
  setItem:(k,v)=>sessions.set(String(k),String(v)),
  removeItem:k=>sessions.delete(String(k)),clear:()=>sessions.clear()
 });
 try{
  const s=root.document.createElement('script');
  s.textContent=src+'\n//# sourceURL=mi-bowling-i4-verified-cp020.js';
  root.document.body.appendChild(s);
  if(typeof root.save!=='function'||typeof root.go!=='function')
   throw Error('I4: motor CP-020 no se inicializó');
  return true;
 }catch(e){
  port.close();root.MiBowlingI4Port=null;throw e;
 }
}
root.MiBowlingI4Engine=Object.freeze({createPort,loadMain,sourceGitBlob:SHA});
})(window);
