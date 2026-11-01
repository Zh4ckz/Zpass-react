// Only public routing information; provider/Firebase Admin keys stay in Python.
window.ZPassPaymentEndpoint = (async () => {
  try {
    const response = await fetch('/api/payment-target.json', {cache:'no-store', signal:AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error('No bot endpoint');
    const config = await response.json();
    const target = new URL(config.url);
    const updated = Date.parse(config.updatedAt);
    if (target.protocol !== 'https:' || !target.hostname.endsWith('.trycloudflare.com') ||
        !Number.isFinite(updated) || Date.now()-updated > 24*60*60*1000 || updated>Date.now()+60000 ||
        target.username || target.password || target.pathname !== '/') throw new Error('Invalid bot endpoint');
    return target.origin;
  } catch {
    return '/api';
  }
})();
