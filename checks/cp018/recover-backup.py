#!/usr/bin/env python3
"""Read and validate a CP015 complete backup; extract locally without altering any browser."""
import argparse, base64, hashlib, json, pathlib, re
p=argparse.ArgumentParser();p.add_argument('backup',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);a=p.parse_args()
obj=json.loads(a.backup.read_text(encoding='utf-8-sig'));assert obj['format']=='MI-BOWLING-BACKUP-COMPLETO' and obj['version']==1
storage=obj['storage'];assert isinstance(storage,dict) and all(k.startswith('mi-bowling-') and isinstance(v,str) for k,v in storage.items());raw=storage.get('mi-bowling-analitica-v2') or storage.get('mi-bowling-v1');assert raw,'No local DB in backup';data=json.loads(raw);assert isinstance(data.get('balls'),list) and isinstance(data.get('sessions'),list)
assert not a.output.exists(),'Output must be new';verified=[]
for v in obj['pdfs']:
 id=v['id'];assert isinstance(id,str) and id and len(id)<500
 d=base64.b64decode(v['base64'],validate=True);assert len(d)==v['bytes'] and hashlib.sha256(d).hexdigest()==v['sha256'];assert d.startswith(b'%PDF-'),f'Invalid PDF signature: {id}';assert all(x[0]!=id for x in verified),'Duplicate PDF id';verified.append((id,d,v['sha256']))
# All validation before writing. No restore side effect. Keep original exact local storage values separately.
for key,field in [('mi-bowling-liga-acta-v32','leagueNational'),('mi-bowling-liga-rosters-v33','leagueRosters')]:
 if key in storage:data[field]=json.loads(storage[key])
a.output.mkdir();(a.output/'localStorage-exacto.json').write_text(json.dumps(storage,ensure_ascii=False,indent=2));(a.output/'copia-compatible-MI-BOWLING.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));d=a.output/'pdfs';d.mkdir();manifest=[]
for i,(id,raw,h) in enumerate(verified):
 name=f'patron-{i+1:03d}.pdf';(d/name).write_bytes(raw);manifest.append({'patternId':id,'file':name,'sha256':h})
(a.output/'pdf-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print(f'Validated backup: {len(storage)} keys, {len(verified)} PDFs. Files extracted, no browser changes.')
