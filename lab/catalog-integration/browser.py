"""Exact private candidate JS/HTML without private photographs: fixture-only photo adapter, SW blocked."""
import sys,os,json,hashlib,threading,tempfile,functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
root=Path(os.environ['RUNNER_TEMP'])/'catalog-integration-browser';rel=root/'releases/catalog100-integracion-cp001';engine=sys.argv[1]
assert hashlib.sha256((rel/'app.js').read_bytes()).hexdigest()==os.environ['EXPECTED_APP']
for name in ['photo-sources.js','reviewed-arsenal-assets.js','arsenal-photo-integration-lab.js']:(rel/name).write_text('/* TEST ONLY: private photos and registries excluded. */\n')
(rel/'catalog100-photos-lab.js').write_text("""/* TEST ONLY. This is a geometric SVG, not a product image. */
window.MiBowlingCatalog100Photos={get:x=>x?.id==='ref-5d3b45997852'?{synthetic:true}:null,markup:x=>'<div class="catalog100-photo-wrap"><img width="100" height="100" alt="Imagen sintética TEST" src="./synthetic-test-only.svg"></div>',sourceHTML:()=>'<p>Imagen sintética de prueba</p>'};
""")
(root/'synthetic-test-only.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="gray"/><text x="5" y="55" fill="white">TEST</text></svg>')
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}/'
fixture={'version':2,'hand':'zurdo','balls':[{'id':'lab-existing','brand':'Storm','model':'The Code Black','weight':'15 lb','notes':'Unidad ficticia','photo':'','retired':False}],'patterns':[{'id':'lab-pattern','name':'Ficticio','pdfName':'ficticio.pdf'}],'sessions':[{'id':'lab-session','type':'entrenamiento','date':'2026-01-01','title':'Jornada ficticia','patternId':'lab-pattern','games':[{'id':'lab-game','includeStats':True,'rolls':[{'frame':min(i+1,10),'ball':1 if i<10 else i-8,'pins':list(range(1,11)),'ballId':'lab-existing'} for i in range(12)]}]}]}
def log(tag,detail=None):print('CATALOG_INTEGRATION',engine,tag,json.dumps(detail,ensure_ascii=False),flush=True)
def snapshot(p):return p.evaluate("()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('mi-bowling-')).sort().map(k=>[k,localStorage.getItem(k)]))")
with sync_playwright() as pw,tempfile.TemporaryDirectory() as profile:
 c=getattr(pw,engine).launch_persistent_context(profile,headless=True,service_workers='block',viewport={'width':390,'height':844});p=c.pages[0];p.set_default_timeout(15000);dialogs=[];errors=[];p.on('dialog',lambda d:(dialogs.append(d.message),d.accept()));p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  p.goto(origin,wait_until='load');p.evaluate("""async d=>{localStorage.setItem(KEY,JSON.stringify(migrate(d)));localStorage.setItem(BALL_SELECTION_KEY,JSON.stringify({__next__:['lab-existing'],'lab-session':['lab-existing']}));await oilPut('lab-pattern',new Blob(['%PDF-1.4\\n% synthetic fixture\\n%%EOF'],{type:'application/pdf'}));}""",fixture)
  p.reload(wait_until='load');assert p.evaluate('APP_VERSION')=='3.3.12-catalogo-LAB-cp001'
  before=snapshot(p);pdf=p.evaluate("async()=>await (await oilGet('lab-pattern')).text()");assert p.evaluate("aggregate('entrenamiento').totals[0]")==300
  p.evaluate("go('bolas')");p.locator('button').filter(has_text='Catálogo 100').first.click()
  expect(p.locator('#arsenal-catalog-count')).to_have_text('100 de 100 modelos');assert p.locator('.arsenal-model[data-search]').count()==100;assert p.locator('.catalog100-tech').count()==10
  assert p.locator('.arsenal-model[data-photo=yes]').count()==1
  p.locator('#arsenal-photo-filter').check();expect(p.locator('#arsenal-catalog-count')).to_have_text('1 de 100 modelos');p.locator('#arsenal-photo-filter').uncheck()
  p.locator('#arsenal-catalog-search').fill('Purple Rhino Pro (2026)');expect(p.locator('#arsenal-catalog-count')).to_have_text('1 de 100 modelos')
  card=p.locator('.arsenal-model:visible');card.locator('summary').click();expect(card).to_contain_text('2.568 (15 lb)')
  assert snapshot(p)==before;log('READ_ONLY_CATALOG_100_AND_TECH_PASS')
  for width in (320,390,768,1280):
   p.set_viewport_size({'width':width,'height':844});p.locator('#arsenal-catalog-search').fill('');assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1');p.locator('#arsenal-catalog-search').fill('Purple Rhino Pro (2026)');p.screenshot(path=str(root/f'catalog-{engine}-{width}.png'),full_page=False);log('RESPONSIVE',width)
  p.set_viewport_size({'width':390,'height':844});card=p.locator('.arsenal-model:visible');card.get_by_role('button',name='Añadir a Mis bolas').click()
  expect(p.locator('.arsenal-model:visible')).to_contain_text('Coincidencia de nombre');after=snapshot(p);data=json.loads(after['mi-bowling-analitica-v2']);original=json.loads(before['mi-bowling-analitica-v2']);assert data['sessions']==original['sessions'] and data['patterns']==original['patterns'] and data['balls'][0]==original['balls'][0] and len(data['balls'])==2
  new=data['balls'][1];assert new['model']=='Purple Rhino Pro (2026)' and new['photo']==new['weight']==new['notes']==new['kind']=='';assert all(after[k]==v for k,v in before.items() if k!='mi-bowling-analitica-v2');log('ADD_PRESERVES_ORIGINALS')
  p.locator('#arsenal-catalog-search').fill('The Code Black');expect(p.locator('.arsenal-model:visible')).to_contain_text('Coincidencia de nombre');p.locator('.arsenal-model:visible').get_by_role('button',name='Revisar variante / alta manual').click();expect(p.locator('#app')).to_contain_text('Nueva bola');assert snapshot(p)==after;log('VARIANT_MANUAL_NO_WRITE')
  p.evaluate("openBallPickerFor('lab-session','inicio')");p.locator('.ball-card').filter(has_text='Purple Rhino Pro (2026)').locator('input[type=checkbox]').check();picked=json.loads(p.evaluate("localStorage.getItem(BALL_SELECTION_KEY)"));assert picked['__next__']==['lab-existing'] and picked['lab-session']==['lab-existing',new['id']];assert p.evaluate("aggregate('entrenamiento').totals[0]")==300
  assert p.evaluate("async()=>await (await oilGet('lab-pattern')).text()")==pdf;final=snapshot(p);p.reload(wait_until='load');assert snapshot(p)==final;assert p.evaluate("db.balls.length")==2 and p.evaluate("score(db.sessions[0].games[0])")==300;assert p.evaluate("async()=>await (await oilGet('lab-pattern')).text()")==pdf;assert not errors,errors
  log('SELECTION_HISTORY_PDF_RELOAD_PASS');log('PASS')
 finally:c.close();server.shutdown()
