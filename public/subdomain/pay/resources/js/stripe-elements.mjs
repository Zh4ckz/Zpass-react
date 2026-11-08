// X-style checkout: Stripe Elements on a Checkout Session (ui_mode "elements").
// Individual Stripe fields (Apple Pay / Google Pay / Link buttons + the Payment Element) are styled to match our page,
// and payment is confirmed by OUR button. Every field is still a Stripe iframe: card data never touches our code.
const SCRIPT = 'https://js.stripe.com/endive/stripe.js';
let loading = null;

/** Load Stripe.js before creating a session, so a load failure can still fall back to the hosted redirect. */
export function loadStripe() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(Error('Stripe.js unavailable')));
      s.onerror = () => { loading = null; reject(Error('Stripe.js unavailable')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export const elementsAvailable = (config) => typeof config?.publishableKey === 'string' && /^pk_(live|test)_[A-Za-z0-9]+$/.test(config.publishableKey);

// Real client secrets look like cs_live_<id>_secret_<token>; the token contains %-encoded bytes.
const validSecret = (s) => typeof s === 'string' && s.length <= 2048 && /^cs_(live|test)_[A-Za-z0-9]+_secret_[A-Za-z0-9_%]+$/.test(s);
export const validEmail = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const darkAppearance = {
  theme: 'night',
  labels: 'above',
  variables: {
    colorPrimary: '#ffffff', colorBackground: '#1c1c1f', colorText: '#f4f4f5', colorTextSecondary: '#a1a1aa',
    colorDanger: '#ff6b6b', borderRadius: '10px', fontFamily: 'Inter, system-ui, sans-serif', fontSizeBase: '14px', spacingUnit: '3px',
  },
  rules: {
    '.Input': { border: '1px solid #3a3a3f', boxShadow: 'none', backgroundColor: '#141416' },
    '.Input:focus': { border: '1px solid #8ab4ff', boxShadow: '0 0 0 2px rgba(138,180,255,.25)' },
    '.Tab, .AccordionItem': { border: '1px solid #3a3a3f', backgroundColor: '#141416', boxShadow: 'none' },
    '.Tab--selected, .AccordionItem--selected': { borderColor: '#8ab4ff' },
    '.Label': { color: '#d4d4d8', fontWeight: '500' },
  },
};

export const lightAppearance = {
  theme: 'stripe',
  labels: 'above',
  variables: { colorPrimary: '#1769ff', colorBackground: '#ffffff', colorText: '#0f172a', colorDanger: '#d64545', borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSizeBase: '15px', spacingUnit: '4px' },
  rules: { '.Input': { border: '1px solid #d7deea', boxShadow: 'none' }, '.Input:focus': { border: '1px solid #1769ff', boxShadow: '0 0 0 2px rgba(23,105,255,.18)' } },
};

/**
 * Mounts Apple Pay / Google Pay / Link (express) and the Payment Element.
 * onChange({canConfirm, total}) fires whenever the session changes; total is Stripe's own formatted amount and MUST be shown.
 * onExpress(result) fires after an Apple Pay / Google Pay confirmation.
 * Returns { confirm(email) -> {ok, error}, destroy() }.
 */
export async function mountElements({ publishableKey, clientSecret, appearance, expressContainer, paymentContainer, email, onChange, onExpress, onExpressReady }) {
  const Stripe = await loadStripe();
  const stripe = Stripe(publishableKey);
  const secret = Promise.resolve(clientSecret).then((s) => {
    if (!validSecret(s)) throw Error('The payment provider could not be verified. No payment has been taken.');
    return s;
  });
  const checkout = stripe.initCheckoutElementsSdk({
    clientSecret: secret,
    elementsOptions: { appearance, fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }] },
    ...(validEmail(email || '') ? { defaultValues: { email: email.trim() } } : {}),
  });
  await secret; // surface server/verification errors before mounting anything

  const report = (session) => onChange?.({ canConfirm: Boolean(session?.canConfirm), total: session?.total?.total?.amount || '' });
  checkout.on('change', report);

  const express = checkout.createExpressCheckoutElement({ buttonHeight: 48, buttonTheme: { applePay: appearance?.theme === 'night' ? 'white' : 'black' }, buttonType: { applePay: 'subscribe', googlePay: 'subscribe' } });
  // Apple Pay / Google Pay / Link appear only on HTTPS, on registered domains and supported devices; report so the page can hide an empty row.
  express.on('ready', (event) => onExpressReady?.(Object.values(event?.availablePaymentMethods || {}).some(Boolean)));
  express.mount(expressContainer);
  const payment = checkout.createPaymentElement({ layout: { type: 'accordion', defaultCollapsed: true } });
  payment.mount(paymentContainer);

  const loaded = await checkout.loadActions();
  if (loaded.type !== 'success') throw Error(loaded.error?.message || 'Checkout could not be loaded. No payment has been taken.');
  const { actions } = loaded;
  try { report(actions.getSession()); } catch {}

  express.on('confirm', async (event) => {
    const result = await actions.confirm({ expressCheckoutConfirmEvent: event, redirect: 'if_required' });
    onExpress?.(result?.type === 'error' ? { ok: false, error: result.error?.message || 'Payment failed.' } : { ok: true });
  });

  return {
    async confirm(mail) {
      const address = String(mail || '').trim();
      if (!validEmail(address)) return { ok: false, error: 'Enter a valid email for your invoices.' };
      const updated = await actions.updateEmail(address);
      if (updated?.type === 'error') return { ok: false, error: updated.error?.message || 'Enter a valid email for your invoices.' };
      const result = await actions.confirm({ redirect: 'if_required' });
      return result?.type === 'error' ? { ok: false, error: result.error?.message || 'Payment failed. No payment has been taken.' } : { ok: true };
    },
    destroy() {
      for (const el of [express, payment]) { try { el.destroy(); } catch { try { el.unmount(); } catch {} } }
    },
  };
}
