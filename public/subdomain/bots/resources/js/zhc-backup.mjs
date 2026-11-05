// Stable Android/Windows/Web v4 container. Encryption functions are supplied by the vault crypto adapter.
export const MAX_BACKUP_BYTES=20*1024*1024;
const magic='ZPASS.ZHC';
const lowerObject=value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k[0].toLowerCase()+k.slice(1),v]));
const strings=(row,names)=>Object.fromEntries(names.map(name=>{const value=row[name]??'';if(typeof value!=='string')throw Error(`Invalid backup field: ${name}`);return[name,value];}));
export function normalizeBackup(input,version) {
  if(!input || typeof input!=='object' || Array.isArray(input))throw Error('Invalid backup contents.');
  const data=lowerObject(input);
  if(data.format!==magic || data.version!==version)throw Error('Invalid backup contents.');
  const rows=(name,required=false)=>{const value=data[name];if(value===undefined&&!required)return[];if(!Array.isArray(value))throw Error(`Invalid backup section: ${name}`);return value.map(row=>{if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Invalid backup record.');return lowerObject(row);});};
  return {
    entries:rows(version===3?'passwords':'entries',true).map(row=>({...strings(row,['platform','username','domain','notes','category']),password:strings(row,[version===3?'password':'encryptedPass'])[version===3?'password':'encryptedPass'],archived:Boolean(row.isArchived)||['archive','archived'].includes(String(row.category).toLowerCase())})),
    cards:rows('cards').map(row=>strings(row,['number','cardholder','expiry','brand','bank','bankWebsite','nickname','cvv','cvv2','category'])),
    authenticators:rows('authenticators').map(row=>{const item=strings(row,['issuer','accountName','secret','algorithm']);item.algorithm ||= 'SHA1';item.digits=row.digits??6;item.period=row.period??30;if(!['SHA1','SHA256','SHA512'].includes(item.algorithm)||!Number.isInteger(item.digits)||item.digits<6||item.digits>8||!Number.isInteger(item.period)||item.period<1||item.period>300)throw Error('Invalid authenticator settings.');return item;}),
    personalInfo:data.personalInfo==null?null:strings(data.personalInfo,['firstName','lastName','email','phone','company','addressLine1','addressLine2','city','state','postalCode','country'])
  };
}
export async function readZhc(content,password,cryptoAdapter) {
  if(new TextEncoder().encode(content).length>MAX_BACKUP_BYTES)throw Error('Backup exceeds 20 MB.');
  const parts=content.replace(/^\uFEFF/,'').split('\n');
  if(parts[0]?.trim()!==magic)throw Error('This file is not a PassGram backup.');
  const version=Number(parts[1]?.trim());
  if(version===2)throw Error('This older Android backup requires the Android key from the installation that created it. A recovery password cannot replace that key. Keep the original file.');
  if(version===3)return normalizeBackup(JSON.parse(await cryptoAdapter.decryptLegacy(parts.slice(2).join('\n').trim())),3);
  if(version!==4||parts.length!==5)throw Error('Unsupported or incomplete PassGram backup.');
  if(typeof password!=='string'||password.length<10)throw Error('Enter the backup password (at least 10 characters).');
  let plain;
  try{plain=await cryptoAdapter.decrypt(parts[4].trim(),password,parts[2].trim(),parts[3].trim());}
  catch{throw Error('Incorrect backup password or damaged file. Nothing was imported.');}
  return normalizeBackup(JSON.parse(plain),4);
}
export async function writeZhc(data,password,cryptoAdapter) {
  if(typeof password!=='string'||password.length<10)throw Error('Use a backup password of at least 10 characters.');
  const payload={format:magic,version:4,createdAt:Date.now(),entries:data.entries.map(p=>({platform:p.platform,username:p.username,encryptedPass:p.password,domain:p.domain||'',notes:p.notes||'',category:p.archived?'Archive':p.category||''})),cards:data.cards,authenticators:data.authenticators,personalInfo:data.personalInfo};
  normalizeBackup(payload,4);
  const encrypted=await cryptoAdapter.encrypt(JSON.stringify(payload),password);
  const content=`${magic}\n4\n${encrypted.salt1}\n${encrypted.salt2}\n${encrypted.cipher}`;
  if(new TextEncoder().encode(content).length>MAX_BACKUP_BYTES)throw Error('Backup exceeds 20 MB.');
  return content;
}
