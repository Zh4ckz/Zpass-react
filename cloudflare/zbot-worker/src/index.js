import { Firestore } from './firestore.js';
import { verifyIdToken, verifyAppCheck } from './auth.js';
import { createGateway } from './gateway.js';

let cached;
export default {
  async fetch(request, env) {
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
    return cached.handle(request);
  },
};
