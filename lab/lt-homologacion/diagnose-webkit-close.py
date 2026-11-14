"""Targeted diagnosis, no change to CP005. Synthetic PDF only; bounded real APIs."""
import base64, hashlib, json, os, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(os.environ['LAB'])
origin='http://127.0.0.1:8767/'
pdf=(root/'evidence/cp004/patron-ficticio.pdf').read_bytes()
key='mi-bowling-analitica-v2'
lock='mi-bowling-lt-cp003-origin-writer'
def log(stage, value=None):
    print('DIAG',stage,json.dumps(value,ensure_ascii=False,default=str) if value is not None else '',flush=True)
def step(label,fn):
    log(label+'-BEGIN')
    try:
        v=fn();log(label+'-END',v);return v
    except Exception as e:
        log(label+'-ERROR',str(e));raise
def gate(page,limit=12):
    end=time.monotonic()+limit
    while time.monotonic()<end:
        v=page.evaluate("""()=>({url:location.href,state:document.readyState,secure:isSecureContext,host:!!window.MiBowlingLTHost,shell:document.querySelector('#lt-app-shell')?.hidden,status:document.querySelector('#lt-gate-status')?.textContent,locks:!!navigator.locks})""")
        if v['host'] and v['shell'] is False: return v
        if v.get('status') and ('Otra ventana' in v['status'] or 'bloqueado' in v['status'].lower() or 'no verificable' in v['status']):return v
        time.sleep(.15)
    return v
def locks(page):
    return page.evaluate("""()=>Promise.race([navigator.locks.query(),new Promise(r=>setTimeout(()=>r({timeout:true}),4000))])""")
def safe_eval(page,body,arg=None):
    # Promise.race bounds app promises; external process timeout bounds a hung engine.
    return page.evaluate("""async ({body,args})=>{throw Error('unused')}""") if False else page.evaluate(body,arg)
def wire(page):
    page.on('pageerror',lambda e:log('PAGE_ERROR',str(e)))
    page.on('console',lambda m:log('CONSOLE',m.text[:300]) if m.type=='error' else None)
    page.on('requestfailed',lambda r:log('REQUEST_FAILED',{'url':r.url,'failure':r.failure}))
    page.set_default_timeout(12000)
    page.set_default_navigation_timeout(12000)
    return page

with sync_playwright() as pw, tempfile.TemporaryDirectory(prefix='lt-wk-diag-') as profile:
    ctx=pw.webkit.launch_persistent_context(profile,headless=True,accept_downloads=True,viewport={'width':390,'height':844},service_workers='allow')
    try:
        # Use the original page, not a second app window. Keep neutral tab for close/reopen.
        page=wire(ctx.pages[0]);standby=wire(ctx.new_page())
        log('UA',page.evaluate('navigator.userAgent'))
        step('NAV_INITIAL',lambda:page.goto(origin,wait_until='commit').status)
        first=step('GATE_INITIAL',lambda:gate(page))
        step('LOCK_INITIAL',lambda:locks(page))
        if not first['host'] or first['shell']:raise AssertionError('initial gate did not open')
        before=step('SEED_FILE',lambda:page.evaluate("""async b64=>{try{
            const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
            const d={version:2,hand:'zurdo',balls:[],patterns:[{id:'LAB-DIAG-PDF',name:'Patrón ficticio',pdfName:'ficticio.pdf'}],sessions:[]};
            await Promise.race([oilPut('LAB-DIAG-PDF',new File([bytes],'ficticio.pdf',{type:'application/pdf'})),new Promise((_,j)=>setTimeout(()=>j(Error('oilPut deadline')),6000))]);
            localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(d));
            const got=await Promise.race([oilGet('LAB-DIAG-PDF'),new Promise((_,j)=>setTimeout(()=>j(Error('oilGet deadline')),6000))]);
            return {ok:true,size:got.size,sha:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await got.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('')};
        }catch(e){return {ok:false,name:e?.name,message:String(e?.message||e)}}}""",base64.b64encode(pdf).decode()))
        assert before['ok'] and before['sha']==hashlib.sha256(pdf).hexdigest(),before
        log('PASS_FILE_IDB_BYTES')
        step('LOCK_BEFORE_RELOAD',lambda:locks(page))
        # Close prior document explicitly; preserve same real origin storage.
        step('CLOSE_DOC',lambda:page.close())
        step('REOPEN_COMMIT',lambda:standby.goto(origin,wait_until='commit').status)
        reopened=step('GATE_REOPEN',lambda:gate(standby))
        step('LOCK_REOPEN',lambda:locks(standby))
        if reopened['host'] and reopened['shell'] is False:
            assert standby.evaluate("(k)=>JSON.parse(localStorage.getItem(k))?.hand",key)=='zurdo'
            got=step('PDF_REOPEN',lambda:standby.evaluate("""async()=>{const f=await oilGet('LAB-DIAG-PDF');return f&&Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('')}"""))
            assert got==hashlib.sha256(pdf).hexdigest()
            log('PASS_CLOSE_REOPEN_AND_PDF')
        else:log('FAIL_CLOSE_REOPEN_GATE',reopened)
        assert reopened['host'] and reopened['shell'] is False, 'close/reopen gate failed; see DIAG'
    finally:
        log('CLOSE_CONTEXT_BEGIN');ctx.close();log('CLOSE_CONTEXT_END')
