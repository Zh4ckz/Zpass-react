// OAuth sign-in for Zapp (Blazor WebAssembly) via the Firebase JS SDK — the same
// signInWithPopup approach the zpass.web.app marketing site already uses, since a browser app
// can just do the provider popup dance directly instead of the loopback dance a desktop app needs.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

window.zpassAuth = (function () {
  let auth = null;

  function ensureAuth(apiKey, projectId) {
    if (!auth) {
      const app = initializeApp({ apiKey, authDomain: `${projectId}.firebaseapp.com`, projectId });
      auth = getAuth(app);
    }
    return auth;
  }

  async function signIn(apiKey, projectId, providerName) {
    const authInstance = ensureAuth(apiKey, projectId);
    if (providerName !== "google") throw new Error("Only Google sign-in is enabled.");
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);
    const idToken = await result.user.getIdToken();
    // stsTokenManager holds the refresh token on the internal user object; accessKey differs
    // across SDK builds, so read both known shapes defensively.
    const refreshToken = result.user.stsTokenManager?.refreshToken || result.user.refreshToken || "";
    return { idToken, refreshToken, uid: result.user.uid, email: result.user.email || "" };
  }

  return { signIn };
})();
