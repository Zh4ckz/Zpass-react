const projects = Object.freeze({
  "zpasss": {
    "apiKey": "AIzaSyDU8VWXJj_Jyauczr3jnvQ_iHfVKaroiqI",
    "authDomain": "zpasss.firebaseapp.com",
    "projectId": "zpasss",
    "storageBucket": "zpasss.firebasestorage.app",
    "messagingSenderId": "734994147577",
    "appId": "1:734994147577:web:7120334294f5c5bc1b9a28"
  }
});
export function firebaseConfigForHostname(hostname) {
  const host=String(hostname).toLowerCase();
  if(host==='zpas.org' || host==='www.zpas.org' || host==='web.zpas.org' || host==='login.zpas.org' || host==='zpass.web.app' || host==='zpass.firebaseapp.com' || /^zpass--[a-z0-9-]+\.web\.app$/.test(host))return projects.zpasss;
  if(host==='localhost' || host==='127.0.0.1' || host==='[::1]')return projects.zpasss;
  throw new Error('This hostname has no configured Firebase project.');
}
export const firebaseConfig = Object.freeze({...firebaseConfigForHostname(globalThis.location?.hostname || 'localhost')});
