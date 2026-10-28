from pathlib import Path
p=Path('Zpass/scripts/test-desktop-web.cjs');s=p.read_text();s=s.replace("records.set(base+'/portableItems/account',item);", "records.set(base+'/portableItems/account',item);records.set(base+'/portableCards/card-fixture',{numberCipher:'ENC:4111111111111111',cardholderCipher:'ENC:Fixture User',expiryCipher:'ENC:12/30',cvvCipher:'ENC:123'});records.set(base+'/portablePersonalInfo/profile',{firstNameCipher:'ENC:Fixture',addressLine1Cipher:'ENC:Test address'});")
s=s.replace("return{id:target.path.split('/').pop()};","return{...target,id:target.path.split('/').pop()};").replace('update:write}),GoogleAuthProvider','update:write,set:write}),GoogleAuthProvider')
s=s.replace("window.__backend={write:","window.__backend={pending:()=>[...records].find(([key,value])=>key.startsWith('loginRequests/') && value.status==='pending')?.[0],approve:(name,status)=>write({path:name},{status}),personal:value=>write({path:base+'/portablePersonalInfo/profile'},value),write:")
needle="  await page.evaluate(()=>window.__test.lock('Locked'));"
s=s.replace(needle,'''  await page.locator('.nav-item[data-panel="cards"]').click();
  await page.locator('#cardsList .cloud-card').click();
  await page.waitForFunction(()=>window.__backend.pending());
  assert.equal(await page.locator('dialog input').count(),0,'Card details leaked before approval');
  await page.evaluate(()=>window.__backend.approve(window.__backend.pending(),'denied'));
  await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  await page.locator('#cardsList .cloud-card').click();await page.waitForFunction(()=>window.__backend.pending());
  await page.evaluate(()=>window.__backend.approve(window.__backend.pending(),'approved'));
  await page.waitForFunction(()=>[...document.querySelectorAll('dialog input')].some(input=>input.value==='4111111111111111'));
  await page.locator('dialog button').click();
  assert.equal(await page.locator('dialog input').count(),0);
  await page.evaluate(()=>window.__backend.personal({addressLine1Cipher:'ENC:Updated address'}));
  await page.waitForFunction(()=>document.querySelector('[data-personal-field="addressLine1"]').value==='Updated address');
  console.log('PASS: card details require a separate phone approval; denial reveals nothing; personal address updates live');
'''+needle)
p.write_text(s)
p=Path('Zpass/scripts/test-cloud-data.py');s=p.read_text(encoding='utf-8').replace('17→18','17 to 18');p.write_text(s,encoding='utf-8')
p=Path('ZPass-Modern/Views/MainWindow.xaml');s=p.read_text(encoding='utf-8')
for name in ['DetailActions','MultiActions']:
 start=s.index('<StackPanel x:Name="'+name+'"');depth=0
 import re
 for match in re.finditer(r'</?StackPanel\b[^>]*>',s[start:]):
  tag=match.group();depth+=-1 if tag.startswith('</') else 1
  if depth==0:
   end=start+match.end();part=s[start:end];part=part.replace('<StackPanel','<WrapPanel',1);last=part.rfind('</StackPanel>');part=part[:last]+'</WrapPanel>'+part[last+13:];s=s[:start]+part+s[end:];break
p.write_text(s,encoding='utf-8')
