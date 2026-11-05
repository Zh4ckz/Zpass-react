export function checkoutPath(plan='PLUS',billing='YEARLY') {
  if(!['PLUS','PRO'].includes(plan) || !['MONTHLY','YEARLY'].includes(billing))throw Error('Invalid plan');
  return `https://zpas.org/checkout.html?plan=${plan}&billing=${billing}`;
}
export function safeCheckout(value,origin) {
  try {
    const url=new URL(value,origin);
    const localCheckout = url.origin === origin && ['/checkout','/checkout.html'].includes(url.pathname);
    const accountCheckout = url.origin === 'https://zpas.org' && url.pathname === '/checkout.html';
    const paymentCheckout = url.origin === 'https://pay.zpas.org' && url.pathname === '/';
    if(!localCheckout && !paymentCheckout && !accountCheckout)return null;
    return checkoutPath(url.searchParams.get('plan')?.toUpperCase() || 'PLUS',url.searchParams.get('billing')?.toUpperCase() || 'MONTHLY');
  }catch{return null;}
}
export function queueCheckout(plan,billing,storage=sessionStorage) {
  storage.setItem('zpassAfterLogin',checkoutPath(plan,billing));
  storage.setItem('zpassCheckoutCreated',String(Date.now()));
}
export function takeCheckout(storage,origin) {
  const path=storage.getItem('zpassAfterLogin');const created=Number(storage.getItem('zpassCheckoutCreated'));
  storage.removeItem('zpassAfterLogin');storage.removeItem('zpassCheckoutCreated');
  if(!path || (created && Date.now()-created>30*60*1000))return null;
  return safeCheckout(path,origin);
}
