const common=['password','password1','password123','123456','12345678','123456789','qwerty','qwerty123','letmein','admin','welcome','zpass','iloveyou','şifre','sifre','ahmet','ali','correcthorsebatterystaple','trustno1','changeme'];
export function assessPassword(value,hint='') {
  if(!value)return {level:0,label:'Enter a password',hint:'Use a unique password for every account.'};
  const lower=value.toLocaleLowerCase('en-US');
  const personal=hint.toLocaleLowerCase('en-US').split(/[\s,;]+/).filter(word=>word.length>=3);
  const predictable=common.some(word=>lower===word || lower.replace(/[!@#$%\d]/g,'')===word) || /(.)\1{3}/u.test(value) || /(?:1234|abcd|qwerty|(?:19|20)\d{2})/i.test(value) || personal.some(word=>lower.includes(word));
  const unique=new Set([...value]).size;
  const level=predictable || value.length<10 ? 1 : value.length<15 || unique<7 ? 2 : value.length<20 || unique<10 ? 3 : 4;
  return {level,label:['','Weak','Fair','Good','Strong'][level],hint:predictable?'Names, dates and common patterns are easy to guess.':'Length helps. Avoid reuse and predictable patterns.'};
}
export function randomIndex(size) {
  if(!Number.isInteger(size) || size<1 || size>0x100000000)throw Error('Invalid random bound');
  const limit=0x100000000-0x100000000%size;
  const bytes=new Uint32Array(1);do{globalThis.crypto.getRandomValues(bytes);}while(bytes[0]>=limit);
  return bytes[0]%size;
}
const words='amber anchor apple atlas autumn bamboo beacon berry birch blossom breeze bridge brook canyon cedar cherry cloud coral cosmos crystal dawn desert dragon dream drift eagle echo ember falcon fern field fire forest frost galaxy garden glade harbor hazel hill horizon island jade jasmine juniper lantern leaf lemon lilac lotus maple meadow meteor mist moon moss mountain nectar night ocean olive orbit orchid otter pebble pine planet plum pond prairie quartz rain raven reef river robin rose ruby sail sand satin silver sky snow solar spark spring star stone storm summit sunset swift thyme tiger timber trail tulip valley velvet violet wave willow winter wolf zephyr'.split(' ');
export function generatePassword(length=20,mode='random',hint='') {
  length=Math.max(16,Math.min(48,Math.trunc(Number(length)) || 20));
  if(mode==='phrase')return Array.from({length:8},()=>words[randomIndex(words.length)]).join('-')+'-'+String(randomIndex(100)).padStart(2,'0');
  const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%&*+-=?'];
  const pool=groups.join('');let chars=groups.map(group=>group[randomIndex(group.length)]);
  while(chars.length<length)chars.push(pool[randomIndex(pool.length)]);
  for(let i=chars.length-1;i>0;i--){const j=randomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
  const prefix=mode==='personal' ? hint.normalize('NFKC').replace(/[^\p{L}\p{N}-]/gu,'').slice(0,24) : '';
  return (prefix?prefix+'-':'')+chars.join('');
}
