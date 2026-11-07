let origin;
export async function billingRequest(user,action,payload={}){
 if(!user)throw Error('Sign in to manage your subscription.');
 if(!origin){const response=await fetch('/subdomain/web/resources/data/pay-backend.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Billing service unavailable.');const routing=await response.json(),url=new URL(routing.url);if(url.protocol!=='https:'||url.port||url.username||url.password||!(url.hostname==='api.zpas.org'||/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)))throw Error('Billing service unavailable.');origin=url.origin;}
 if(!['overview','invoices','cancel','refund','upgrade'].includes(action))throw Error('Unknown billing action.');
 const response=await fetch(origin+'/billing/'+action,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({...payload,idToken:await user.getIdToken()}),signal:AbortSignal.timeout(30000)}),result=await response.json();
 if(!response.ok)throw Error(result.error||'Billing service unavailable.');return result;
}
export function invoiceCsv(invoices){const cell=value=>{let text=String(value??'');if(/^(?:\s*[=+@-]|[\t\r\n])/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'};return '\uFEFF'+[['Invoice','Date (UTC)','Currency','Subtotal excluding tax','Amount paid','Status'],...invoices.map(v=>[v.number,new Date(v.created*1000).toISOString(),v.currency,(v.subtotal??0)/100,v.paid/100,v.status])].map(row=>row.map(cell).join(',')).join('\r\n');}
