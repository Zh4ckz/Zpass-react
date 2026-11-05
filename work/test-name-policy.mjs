import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,writeBatch,serverTimestamp,terminate} from 'firebase/firestore';
const apps=[];function client(uid,admin=false){const app=initializeApp({projectId:'demo-name-policy',apiKey:'demo'},uid);apps.push(app);const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8089,{mockUserToken:{sub:uid,admin}});return db}
const alice=client('alice'),bob=client('bob'),admin=client('operator',true);
const denied=async action=>assert.rejects(action,error=>error.code==='permission-denied');
async function claim(db,uid,name){const batch=writeBatch(db);batch.set(doc(db,'chat_profiles',uid),{username:name,displayName:uid});batch.set(doc(db,'chat_usernames',name),{uid});await batch.commit()}
try{
 await claim(alice,'alice','alice_test');
 for(const name of ['dashboard','setlanguage','premium_sign_up','c_d_n','c_a_m_s_o_d_a'])await denied(claim(bob,'bob',name));
 await denied(claim(bob,'bob','google'));
 await denied(setDoc(doc(bob,'brand_approvals','google'),{approvedUid:'bob'}));
 await setDoc(doc(alice,'brand_requests','google_alice'),{uid:'alice',requestedName:'google',requestedAt:serverTimestamp(),status:'pending'});
 await denied(setDoc(doc(bob,'brand_requests','google_alice'),{uid:'bob',requestedName:'google',requestedAt:serverTimestamp(),status:'pending'}));
 await denied(setDoc(doc(alice,'brand_requests','google_alice'),{uid:'alice',requestedName:'google',requestedAt:serverTimestamp(),status:'approved'}));
 await setDoc(doc(admin,'brand_approvals','google'),{approvedUid:'alice'});
 await claim(alice,'alice','google');
 await denied(claim(bob,'bob','google'));
 await denied(setDoc(doc(admin,'brand_approvals','dashboard'),{approvedUid:'alice'}));
 await denied(getDoc(doc(bob,'brand_requests','google_alice')));
 await denied(setDoc(doc(alice,'chat_usernames','google'),{uid:'bob'}));
 console.log('PASS: ordinary handles, reserved aliases, blocked brands, admin-only approval, approved UID claim, cross-user denial, request ownership/status and immutable handle owner.');
}finally{for(const app of apps){await terminate(getFirestore(app));await deleteApp(app)}}
