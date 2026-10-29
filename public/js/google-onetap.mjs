import { getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithCredential, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const CLIENT_IDS = {
  "syria-pass": "597701245019-7hqumrggmiqn8kum3rtgu0ramhpbc3ai.apps.googleusercontent.com"
};

const app = getApps()[0];
const clientId = app && CLIENT_IDS[app.options.projectId];
if (clientId && location.protocol === "https:") {
  const auth = getAuth(app);
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = () => {
    onAuthStateChanged(auth, (user) => {
      if (user) { window.google?.accounts.id.cancel(); return; }
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: true,
        callback: async ({ credential }) => {
          try {
            await signInWithCredential(auth, GoogleAuthProvider.credential(credential));
          } catch (error) {
            console.error("Google One Tap sign-in failed", error?.code || error);
          }
        }
      });
      window.google.accounts.id.prompt();
    });
  };
  document.head.appendChild(script);
}
