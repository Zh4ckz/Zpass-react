import {HttpError} from './payments.js';
export async function authenticatedUser(idToken,fetcher=(...args)=>globalThis.fetch(...args)){
 if(typeof idToken!=='string'||idToken.length<20||idToken.length>8192)throw new HttpError(401,'Sign in to manage your account.');
 const response=await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyBvnc-swQuAx_Fe67TUY7TGoM4VdG89cI4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken}),signal:AbortSignal.timeout(10000)});
 const user=(await response.json()).users?.[0];if(!response.ok||!user?.localId||user.disabled)throw new HttpError(401,'Your sign-in has expired. Sign in again.');
 return {uid:user.localId,displayName:user.displayName||'',email:user.email||''};
}
