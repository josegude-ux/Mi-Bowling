/* MI BOWLING · repositorio privado LAB A1.
 * La BD debe aplicar RLS: el filtro cliente no sustituye a las políticas SQL.
 * Solo acepta un usuario validado mediante auth.getUser() (petición a servidor).
 * No usa localStorage ni IndexedDB, ni descarga registros antiguos. */
(function(root){
'use strict';
const TABLE='bowling_player_documents';
const DOCS=['personal','league'];
const empty=kind=>kind==='personal'?{version:2,hand:'diestro',sessions:[],balls:[],patterns:[]}:
 {version:1,matches:[],rosters:{own:[]}};
function checkOwner(id){return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);}
function create(client){
 if(!client?.auth?.getUser || !client?.from)throw Error('Repositorio privado sin servicio verificable');
 async function identity(owner){
  if(!checkOwner(owner))throw Error('Identificador de propietario no válido');
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id||data.user.id!==owner||!data.user.email_confirmed_at||data.user.is_anonymous)
   throw Error('Acceso denegado: propietario no verificado por servidor');
 }
 async function load(owner){
  await identity(owner);
  const {data,error}=await client.from(TABLE).select('doc_type,payload,revision')
   .eq('user_id',owner);
  if(error)throw Error('No se puede consultar el almacén privado');
  if(!Array.isArray(data))throw Error('Respuesta de almacén inválida');
  const docs={};
  for(const kind of DOCS){
   const rows=data.filter(x=>x.doc_type===kind);
   if(rows.length>1)throw Error('Datos duplicados en servidor');
   const row=rows[0];
   if(row && (!Number.isSafeInteger(row.revision)||row.revision<0||!row.payload||
      typeof row.payload!=='object'||Array.isArray(row.payload)))
     throw Error('Documento remoto no válido');
   docs[kind]=row?{payload:row.payload,revision:row.revision,exists:true}:
     {payload:empty(kind),revision:null,exists:false};
  }
  return Object.freeze({owner,personal:docs.personal,league:docs.league});
 }
 async function write(owner,kind,payload,expectedRevision){
  await identity(owner);
  if(!DOCS.includes(kind))throw Error('Tipo de documento no permitido');
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Documento no válido');
  if(expectedRevision===null){
   const {error}=await client.from(TABLE).insert({user_id:owner,doc_type:kind,payload,revision:0});
   if(error)throw Error('No se pudo crear el documento; vuelve a cargar antes de reintentar');
   return 0;
  }
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Revisión inválida');
  const {data,error}=await client.from(TABLE).update({
    payload,revision:expectedRevision+1
   }).eq('user_id',owner).eq('doc_type',kind).eq('revision',expectedRevision)
     .select('revision');
  if(error||!Array.isArray(data)||data.length!==1)
   throw Error('Conflicto de versiones o autorización. No se han sobrescrito cambios: recarga la cuenta.');
  return data[0].revision;
 }
 return Object.freeze({load,write});
}
root.MiBowlingPrivateRepository=Object.freeze({create,table:TABLE});
})(typeof window!=='undefined'?window:globalThis);
