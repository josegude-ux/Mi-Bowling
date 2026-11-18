/* MI BOWLING · LAB A8 · Policy-side Storage double, no project or network.
 * Model: private bucket, auth.uid() equals leading object path segment,
 * authenticated, non-anonymous. Email confirmation is checked by facade,
 * not by the RLS policy alone. No signed/public URLs.
 */
'use strict';
const BUCKET='bowling-private-patterns-lab';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function createServer(){
 const objects=new Map(),audit=[],quota=new Map();
 let failure=null,pause=null;
 const copy=b=>new Uint8Array(b);
 const key=(bucket,path)=>bucket+':'+path;
 const permitted=(subject,bucket,path)=>{
  return subject?.role==='authenticated'&&!subject.is_anonymous&&subject.active!==false&&
   UUID.test(subject.id||'')&&bucket===BUCKET&&
   typeof path==='string'&&new RegExp('^'+subject.id+'/patterns/[0-9a-f]{64}\\.pdf$').test(path);
 };
 const problem=(code,message)=>({data:null,error:{statusCode:String(code),message}});
 function snapshot(){
  return [...objects.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([id,entry])=>({
   id,owner:entry.owner,bytes:[...entry.bytes],contentType:entry.contentType
  }));
 }
 function client(first){
  let subject={...first};
  const storage={
   from(bucket){
    return {
     async upload(path,bytes,options={}){
      audit.push({op:'upload',id:subject.id,bucket,path});
      if(pause){const p=pause;pause=null;await p}
      if(!permitted(subject,bucket,path))return problem(403,'RLS ownership denied');
      if(options.upsert!==false||options.contentType!=='application/pdf')
       return problem(400,'Immutable PDF, no upsert');
      if(!(bytes instanceof Uint8Array))return problem(400,'Invalid binary input');
      if(failure==='quota'){failure=null;return problem(413,'QuotaExceededError')}
      const existing=objects.get(key(bucket,path));
      if(existing)return problem(409,'already exists');
      const used=[...objects.values()].filter(x=>x.owner===subject.id)
       .reduce((sum,x)=>sum+x.bytes.length,0);
      if(used+bytes.length>(quota.get(subject.id)??Infinity))
       return problem(413,'QuotaExceededError');
      objects.set(key(bucket,path),{owner:subject.id,bytes:copy(bytes),contentType:options.contentType});
      return {data:{path},error:null};
     },
     async download(path){
      audit.push({op:'download',id:subject.id,bucket,path});
      if(pause){const p=pause;pause=null;await p}
      if(!permitted(subject,bucket,path))return problem(403,'RLS ownership denied');
      const entry=objects.get(key(bucket,path));
      if(!entry)return problem(404,'not found');
      return {data:copy(entry.bytes),error:null};
     },
     async remove(paths){
      audit.push({op:'remove',id:subject.id,bucket,paths:[...paths]});
      if(!Array.isArray(paths)||paths.length!==1||
         !permitted(subject,bucket,paths[0]))return problem(403,'RLS ownership denied');
      objects.delete(key(bucket,paths[0]));
      return {data:[{name:paths[0]}],error:null};
     }
    };
   }
  };
  return {
   auth:{
    async getUser(){
     if(!subject?.id||subject.active===false||subject.role!=='authenticated')
      return{data:{user:null},error:{message:'Session expired'}};
     return {data:{user:{id:subject.id,email:'fixture@example.test',
      email_confirmed_at:subject.confirmed===false?null:'2026-11-08T18:00:00Z',
      is_anonymous:!!subject.is_anonymous}},error:null};
    }
   },
   storage,
   change(next){subject={...next}},
   getPrincipal:()=>({...subject})
  };
 }
 return {
  client,BUCKET,audit,snapshot,
  setQuota(owner,bytes){quota.set(owner,bytes)},
  failNextQuota(){failure='quota'},
  pauseNext(promise){pause=promise},
  seed(owner,path,bytes,contentType='application/pdf'){
   objects.set(key(BUCKET,path),{owner,bytes:copy(bytes),contentType});
  }
 };
}
module.exports={createServer,BUCKET};
