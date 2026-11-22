'use strict';
/* MI BOWLING · Copia en la nube (3.3.21).
 * Las partidas siguen viviendo en el iPhone; esto guarda copias cifradas en Supabase.
 * - Cifrado en el dispositivo: AES-GCM 256 con clave derivada de la contraseña (PBKDF2-SHA256, 310 000 vueltas,
 *   sal = id de usuario). La clave no sale del iPhone y se guarda como CryptoKey no exportable en IndexedDB.
 * - En el servidor solo hay texto cifrado, accesible únicamente por su dueño (funciones public.mibowling_*).
 * - Copia: snapshot de las 8 claves protegidas (MiBowlingEscritura.snapshot). Restaurar: validar y aplicar con
 *   guard.transaction (journal), tras subir antes una copia del estado actual.
 * - Preferencias y sesión fuera del prefijo mi-bowling- (no entran en copias locales).
 */
(function(){
 const API='https://oevetnszmfxeukcncwji.supabase.co',KEY='sb_publishable_HH9O16zA-hT7ElScoYOSUQ_u-tcD-ei';
 const SES='mibowling.nube.sesion',EST='mibowling.nube.estado',IDB='mibowling-nube',ST='claves',SCHEMA='mibowling-nube-v1';
 const AUTO_MS=20000,REVISION_MS=60000,MAX_EDAD_MS=12*3600e3;
 let timer=null,ocupado=false,abierto=false,copias=null,mensaje='',errorForm='';
 const enc=new TextEncoder(),dec=new TextDecoder();
 const leer=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
 const escribir=(k,v)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
 const sesion=()=>leer(SES),estado=()=>leer(EST)||{};
 const setEstado=p=>escribir(EST,{...estado(),...p});
 const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
 const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 async function sha256(txt){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(txt))),b=>b.toString(16).padStart(2,'0')).join('')}
 function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(IDB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
 async function idbOp(mode,fn){const db=await idb();try{return await new Promise((res,rej)=>{const tx=db.transaction(ST,mode),q=fn(tx.objectStore(ST));tx.oncomplete=()=>res(q&&q.result);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})}finally{db.close()}}
 const claveGuardada=()=>idbOp('readonly',s=>s.get('aes')).catch(()=>null);
 const guardarClave=k=>idbOp('readwrite',s=>s.put(k,'aes'));
 const borrarClave=()=>idbOp('readwrite',s=>s.delete('aes')).catch(()=>{});
 async function derivar(pass,userId){
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:enc.encode('mibowling-nube:'+userId),iterations:310000},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 // Compresión gzip antes de cifrar (historiales largos ocupan ~10 veces menos). Sin CompressionStream, se cifra sin comprimir.
 const puedeComprimir=typeof CompressionStream==='function'&&typeof DecompressionStream==='function';
 async function transformar(bytes,Stream){const s=new Blob([bytes]).stream().pipeThrough(new Stream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer())}
 function b64big(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
 async function cifrar(key,txt){let bytes=enc.encode(txt),z=null;if(puedeComprimir){bytes=await transformar(bytes,CompressionStream);z='gzip'}
  const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);
  return {v:1,alg:'AES-GCM-256/PBKDF2-SHA256-310000',...(z?{z}:{}),iv:b64(iv),ct:b64big(new Uint8Array(ct))}}
 async function descifrar(key,c){if(!c||c.v!==1)throw Error('Formato de copia desconocido');let pt=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(c.iv)},key,unb64(c.ct)));
  if(c.z==='gzip'){if(!puedeComprimir)throw Error('Este navegador no puede abrir copias comprimidas; actualiza iOS.');pt=await transformar(pt,DecompressionStream)}else if(c.z)throw Error('Compresión desconocida');return dec.decode(pt)}
 function traducir(e){const m=String(e&&e.message||e||'');if(/invalid login|invalid_credentials|Invalid login/i.test(m))return 'Correo o contraseña incorrectos.';if(/Email not confirmed/i.test(m))return 'Ese correo aún no está confirmado.';if(/Failed to fetch|NetworkError|Load failed/i.test(m))return 'Sin conexión. Se copiará cuando vuelva la red.';if(/OperationError/i.test(m))return 'No se pudo descifrar: la contraseña no coincide con la de esa copia.';return m||'Error desconocido.'}
 async function peticion(ruta,cuerpo,token){
  const r=await fetch(API+ruta,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(cuerpo||{})});
  const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch(e){data=txt}
  if(!r.ok){const err=Error((data&&(data.error_description||data.msg||data.message||data.error))||('HTTP '+r.status));err.status=r.status;throw err}
  return data;
 }
 function guardarSesion(d){escribir(SES,{email:d.user.email,userId:d.user.id,access:d.access_token,refresh:d.refresh_token,exp:Date.now()+((d.expires_in||3600)*1000)})}
 async function token(){
  const s=sesion();if(!s)throw Error('Sesión necesaria');
  if(s.exp-Date.now()>60000)return s.access;
  try{const d=await peticion('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh});guardarSesion(d);return d.access_token}
  catch(e){if(e.status===400||e.status===401){escribir(SES,null);await borrarClave();throw Error('La sesión ha caducado. Vuelve a entrar.')}throw e}
 }
 const rpc=async(fn,args)=>peticion('/rest/v1/rpc/'+fn,args,await token());
 function dispositivo(){const u=navigator.userAgent||'';return /iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Android/.test(u)?'Android':/Macintosh/.test(u)?'Mac':'Navegador'}
 function guard(){const g=window.MiBowlingEscritura;if(!g)throw Error('La app aún no está lista.');return g}

 async function entrar(email,pass){
  const d=await peticion('/auth/v1/token?grant_type=password',{email:String(email).trim(),password:pass});
  const k=await derivar(pass,d.user.id);await guardarClave(k);guardarSesion(d);setEstado({error:''});
 }
 async function desbloquear(pass){const s=sesion();if(!s)throw Error('Sesión necesaria');
  await peticion('/auth/v1/token?grant_type=password',{email:s.email,password:pass}).then(guardarSesion);
  await guardarClave(await derivar(pass,s.userId));
 }
 async function salir(){const s=sesion();try{if(s)await peticion('/auth/v1/logout',{},s.access)}catch(e){}escribir(SES,null);escribir(EST,null);await borrarClave();copias=null;abierto=false}
 async function copiar(forzar){
  if(ocupado)return {omitida:true};const s=sesion();if(!s)return {omitida:true};const key=await claveGuardada();if(!key)return {omitida:true};
  ocupado=true;try{
   const raw=guard().snapshot(),plano=JSON.stringify(raw),huella=await sha256(plano);
   if(!forzar&&estado().huella===huella){return {omitida:true}}
   const cuerpo=JSON.stringify({schema:SCHEMA,appVersion:typeof APP_VERSION==='string'?APP_VERSION:'',exportedAt:new Date().toISOString(),raw});
   const c=await cifrar(key,cuerpo);
   const r=await rpc('mibowling_guardar_copia',{p_version:String(typeof APP_VERSION==='string'?APP_VERSION:'?').slice(0,40),p_dispositivo:dispositivo(),p_huella:huella,p_tamano:plano.length,p_cifrado:c});
   const fila=Array.isArray(r)?r[0]:r;setEstado({huella,ultima:fila&&fila.creada||new Date().toISOString(),error:''});copias=null;return {ok:true,nueva:!!(fila&&fila.nueva)};
  }catch(e){setEstado({error:traducir(e)});throw e}finally{ocupado=false}
 }
 function programar(){if(!sesion())return;clearTimeout(timer);timer=setTimeout(()=>{copiar(false).then(()=>repintarSiAjustes()).catch(()=>repintarSiAjustes())},AUTO_MS)}
 async function listar(){copias=await rpc('mibowling_listar_copias',{});return copias}
 async function restaurar(id){
  const key=await claveGuardada();if(!key)throw Error('Desbloquea primero tus copias con la contraseña.');
  const r=await rpc('mibowling_obtener_copia',{p_id:id});const fila=Array.isArray(r)?r[0]:r;if(!fila)throw Error('Copia no encontrada.');
  const obj=JSON.parse(await descifrar(key,fila.cifrado));
  if(!obj||obj.schema!==SCHEMA||!obj.raw)throw Error('La copia no es de MI BOWLING.');
  if(await sha256(JSON.stringify(obj.raw))!==fila.huella)throw Error('La copia no supera la comprobación de integridad.');
  window.MiBowlingRespaldo.validate(obj.raw);
  try{await copiar(true)}catch(e){throw Error('No se pudo guardar antes una copia del estado actual: '+traducir(e))}
  // Sin journal local: con historiales grandes (varios MB) el journal antes+después supera la cuota de
  // localStorage. La red de seguridad es la copia en la nube del estado actual subida justo arriba.
  const g=guard(),prev=g.snapshot(),claves=Object.keys(obj.raw);
  try{for(const k of claves)if(prev[k]!==obj.raw[k])g.write(k,obj.raw[k])}
  catch(e){let ok=true;try{for(const k of claves)if(localStorage.getItem(k)!==prev[k])g.write(k,prev[k])}catch(r){ok=false}
   throw Error(ok?'No se pudo aplicar la copia (espacio del dispositivo). Tus datos siguen como estaban.':'No se pudo aplicar la copia. Recupera la copia «antes de restaurar» desde esta misma lista.')}
  setEstado({huella:fila.huella});
  location.reload();
 }
 function repintarSiAjustes(){try{if(typeof tab==='string'&&tab==='ajustes'&&typeof window.render==='function')window.render()}catch(e){}}
 const fecha=iso=>{if(!iso)return '—';const d=new Date(iso);return d.toLocaleDateString('es-ES',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})};
 const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 async function accion(nombre,fn){mensaje='';errorForm='';ocupado2=nombre;window.render();try{const r=await fn();mensaje=r||''}catch(e){errorForm=traducir(e)}finally{ocupado2='';window.render()}}
 let ocupado2='',tieneClave=null,correoEscrito='';
 function settingsCard(){
  const s=sesion();claveGuardada().then(k=>{const v=!!k;if(v!==tieneClave){tieneClave=v;repintarSiAjustes()}});
  const msg=(errorForm?`<p class="nube-err" role="alert">${H(errorForm)}</p>`:'')+(mensaje?`<p class="nube-ok" role="status">${H(mensaje)}</p>`:'');
  const head=`<div class="card" id="nube-card"><h2>${typeof uiInl==='function'?uiInl('lock'):''} Copia en la nube</h2>`;
  if(!s)return head+`<p class="hint">Guarda copias cifradas de tus partidas en Supabase y recupéralas en otro iPhone. Se cifran aquí con tu contraseña: en el servidor solo hay texto ilegible y solo tú puedes verlas.</p>
   <form onsubmit="event.preventDefault();MiBowlingNube.ui.entrar(this)"><label class="field" for="nube-email">Correo</label><input class="input" id="nube-email" name="email" type="email" autocomplete="username" required value="${H(correoEscrito)}">
   <label class="field" for="nube-pass">Contraseña</label><input class="input" id="nube-pass" name="pass" type="password" autocomplete="current-password" required>
   <button class="btn primary block mt12" type="submit" ${ocupado2?'disabled':''}>${ocupado2==='entrar'?'Entrando…':'Entrar y activar copias'}</button></form>
   <p class="hint">Usa tu cuenta de las apps (mismo correo y contraseña). Si algún día cambias la contraseña, las copias anteriores ya no se podrán abrir: haz una copia nueva después.</p>${msg}</div>`;
  if(tieneClave===false)return head+`<p class="hint">Sesión de ${H(s.email)}. Escribe tu contraseña para desbloquear las copias en este dispositivo.</p>
   <form onsubmit="event.preventDefault();MiBowlingNube.ui.desbloquear(this)"><input class="input" name="pass" type="password" autocomplete="current-password" required aria-label="Contraseña"><button class="btn primary block mt12" type="submit">Desbloquear</button></form><button class="btn outline mt12" type="button" onclick="MiBowlingNube.ui.salir()">Cerrar sesión</button>${msg}</div>`;
  const e=estado(),lista=abierto&&copias?(copias.length?`<div class="nube-lista">${copias.map((c,i)=>`<div class="list-item"><div><div class="item-title">${fecha(c.creada)}${i===0?' · <span class="pill">última</span>':''}</div><div class="item-subtitle">${H(c.dispositivo||'')} · v${H(c.version_app)} · ${Math.max(1,Math.round(c.tamano/1024))} KB</div></div><button class="btn outline" type="button" onclick="MiBowlingNube.ui.restaurar('${H(c.id)}')">Restaurar</button></div>`).join('')}</div>`:'<p class="hint">Aún no hay copias.</p>'):'';
  return head+`<p class="hint">Sesión: <b>${H(s.email)}</b> · copia automática al guardar partidas.</p>
   <p class="nube-estado">${e.error?`<span class="nube-err">${H(e.error)}</span>`:`Última copia: <b>${fecha(e.ultima)}</b>`}</p>
   <div class="actions mt12"><button class="btn primary" type="button" ${ocupado2?'disabled':''} onclick="MiBowlingNube.ui.copiar()">${ocupado2==='copiar'?'Copiando…':'Copiar ahora'}</button><button class="btn outline" type="button" onclick="MiBowlingNube.ui.verCopias()">${abierto?'Ocultar copias':'Ver copias y restaurar'}</button></div>
   ${lista}${msg}<button class="btn outline mt12" type="button" onclick="MiBowlingNube.ui.salir()">Cerrar sesión</button></div>`;
 }
 const ui={
  entrar:f=>{correoEscrito=f.email.value;accion('entrar',async()=>{await entrar(f.email.value,f.pass.value);tieneClave=true;await copiar(true);return 'Copias activadas. Primera copia guardada.'})},
  desbloquear:f=>accion('desbloquear',async()=>{await desbloquear(f.pass.value);tieneClave=true;return 'Copias desbloqueadas.'}),
  copiar:()=>accion('copiar',async()=>{const r=await copiar(true);return r.nueva===false?'Sin cambios desde la última copia.':'Copia guardada.'}),
  verCopias:()=>accion('lista',async()=>{abierto=!abierto;if(abierto)await listar();return ''}),
  restaurar:id=>{const c=(copias||[]).find(x=>x.id===id);if(!confirm(`¿Restaurar la copia del ${fecha(c&&c.creada)}?\n\nTus datos actuales de este iPhone se sustituirán por los de esa copia. Antes se guardará una copia de lo que tienes ahora.`))return;accion('restaurar',async()=>{await restaurar(id);return 'Restaurando…'})},
  salir:()=>{if(!confirm('¿Cerrar sesión? Tus partidas siguen en el iPhone; solo se dejan de copiar.'))return;accion('salir',async()=>{await salir();return 'Sesión cerrada.'})}
 };
 // Revisión periódica y al volver a la app: copia si hubo cambios
 setInterval(()=>{if(sesion())copiar(false).catch(()=>{})},REVISION_MS);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&timer){clearTimeout(timer);timer=null;copiar(false).catch(()=>{})}});
 window.addEventListener('load',()=>{const e=estado();if(sesion()&&(!e.ultima||Date.now()-new Date(e.ultima).getTime()>MAX_EDAD_MS))programar()});
 window.MiBowlingNube=Object.freeze({settingsCard,programar,ui,_test:{copiar,listar,restaurar,entrar,salir,sesion,estado}});
})();
