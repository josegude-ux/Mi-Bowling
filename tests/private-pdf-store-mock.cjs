/* MI BOWLING · LAB A6 · owner-scoped private binary storage double.
 * Every call applies UUID authorization, including reads, uploads, deletion.
 * Does NOT upload anything or create a Supabase Storage bucket. */
'use strict';
const clone=b=>new Uint8Array(b);
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));
function createStore(initialState){
 const records=new Map();
 let onWrite=null,onRead=null,onRemove=null;
 let current=initialState||{};
 function authorize(owner,path){
  if(!uuid(owner)||current.id!==owner||current.role!=='authenticated'||
    current.is_anonymous||current.confirmed===false||current.active===false)
   throw Error('RLS Storage denegado: UUID no autorizado');
  if(typeof path!=='string'||!path.startsWith(owner+'/patterns/')||
    !new RegExp('^'+owner+'/patterns/[0-9a-f]{64}\\.pdf$').test(path))
   throw Error('Ruta privada inválida');
 }
 return {
  change(id){current=id},
  async read(owner,path){
   authorize(owner,path);
   if(onRead)await onRead(owner,path);
   const bytes=records.get(path);
   return bytes?clone(bytes):null;
  },
  async putNew(owner,path,bytes){
   authorize(owner,path);
   if(onWrite)await onWrite(owner,path);
   if(records.has(path))return false; // cannot overwrite a different PDF, ever
   records.set(path,clone(bytes));
   return true;
  },
  async remove(owner,path){
   authorize(owner,path);
   if(onRemove)await onRemove(owner,path);
   records.delete(path);
  },
  beforeWrite(callback){onWrite=callback},
  beforeRead(callback){onRead=callback},
  beforeRemove(callback){onRemove=callback},
  seed(owner,path,bytes){ // test-only fixture
   if(!uuid(owner)||!path.startsWith(owner+'/patterns/'))throw Error('Bad seed');
   records.set(path,clone(bytes));
  },
  snapshot(){
   return [...records.entries()].sort(([a],[b])=>a.localeCompare(b)).
    map(([path,data])=>({path,bytes:[...data]}));
  }
 };
}
module.exports={createStore};
