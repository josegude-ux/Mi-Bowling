"""Real browser homologation of exact CP001, synthetic fixtures only."""
import argparse,json,tempfile,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('engine',choices=['chromium','webkit']);p.add_argument('scenario',choices=['classification','whole','league','quota-primary','quota-selection']);a=p.parse_args()
origin='http://127.0.0.1:8774/'
KEY='mi-bowling-analitica-v2';SEL='mi-bowling-ball-selection-v1';LIGA='mi-bowling-liga-acta-v32'
def log(tag,value=None):print('TIPO_REAL',a.engine,a.scenario,tag,json.dumps(value,ensure_ascii=False,default=str),flush=True)
note='Tipo de jornada no confirmado en la copia de origen. Se muestra provisionalmente en Entrenamientos por compatibilidad y no se incluye en las estadísticas de entrenamiento hasta que se confirme su clasificación.'
def roll(f,b,pins):
 return dict(frame=f,ball=b,pins=pins,ballId='LAB-B',line=dict(approach='20',arrow='12',breakpoint='7'),lane=7,pair=[7,8],foul=False,createdAt=None)
def strike(id,complete=True,inc=False):
 return dict(id=id,includeStats=inc,pair=[7,8],startLane=7,segments=[],rolls=[roll(min(i+1,10),1 if i<10 else i-8,list(range(1,11))) for i in range(12 if complete else 2)])
def session(id,title,date,games,**kw):
 return dict(id=id,type='entrenamiento',date=date,title=title,venue='Bolera ficticia',notes='',patternId='LAB-P',games=games,**kw)
def fixture():
 s=session('LAB-S','Evento ficticio [Tipo pendiente]','2026-01-01',[strike('LAB-G1'),strike('LAB-G2'),strike('LAB-G3',False)])
 s['notes']='Origen ficticio\n'+note
 return dict(version=2,hand='zurdo',balls=[dict(id='LAB-B',brand='Ficticia',model='Bola de prueba')],patterns=[dict(id='LAB-P',name='Patrón ficticio')],sessions=[s,session('LAB-T','Entrenamiento','2026-01-02',[strike('LAB-G4',True,True)])])
def read(pg,k):return pg.evaluate('k=>localStorage.getItem(k)',k)
def snap(pg):return pg.evaluate('()=>({db:JSON.parse(localStorage.getItem("mi-bowling-analitica-v2")),sel:JSON.parse(localStorage.getItem("mi-bowling-ball-selection-v1")||"{}"),league:localStorage.getItem("mi-bowling-liga-acta-v32")})')
def flatten(db):
 return sorted([(g['id'],g['rolls'],g['pair'],g['startLane'],g['segments']) for s in db['sessions'] for g in s['games']],key=lambda x:x[0])
def invariant(before,after):
 assert flatten(before['db'])==flatten(after['db'])
 for k in ('hand','balls','patterns'):assert before['db'][k]==after['db'][k],k
 assert before['league']==after['league']
def gate(pg):
 expect(pg.locator('#app')).to_be_visible(timeout=15000)
 pg.wait_for_function("()=>typeof classificationPlan==='function' && typeof liga32!=='undefined'",timeout=15000)
def counts(pg):return pg.evaluate("()=>({training:aggregate('entrenamiento').totals,official:aggregate('oficial').totals,pending:db.sessions.filter(pendingClassification).flatMap(s=>s.games).length})")
def openhist(pg,mode):
 pg.get_by_role('button',name='Partidas',exact=True).click()
 pg.locator('#app .seg').get_by_role('button',name={'pendiente':'Pendientes','entrenamiento':'Entrenamientos','oficial':'Competiciones'}[mode]).click()
def expand(pg,date):pg.locator('.v25-day-head').filter(has_text=date).click()
def change(pg,sid,gid,typ,accept=True):
 sel=f'button[data-session="{sid}"][data-game="{gid}"][data-type="{typ}"]'
 opt=pg.locator(sel)
 opt.locator('xpath=../..').locator('xpath=preceding-sibling::button[1]').click()
 dialogs=[]
 def handle(d):
  dialogs.append(d.message);d.accept() if d.type!='confirm' or accept else d.dismiss()
 pg.on('dialog',handle)
 try:opt.click()
 finally:pg.remove_listener('dialog',handle)
 log('DIALOGS',dialogs)
 assert dialogs and '¿Cambiar' in dialogs[0],dialogs
 return dialogs
def setfixture(pg,linked=False):
 pg.goto(origin,wait_until='load');gate(pg)
 data=fixture()
 pg.evaluate('''d=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(migrate(d)));localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({'LAB-S':['LAB-B'],__next__:[]}));if(d.linked){liga32.matches[0].players[0].links={0:{sessionId:'LAB-S',gameId:'LAB-G1'}};liga32Save()}}''',{**data,'linked':linked})
 pg.reload(wait_until='load');gate(pg)
def context(engine,profile):
 return engine.launch_persistent_context(profile,headless=True,accept_downloads=True,viewport={'width':390,'height':844},service_workers='block')
with sync_playwright() as pw,tempfile.TemporaryDirectory(prefix='tipo-real-') as profile:
 engine=getattr(pw,a.engine);ctx=context(engine,profile);pg=ctx.pages[0];pg.set_default_timeout(15000)
 try:
  setfixture(pg,a.scenario=='league');before=snap(pg);assert counts(pg)==dict(training=[300],official=[],pending=3)
  log('ENGINE',pg.evaluate('navigator.userAgent'))
  openhist(pg,'pendiente');expand(pg,'2026-01-01')
  assert pg.locator('.v25-day-game').count()==3
  if a.scenario=='classification':
   change(pg,'LAB-S','LAB-G1','oficial',False);assert snap(pg)==before
   change(pg,'LAB-S','LAB-G1','oficial');after=snap(pg);invariant(before,after)
   new=next(s for s in after['db']['sessions'] if s['type']=='oficial');assert new['id']!='LAB-S' and [g['id'] for g in new['games']]==['LAB-G1'];assert after['sel'][new['id']]==after['sel']['LAB-S']==['LAB-B'];assert counts(pg)==dict(training=[300],official=[300],pending=2)
   change(pg,'LAB-S','LAB-G2','entrenamiento');after=snap(pg);invariant(before,after);assert counts(pg)==dict(training=[300,300],official=[300],pending=1)
   pg.reload(wait_until='load');gate(pg);assert snap(pg)==after
   openhist(pg,'oficial');expand(pg,'2026-01-01');assert pg.locator('.v25-day-game').count()==1
   change(pg,new['id'],'LAB-G1','entrenamiento');after=snap(pg);invariant(before,after);assert counts(pg)==dict(training=[300,300,300],official=[],pending=1)
   pg.evaluate("go('ajustes')")
   with pg.expect_download() as dl:pg.get_by_role('button',name='↓ Exportar copia',exact=True).click()
   exported=json.loads(Path(dl.value.path()).read_text());assert exported['sessions']==after['db']['sessions'];assert exported['balls']==after['db']['balls'];assert exported['patterns']==after['db']['patterns'];log('EXPORT_PASS')
  elif a.scenario=='whole':
   change(pg,'LAB-S','','oficial');after=snap(pg);invariant(before,after);assert after['db']['sessions'][0]['id']=='LAB-S' and len(after['db']['sessions'][0]['games'])==3;assert counts(pg)==dict(training=[300],official=[300,300],pending=0);assert after['sel']==before['sel']
   pg.get_by_role('button',name='Informe',exact=True).click();assert pg.get_by_role('button',name='Cambiar tipo',exact=True).count()==3
   change(pg,'LAB-S','','entrenamiento');after=snap(pg);invariant(before,after);assert counts(pg)==dict(training=[300,300,300],official=[],pending=0)
  elif a.scenario=='league':
   assert pg.get_by_text('Tipo protegido: partida vinculada a Liga.',exact=True).count()==4
   assert pg.locator('button[data-session="LAB-S"]').count()==0
   messages=[];pg.on('dialog',lambda d:(messages.append(d.message),d.accept()))
   pg.evaluate("applyClassification('LAB-S','LAB-G2','oficial')")
   assert messages and 'Liga' in messages[0];assert snap(pg)==before;after=before
  else:
   # Fill actual browser localStorage, outside the app namespace; no monkeypatch.
   cap=8*1024*1024
   result=pg.evaluate('''cap=>{const k='lab-tipo-quota';let lo=0,hi=cap;const write=n=>{try{localStorage.setItem(k,'x'.repeat(n));return true}catch(e){if(e.name!=='QuotaExceededError')throw e;return false}};if(write(hi)){localStorage.removeItem(k);return {reached:false}};while(hi-lo>1){let m=Math.floor((lo+hi)/2);if(write(m))lo=m;else hi=m}if(!write(lo))throw Error('quota changed');return {reached:true,bytes:lo,failedNext:!write(lo+1)}}''',cap)
   log('QUOTA_LIMIT',result)
   if not result['reached'] or not result['failedNext']:raise AssertionError('PENDING actual quota not reached')
   messages=change(pg,'LAB-S','' if a.scenario=='quota-primary' else 'LAB-G1','oficial')
   observed=snap(pg);log('QUOTA_IMMEDIATE',{'warned':any('No se pudo confirmar' in x for x in messages),'old':observed==before,'counts':counts(pg)})
   pg.evaluate("localStorage.removeItem('lab-tipo-quota')")
   # Read current storage before navigation, after reload, and after closing the entire context.
   after=snap(pg);invariant(before,after)
   pg.reload(wait_until='load');gate(pg);reloaded=snap(pg);invariant(before,reloaded)
   log('QUOTA_RELOAD',{'old':reloaded==before,'sameImmediate':reloaded==after,'counts':counts(pg)})
   assert any('No se pudo confirmar' in x for x in messages),messages
   assert reloaded==before,'Unexpected durable mutation after rejected write'
   after=reloaded
  log('BEFORE_CONTEXT_CLOSE',counts(pg));pg.reload(wait_until='load');gate(pg);assert snap(pg)==after
 finally:ctx.close()
 ctx=context(engine,profile);pg=ctx.pages[0]
 try:
  pg.goto(origin,wait_until='load');gate(pg);reopened=snap(pg);assert reopened==after,'Durability mismatch after whole context restart';invariant(before,reopened);log('PERSISTENT_PROFILE_REOPEN_PASS',counts(pg))
 finally:ctx.close()
 log('PASS')
