/* MI BOWLING · A5 · Strict, in-memory PostgREST/RLS double, NOT PostgreSQL.
 * Enforces auth.uid() owner, authenticated non-anonymous, USING + WITH CHECK.
 * Does not use network, credentials or any Supabase project. */
'use strict';
const clone=v=>structuredClone(v);
const VALID=['personal','league'];
const uuid=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||''));
function createServer(){
 const rows=new Map(),audit=[];
 const key=(id,kind)=>id+':'+kind;
 let nextDelay=null;
 function seed(owner,doc_type,payload,revision=0){
  if(!uuid(owner)||!VALID.includes(doc_type))throw Error('Invalid seed');
  rows.set(key(owner,doc_type),clone({user_id:owner,doc_type,payload,revision}));
 }
 function snapshot(){return [...rows.values()].map(clone).sort((a,b)=>a.user_id.localeCompare(b.user_id)||a.doc_type.localeCompare(b.doc_type))}
 function client(initial){
  let principal=clone(initial||{});
  const state=()=>clone(principal);
  const allowed=()=>principal.role==='authenticated'&&!principal.is_anonymous&&!!principal.id&&principal.active!==false;
  function canAccess(row){return allowed()&&row?.user_id===principal.id}
  async function execute(operation,filters,values){
   if(nextDelay&&operation==='select'){
    const pending=nextDelay;nextDelay=null;
    await pending;
   }
   audit.push({operation,principal:principal.id||null,role:principal.role||null,anonymous:!!principal.is_anonymous,filters:clone(filters)});
   const matches=row=>Object.entries(filters).every(([field,value])=>row[field]===value);
   if(operation==='select'){
    if(!allowed())return {data:[],error:null};
    return{data:[...rows.values()].filter(r=>canAccess(r)&&matches(r)).map(clone),error:null};
   }
   if(!allowed())return {data:null,error:{message:'Forbidden by RLS'}};
   if(operation==='insert'){
    const row=values;
    if(!canAccess(row)||!VALID.includes(row.doc_type)||!Number.isSafeInteger(row.revision)||row.revision<0)
     return {data:null,error:{message:'WITH CHECK violation'}};
    if(rows.has(key(row.user_id,row.doc_type)))return{data:null,error:{message:'Unique conflict'}};
    rows.set(key(row.user_id,row.doc_type),clone(row));
    return{data:null,error:null};
   }
   if(operation==='update'){
    const selection=[...rows.values()].filter(r=>canAccess(r)&&matches(r));
    if(selection.length!==1)return {data:[],error:null};
    const old=selection[0],updated={...old,...clone(values)};
    if(!canAccess(updated)||updated.user_id!==old.user_id||updated.doc_type!==old.doc_type)
     return{data:null,error:{message:'WITH CHECK violation'}};
    rows.set(key(updated.user_id,updated.doc_type),clone(updated));
    return {data:[{revision:updated.revision}],error:null};
   }
   return{data:null,error:{message:'Operation denied'}};
  }
  function builder(operation,values={}){
   const filters={};
   const q={
    eq(field,value){filters[field]=value;return q},
    select(fields){
     if(operation==='update')return execute('update',filters,values);
     throw Error('select only allowed as initial operation or update returning');
    },
    then(resolve,reject){return execute(operation,filters,values).then(resolve,reject)}
   };
   return q;
  }
  const clientObj={
   auth:{
    async getUser(){
     if(!principal.id||principal.role!=='authenticated'||principal.active===false)
      return {data:{user:null},error:{message:'Session expired'}};
     return{data:{user:{id:principal.id,email:principal.email||'fixture@example.test',
       email_confirmed_at:principal.confirmed===false?null:'2026-11-08T12:00:00Z',
       is_anonymous:!!principal.is_anonymous}},error:null};
    }
   },
   from(table){
    if(table!=='bowling_player_documents')throw Error('Wrong table');
    return{
     select(fields){
      if(fields!=='user_id,doc_type,payload,revision')throw Error('Unexpected private SELECT fields');
      return builder('select');
     },
     insert(row){return execute('insert',{},row)},
     update(value){return builder('update',value)},
     delete(){return{eq(){return Promise.resolve({data:null,error:{message:'DELETE forbidden'}})}}}
    };
   },
   change(next){principal=clone(next)},
   state,serverSnapshot:snapshot,
   pauseNextSelect(promise){nextDelay=promise}
  };
  return clientObj;
 }
 return Object.freeze({seed,snapshot,client,audit});
}
module.exports={createServer};
