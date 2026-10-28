import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {firebaseConfig} from './firebase-config.mjs';
import {takeCheckout} from './navigation.mjs';
const auth=getAuth(getApps()[0] || initializeApp(firebaseConfig));
onAuthStateChanged(auth,user=>{
  if(user)location.replace(takeCheckout(sessionStorage,location.origin) || '/dashboard.html');
});
