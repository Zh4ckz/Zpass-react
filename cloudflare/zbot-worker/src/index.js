import { Firestore } from './firestore.js';
import { verifyIdToken, verifyAppCheck } from './auth.js';
import { createGateway, CONFIG_FILES } from './gateway.js';

let cached;
export default {
  async fetch(request, env, ctx) {
    // api.zpas.org: Telegram-style bot addresses (/bot<token>/<method>, /file/bot<token>/…) go to the bot API;
    // every other path is the existing website (API & config admin page), passed through to Firebase Hosting unchanged.
    const url = new URL(request.url);
    const gateway = () => {
      if (!cached || cached.env !== env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      cached = {
        env: env.FIREBASE_SERVICE_ACCOUNT_JSON,
        handle: createGateway({
          db: new Firestore(env),
          files: env.ZBOT_FILES || null,
          verifyUser: (token) => verifyIdToken(token),
          verifyAppCheck: (token) => verifyAppCheck(token),
          requireAppCheck: env.REQUIRE_APP_CHECK === 'true',
        }),
      };
      }
      return cached.handle;
    };
    if (url.hostname === 'api.zpas.org' && !/^\/(file\/)?bot[^/]+\//.test(url.pathname)) {
      // App config files: the version saved in the admin panel wins; otherwise the website's file.
      const file = /^\/api\/([a-z-]+\.json)$/.exec(url.pathname)?.[1];
      if (file && CONFIG_FILES.includes(file) && request.method === 'GET') {
        try {
          const saved = await gateway()(new Request(new URL('/config/' + file, url), { method: 'GET' }), ctx);
          if (saved.status === 200) return saved;
        } catch { /* fall back to the website file */ }
      }
      return passThrough(request, url);
    }
    return gateway()(request, ctx);
  },
};

async function passThrough(request, url) {
  const target = new URL(url.pathname + url.search, 'https://passgram.web.app');
  const init = { method: request.method, headers: new Headers(request.headers), redirect: 'manual' };
  init.headers.delete('host');
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
  const res = await fetch(target, init);
  const headers = new Headers(res.headers);
  const loc = headers.get('location');
  if (loc && loc.startsWith('https://passgram.web.app')) headers.set('location', loc.replace('https://passgram.web.app', 'https://api.zpas.org'));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
