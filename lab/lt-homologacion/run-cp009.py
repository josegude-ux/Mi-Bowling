import os,sys,subprocess
from pathlib import Path
root=Path(os.environ['LAB']);engine=os.environ['ENGINE']
cases=['reload-close','late-writers','pdf-abort','retire-backup','pending-before','pending-after','pdf-ui','bfcache']
failed=[]
for name in cases:
 print('BEGIN_CP009',engine,name,flush=True)
 try:
  r=subprocess.run([sys.executable,'-u',str(root/'tests/browser-cp009-lifecycle.py'),'--authorized','--engine',engine,'--scenario',name],timeout=90)
  code=r.returncode
 except subprocess.TimeoutExpired:code=124
 print('END_CP009',engine,name,code,flush=True)
 if code:failed.append(name)
 if name=='reload-close' and code:
  print('STOP_CP009 shared startup/lifecycle gate failed; remaining scenarios not attempted',flush=True)
  break
print('CP009_FAILURES',engine,','.join(failed),flush=True)
sys.exit(bool(failed))
