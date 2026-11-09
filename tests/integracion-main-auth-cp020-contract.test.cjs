/* MI BOWLING · LAB I2 · Immutable-main integration contract.
 * SHA1 here is Git blob identity, NOT a password hash or file-security claim.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p));
const expected={
 'index.html':'b9f9cece896e3e568dcca606f16fa087eb9775ec',
 'app.js':'8787aeba7ef9eb5dee23af4daabf5b35d2c766c2',
 'styles.css':'f29d9fe51820a47320a8e4af14d94bfa5445dfe2',
 'sw.js':'f9b84e4ef56b5b8af044334e684e4cc4bd886537',
 'official-calendar-2026-2027.js':'4e6def9030da5b813d13ad6c76b5cf043cc841f1',
 'data/calendario-fgb-2026-2027.json':'f5e517958707dc9061ea6cf73b7011913d6e0ab9'
};
const blobSHA=buf=>crypto.createHash('sha1').update(Buffer.from('blob '+buf.length+'\0')).update(buf).digest('hex');
for(const [p,sha] of Object.entries(expected))
 assert.equal(blobSHA(read(p)),sha,'Published main CP-020 asset must be bit-identical: '+p);
const official=JSON.parse(read('data/calendario-fgb-2026-2027.json'));
assert.equal(official.events.length,31);
assert.equal(official.events.filter(x=>x.category==='gallego').length,10);
assert.equal(official.events.filter(x=>x.category==='nacional').length,21);
const html=read('lab/integracion-main-auth-cp020.html').toString('utf8');
const guard=read('lab/integracion-main-auth-cp020-guard.js').toString('utf8');
const bridge=read('lab/integracion-main-auth-cp020.js').toString('utf8');
assert.ok(html.includes('official-calendar-2026-2027.js?v=338fgb1'));
assert.ok(html.includes('styles.css?v=338fgb1'));
assert.ok(html.includes('lab/integracion-main-auth-cp020-guard.js'));
assert.ok(!html.includes('<script src="app.js'),'Main application must load AFTER fake UUID verification');
assert.ok(!html.includes('auth-boot.js'),'No real provider config or login initialization');
assert.ok(!html.includes('manifest.json')&&!html.includes('sw.js'),'No PWA install or service worker');
assert.ok(!html.includes('type="file" id="upload"'),'No real uploads');
assert.ok(bridge.includes("script.src='app.js?v=338fgb1'"));
assert.ok(bridge.includes('MiBowlingAuthGate.create'));
assert.ok(bridge.includes('MiBowlingPrivateRepository.create'));
assert.ok(bridge.includes('MiBowlingMigrationLAB.capture'));
assert.ok(bridge.includes('MiBowlingPinStats.html'));
assert.ok(bridge.includes('MiBowlingProfiles.storageKey'));
assert.ok(bridge.includes('allowSignUp:false'));
assert.ok(guard.includes("Object.defineProperty(root,'localStorage'"));
assert.ok(guard.includes("Object.defineProperty(root,'sessionStorage'"));
assert.ok(guard.includes("Object.defineProperty(root,'indexedDB'"));
assert.ok(guard.includes("Object.defineProperty(root.navigator,'serviceWorker'"));
for(const p of ['auth-private-repository.js','auth-lab.js','profiles.js','stats-bolos.js',
 'auth-legacy-migration-lab.js','auth-idb-pdf-reader-lab.js','auth-private-pdf-storage-lab.js']){
 assert.ok(fs.existsSync(path.join(root,p)),'Missing PR13 isolated module '+p);
}
assert.match(read('auth-private-repository.js').toString('utf8'),/await identity\(owner\)/);
const app=read('app.js').toString('utf8');
assert.ok(app.includes('function calendarView()')&&app.includes("function home()"));
assert.ok(app.includes("function aggregate(")&&app.includes("function stats()"));
assert.ok(app.includes('Liga Nacional'));
assert.ok(!html.includes('profiles.js?v=')||!html.includes('MiBowlingProfiles.init()'),
 'Local PIN gate must not be used as email identity');
console.log('OK · six published CP-020 blobs unchanged, including current main index/app/SW');
console.log('OK · 31 official FGB dates retained: 10 gallegas, 21 nacionales');
console.log('OK · explicit staged modules: email gate, private UUID docs, profiles as import source, pin stats, PDF backup');
console.log('OK · guarded demo does not initialize service worker, IndexedDB or real auth bootstrap');
