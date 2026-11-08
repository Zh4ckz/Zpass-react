// Stripe Embedded Checkout mounted inside our own page (ui_mode embedded_page).
// Card, Link, Apple Pay and Google Pay fields are Stripe iframes: card data goes only to Stripe.
// Callers fall back to the hosted checkout.stripe.com redirect when this throws.
const SCRIPT = 'https://js.stripe.com/endive/stripe.js';
let loading = null;
let current = null;

/** Load Stripe.js before creating a session, so a load failure can still fall back to the redirect. */
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

export const embeddedAvailable = (config) => typeof config?.publishableKey === 'string' && /^pk_(live|test)_[A-Za-z0-9]+$/.test(config.publishableKey);

/** Mounts checkout into `container`. fetchClientSecret must resolve to a cs_..._secret_... string. */
export async function mountEmbedded({ publishableKey, fetchClientSecret, container, onComplete }) {
  unmountEmbedded();
  const Stripe = await loadStripe();
  const stripe = Stripe(publishableKey);
  const checkout = await stripe.createEmbeddedCheckoutPage({
    fetchClientSecret: async () => {
      const secret = await fetchClientSecret();
      if (typeof secret !== 'string' || !/^cs_(live|test)_[A-Za-z0-9_]+$/.test(secret)) throw Error('The payment provider could not be verified. No payment has been taken.');
      return secret;
    },
    onComplete: () => onComplete?.(),
  });
  container.hidden = false;
  checkout.mount(container);
  current = checkout;
  return checkout;
}

export function unmountEmbedded() {
  if (current) { try { current.destroy(); } catch {} current = null; }
}
