'use strict';
/* F1 LAB: one exclusive writer for all participating pages on the same origin.
 * A page that cannot acquire the lock must not start its application engine.
 * No fallback to an optimistic-only lock. No access to IndexedDB. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingAutoridad=api;})(globalThis,function(){
 const KEYS=Object.freeze(['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-ball-selection-v1','mi-bowling-plantilla-100-v1','mi-bowling-liga-v1','mi-bowling-liga-acta-v32','mi-bowling-liga-rosters-v33','mi-bowling-quick-layout']);
 const JOURNAL='mi-bowling-f1-restore-journal-v1', LOCK='mi-bowling-f1-exclusive-writer-v1';
 const fail=m=>{throw Error(m)};const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
 function snapshot(storage){return Object.fromEntries(KEYS.map(k=>[k,storage.getItem(k)]));}
 function validateRawMap(map){if(!isObj(map)||Object.keys(map).length!==KEYS.length||KEYS.some(k=>!own(map,k)||(map[k]!==null&&typeof map[k]!=='string')))fail('Mapa de almacenamiento no válido.');return map;}
 function same(a,b){return KEYS.every(k=>a[k]===b[k]);}
 function put(storage,k,v){if(v===null)storage.removeItem(k);else storage.setItem(k,v);if(storage.getItem(k)!==v)fail('Escritura no verificable: '+k);}
 /* Journal v2: v1 guardaba before+after completos (8 claves) y con historiales grandes
  * desbordaba la cuota de localStorage. v2 guarda, por clave, la huella de before y after
  * y solo el valor anterior de las claves que cambian, comprimido (LZW sin pérdida, 15 bits
  * por carácter). Se verifica la descompresión antes de tocar ninguna clave. v1 se sigue leyendo. */
 const P15=32768,OFF=32,CAP=1<<22,BASE=65536;
 function bitLen(n){let b=0;while(n>0){b++;n=Math.floor(n/2)}return b}
 function lzw(s){const out=[],dict=new Map();let next=BASE,w='',i=0,acc=0,bits=0;
  const emit=code=>{const wd=bitLen(BASE+i++);acc=acc*2**wd+code;bits+=wd;while(bits>=15){bits-=15;const c=Math.floor(acc/2**bits);out.push(c+OFF);acc-=c*2**bits}};
  for(let k=0;k<s.length;k++){const c=s[k],wc=w+c;if(w===''||dict.has(wc)){w=wc;continue}
   emit(w.length===1?w.charCodeAt(0):dict.get(w));if(next<CAP)dict.set(wc,next++);w=c}
  if(w!=='')emit(w.length===1?w.charCodeAt(0):dict.get(w));
  if(bits>0)out.push(acc*2**(15-bits)+OFF);
  let r='';for(let k=0;k<out.length;k+=8192)r+=String.fromCharCode.apply(null,out.slice(k,k+8192));return r}
 function unlzw(z,n){if(n===0)return '';const ent=[],parts=[];let pos=0,acc=0,bits=0,i=0,len=0,w=null;
  const read=()=>{const wd=bitLen(BASE+i++);while(bits<wd){if(pos>=z.length)fail('Journal dañado: datos truncados.');const c=z.charCodeAt(pos++)-OFF;if(c<0||c>=P15)fail('Journal dañado.');acc=acc*P15+c;bits+=15}
   bits-=wd;const code=Math.floor(acc/2**bits);acc-=code*2**bits;return code};
  while(len<n){const code=read();let e;
   if(code<BASE)e=String.fromCharCode(code);else if(code-BASE<ent.length)e=ent[code-BASE];
   else if(w!==null&&code-BASE===ent.length)e=w+w[0];else fail('Journal dañado: código inválido.');
   if(w!==null&&BASE+ent.length<CAP)ent.push(w+e[0]);parts.push(e);len+=e.length;w=e}
  const r=parts.join('');if(r.length!==n)fail('Journal dañado: longitud.');return r}
 function fp(v){if(v===null)return 'null';let h1=0xdeadbeef,h2=0x41c6ce57;
  for(let k=0;k<v.length;k++){const c=v.charCodeAt(k);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return v.length+':'+(h2>>>0).toString(36)+(h1>>>0).toString(36)}
 function packValue(v){if(v===null)return {n:1};const z=lzw(v);if(unlzw(z,v.length)!==v)fail('Compresión no verificable.');return {z,l:v.length}}
 function unpackValue(p){if(!isObj(p))fail('Journal dañado.');if(p.n===1)return null;if(typeof p.z!=='string'||!Number.isSafeInteger(p.l)||p.l<0)fail('Journal dañado.');return unlzw(p.z,p.l)}
 function buildJournal(before,after){const keys={};for(const k of KEYS){const e={b:fp(before[k]),a:fp(after[k])};if(before[k]!==after[k])e.v=packValue(before[k]);keys[k]=e}return {version:2,keys}}
 function readJournal(storage){const raw=storage.getItem(JOURNAL);
  if(raw===null)return null;let j;try{j=JSON.parse(raw)}catch{fail('Journal dañado: no abrir la aplicación.')}
  if(isObj(j)&&j.version===1){validateRawMap(j.before);validateRawMap(j.after);return j}
  if(!isObj(j)||j.version!==2||!isObj(j.keys)||Object.keys(j.keys).length!==KEYS.length)fail('Journal incompatible.');
  // Normaliza v2 a {before:valor exacto o undefined, bf, af} por clave.
  const keys={};for(const k of KEYS){const e=j.keys[k];if(!isObj(e)||typeof e.b!=='string'||typeof e.a!=='string')fail('Journal incompatible.');
   const x={bf:e.b,af:e.a};if(own(e,'v')){x.before=unpackValue(e.v);if(fp(x.before)!==e.b)fail('Journal dañado: huella.')}else if(e.b!==e.a)fail('Journal incompatible.');keys[k]=x}
  return {version:2,keys}}
 function recover(storage){const j=readJournal(storage);
  if(!j)return false;
  if(j.version===2){const cur=snapshot(storage),f={};for(const k of KEYS){f[k]=fp(cur[k]);if(f[k]!==j.keys[k].bf&&f[k]!==j.keys[k].af)fail('Conflicto en recuperación: conservar journal, no sobrescribir.')}
   for(const k of KEYS){const x=j.keys[k];if(f[k]!==x.bf){if(x.before===undefined)fail('Conflicto durante recuperación: '+k);put(storage,k,x.before)}}
   const now=snapshot(storage);if(KEYS.some(k=>fp(now[k])!==j.keys[k].bf||(j.keys[k].before!==undefined&&now[k]!==j.keys[k].before)))fail('Recuperación no verificable.');
   put(storage,JOURNAL,null);return true}
  const current=snapshot(storage);
  if(KEYS.some(k=>current[k]!==j.before[k]&&current[k]!==j.after[k]))fail('Conflicto en recuperación: conservar journal, no sobrescribir.');
  for(const k of KEYS){const v=storage.getItem(k);if(v!==j.before[k]&&v!==j.after[k])fail('Conflicto durante recuperación: '+k);if(v!==j.before[k])put(storage,k,j.before[k]);}
  if(!same(snapshot(storage),j.before))fail('Recuperación no verificable.');
  put(storage,JOURNAL,null);return true;
 }
 function create(storage,hasLock,onBlocked=()=>{}){
  if(typeof hasLock!=='function'||hasLock()!==true)fail('Sin bloqueo exclusivo.');
  recover(storage);let expected=snapshot(storage),blocked=false,maintenanceToken=null,maintenanceDone=Promise.resolve();
  function block(reason){if(!blocked){blocked=true;onBlocked(reason)}return false;}
  function assertAuthority(token=null){if(maintenanceToken!==token)fail('Restauración integral en curso o permiso caducado.');if(blocked||hasLock()!==true)fail('Autoridad de escritura no disponible.');if(!same(snapshot(storage),expected)||storage.getItem(JOURNAL)!==null){block('El almacenamiento cambió fuera de la autoridad.');fail('Estado obsoleto; no sobrescribir.')}return true;}
  function write(k,v){if(!KEYS.includes(k))fail('Clave no autorizada: '+k);if(v!==null&&typeof v!=='string')fail('Valor no válido.');assertAuthority();try{put(storage,k,v);expected[k]=v;}catch(e){if(storage.getItem(k)!==expected[k])block('Escritura incierta; recargar después de verificar.');throw e;}}
  function transaction(after,token=null){validateRawMap(after);assertAuthority(token);const before={...expected};if(same(before,after))return false;
   // Journal must exist and be readable before any target key is changed.
   try{put(storage,JOURNAL,JSON.stringify(buildJournal(before,after)));}catch(e){if(storage.getItem(JOURNAL)!==null)block('Journal no verificable.');throw e;}
   try{for(const k of KEYS){if(storage.getItem(k)!==before[k])fail('Cambio externo durante restauración: '+k);if(before[k]!==after[k])put(storage,k,after[k]);}if(!same(snapshot(storage),after))fail('Restauración no verificable.');put(storage,JOURNAL,null);expected={...after};return true;}
   catch(e){try{recover(storage);expected=snapshot(storage);if(!same(expected,before))fail('Rollback no verificable.');}catch(r){block('Recuperación pendiente; conservar journal.');throw r;}throw e;}
  }
  async function maintenance(run){assertAuthority();const token=Symbol('maintenance');maintenanceToken=token;let done;maintenanceDone=new Promise(r=>done=r);
   const access=Object.freeze({assertAuthority:()=>assertAuthority(token),snapshot:()=>{assertAuthority(token);return {...expected}},transaction:after=>transaction(after,token)});
   try{return await run(access)}finally{maintenanceToken=null;done();}
  }
  return Object.freeze({assertAuthority:()=>assertAuthority(),write,remove:k=>write(k,null),transaction:after=>transaction(after),snapshot:()=>{assertAuthority();return {...expected}},maintenance,whenIdle:()=>maintenanceDone,block,isBlocked:()=>blocked});
 }
 async function startBrowser({onBlocked,run}){
  if(!globalThis.isSecureContext||!navigator.locks?.request)throw Error('Web Locks no disponible: no se puede abrir sin protección de escritura.');
  let release,held=false,started=false,guard;const untilRelease=new Promise(r=>release=r);
  const close=()=>{held=false;Promise.resolve(guard?.whenIdle()).then(release)};
  window.addEventListener('pagehide',close,{once:true});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
  return navigator.locks.request(LOCK,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock)throw Error('Otra pestaña de MI BOWLING tiene el control. Ciérrala y recarga.');held=true;
   try{guard=create(localStorage,()=>held,onBlocked);window.MiBowlingEscritura=guard;
    window.addEventListener('storage',e=>{if(e.storageArea===localStorage&&(e.key===null||KEYS.includes(e.key)||e.key===JOURNAL))guard.block('Cambio externo detectado. Cierra la pestaña y revisa el respaldo antes de recargar.');});
    await run(guard);started=true;await untilRelease;
   }finally{held=false;if(!started)release();}
  });
 }
 return Object.freeze({KEYS,JOURNAL,LOCK,snapshot,validateRawMap,recover,create,startBrowser,_journal:Object.freeze({lzw,unlzw,fp,buildJournal})});
});
