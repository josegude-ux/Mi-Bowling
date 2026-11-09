/* I26 · Bounded sequential reads and honest memory/custody boundaries.
 * No real user records. A/B/C fixtures only.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,PASS,clone}=require('./i26-bounded-import-fixture.cjs');
async function main(){
 const f=await fixture(A),I=f.Import;
 assert.equal(I.DEFAULT_CHUNK_BYTES,128*1024);
 assert.equal(I.MAX_CHUNK_BYTES,256*1024);
 const pre=I.preflight(f.blobs);
 assert.equal(pre.files.length,7);
 assert.equal(pre.files.every(x=>x.present),true);
 assert.equal(pre.totalBytes,f.blobs.reduce((n,b)=>n+b.size,0));
 assert.equal(pre.heapUseMeasured,false);
 assert.equal(pre.physicalCustodyProven,false);
 const progress=[];
 const result=await I.readFiles(f.blobs,{chunkBytes:8192,
  onProgress:x=>progress.push(x)});
 assert.deepEqual(JSON.parse(JSON.stringify(result.raws)),f.raws);
 assert.equal(result.diagnostic.format,I.FORMAT);
 assert.equal(result.diagnostic.readBytes,pre.totalBytes);
 assert.equal(result.diagnostic.inputBytes,pre.totalBytes);
 assert.equal(result.diagnostic.peakReadBytes<=8192,true);
 assert.equal(result.diagnostic.chunks,progress.length);
 assert.equal(progress.at(-1).bytesRead,pre.totalBytes);
 assert.equal(result.diagnostic.independentlyAuthenticated,false);
 assert.equal(result.diagnostic.heapUseMeasured,false);
 assert.equal(result.diagnostic.physicalCustodyProven,false);
 assert.equal(result.diagnostic.noWrites,true);
 // One codepoint may span many chunks. UTF-8 must round-trip exactly.
 const unicode=Array(7).fill(null);
 unicode[0]=new Blob(['🥇áÉ𐍈']);
 const readUnicode=await I.readFiles(unicode,{chunkBytes:1});
 assert.equal(readUnicode.raws[0],'🥇áÉ𐍈');
 assert.equal(readUnicode.diagnostic.peakReadBytes,1);
 const partiallyMissing=clone(f.raws);partiallyMissing[2]=null;
 const partial=await I.readFiles(f.fromRaws(partiallyMissing));
 assert.equal(partial.raws[2],null);
 assert.equal(partial.diagnostic.missing,1);
 assert.equal(partial.diagnostic.imported,6);
 // Invalid raw UTF8 is rejected before downstream parsing, with no replacement.
 const badEncoding=Array(7).fill(null);
 badEncoding[0]=new Blob([new Uint8Array([0xc3,0x28])]);
 await assert.rejects(I.readFiles(badEncoding),/malformed UTF-8/);
 const truncated=Array(7).fill(null);
 truncated[0]=new Blob([new Uint8Array([0xe2,0x82])]);
 await assert.rejects(I.readFiles(truncated,{chunkBytes:1}),/truncated UTF-8|malformed UTF-8/);
 const bom=Array(7).fill(null);
 bom[0]=new Blob([new Uint8Array([0xef,0xbb,0xbf,0x7b,0x7d])]);
 await assert.rejects(I.readFiles(bom,{chunkBytes:1}),/BOM rejected/);
 // A malformed JSON that is correctly encoded is retained (not patched).
 const malformed=clone(f.raws);malformed[4]='{"unfinished":';
 const malformedImport=await I.analyze(f.fromRaws(malformed));
 assert.equal(malformedImport.packet.sources[4],malformed[4]);
 assert.equal(malformedImport.classification,'quarantine-invalid-stages');
 assert.equal(malformedImport.externalCustodyProven,false);
 assert.equal((await f.Audit.verify(malformedImport.packet)).noWrites,true);
 const done=await I.analyze(f.blobs);
 assert.equal(done.classification,'hold-internal-consistency-only');
 assert.equal(done.verifiedStageCount,7);
 assert.equal(done.packet.sources[0],f.raws[0]);
 assert.equal(done.packet.evidence.length,7);
 assert.equal(done.operationalApproval,false);
 assert.equal(done.jointReplacementExcluded,false);
 assert.equal(done.heapUseMeasured,false);
 assert.equal(done.noWrites,true);
 const pins=Array(7).fill(null);
 pins[0]='f'.repeat(64);
 const mismatch=await I.analyze(f.blobs,pins);
 assert.equal(mismatch.classification,'quarantine-untrusted-pin-mismatch');
 assert.equal(mismatch.externalCustodyProven,false);
 // Coherent joint substitution remains internally consistent but untrusted.
 const other=await fixture(B);
 const replacement=await other.Import.analyze(other.blobs);
 assert.equal(replacement.classification,'hold-internal-consistency-only');
 assert.notEqual(replacement.packet.digest,done.packet.digest);
 assert.equal(replacement.externalCustodyProven,false);
 assert.equal(replacement.packet.jointReplacementExcluded,false);
 await assert.rejects(other.Audit.verify(replacement.packet,done.packet.digest),
  /SHA mismatch/);
 // Cancellation must reject without returning a successful packet.
 await assert.rejects(I.analyze(f.blobs,Array(7).fill(null),
  {chunkBytes:64,shouldCancel:()=>true}),/import canceled/);
 let shouldAbort=false;
 await assert.rejects(I.readFiles(f.blobs,{chunkBytes:1,
  onProgress:()=>{shouldAbort=true},
  shouldCancel:()=>shouldAbort}),/import canceled/);
 // Boundary checks happen before slice calls or large JS allocations.
 const fake=(size)=>({size,slice(){throw Error('Unexpected read')}});
 await assert.rejects(I.readFiles([fake(f.Audit.MAX_FILE_BYTES+1),
  null,null,null,null,null,null]),/12 MiB/);
 const ten=10*1024*1024;
 await assert.rejects(I.readFiles([fake(ten),fake(ten),fake(ten),
  null,null,null,null]),/28 MiB/);
 await assert.rejects(I.readFiles([null]),/seven ordered/);
 await assert.rejects(I.readFiles([fake(0),null,null,null,null,null,null]),
  /empty input/);
 await assert.rejects(I.readFiles(Array(7).fill(null),{chunkBytes:0}),
  /chunk size/);
 await assert.rejects(I.readFiles(Array(7).fill(null),
  {chunkBytes:I.MAX_CHUNK_BYTES+1}),/chunk size/);
 await assert.rejects(I.analyze(f.blobs,['not-sha']),/seven optional/);
 // Broken Blob adapters may not silently skip bytes or expand a buffer.
 const short={size:4,slice(){return new Blob([new Uint8Array([0x7b])])}};
 await assert.rejects(I.readFiles([short,null,null,null,null,null,null]),
  /short or overlong chunk/);
 const malformedBlob={size:4,slice(){return {}}};
 await assert.rejects(I.readFiles([malformedBlob,null,null,null,null,null,null]),
  /invalid slice/);
 const forgedSize={size:2,slice(){return new Blob([new Uint8Array([0x7b,0x7d,0x20])])}};
 await assert.rejects(I.readFiles([forgedSize,null,null,null,null,null,null]),
  /short or overlong chunk/);
 assert.equal(JSON.stringify(done.packet).includes(PASS),false);
 assert.equal(JSON.stringify(done.packet).includes('privateKey'),false);
 console.log('PASS I26 Node · 7-stage sequential strict UTF8 import, chunk peak<=budget, cancellation/short-read guards, 12/28MiB preflight, malformed retention, cross-stage I25, coherent joint replacement untrusted, no writes');
}
main().catch(e=>{console.error(e);process.exitCode=1});
