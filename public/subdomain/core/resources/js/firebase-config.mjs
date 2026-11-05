const projects = Object.freeze({
  "passgram-org": {
    "apiKey": "AIzaSyBvnc-swQuAx_Fe67TUY7TGoM4VdG89cI4",
    "authDomain": "passgram-org.firebaseapp.com",
    "projectId": "passgram-org",
    "storageBucket": "passgram-org.firebasestorage.app",
    "messagingSenderId": "157086803240",
    "appId": "1:157086803240:web:152ae9d14c582db8c91c1d"
  }
});
export function firebaseConfigForHostname(hostname) {
  return projects["passgram-org"];
}
export const firebaseConfig = Object.freeze({...firebaseConfigForHostname(globalThis.location?.hostname || 'localhost')});
