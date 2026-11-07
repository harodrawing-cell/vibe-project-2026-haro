const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const resolve=name=>require(require.resolve(name,{paths:[process.env.HARO_RULES_MODULES||process.cwd()]}));
const {initializeTestEnvironment,assertFails,assertSucceeds}=resolve('@firebase/rules-unit-testing');
const sdk=resolve('firebase/firestore'),authSDK=resolve('firebase/auth'),appSDK=resolve('firebase/app');
const projectId='demo-haro-account-live';
for(const name of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'])if(!/^127\.0\.0\.1:\d+$/.test(process.env[name]||''))throw Error('Local Auth and Firestore emulators required.');
let env;const apps=[];
test.before(async()=>{const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(port),rules:fs.readFileSync('firebase/firestore.rules','utf8')}})});
test.beforeEach(async()=>{await env.clearFirestore()});
test.after(async()=>{await env?.cleanup();for(const app of apps)await appSDK.deleteApp(app)});
async function service(react){
 const app=appSDK.initializeApp({projectId,apiKey:'emulator-only-key'},`account-${react}-${Date.now()}`);apps.push(app);
 const auth=authSDK.initializeAuth(app,{persistence:authSDK.inMemoryPersistence});authSDK.connectAuthEmulator(auth,`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,{disableWarnings:true});
 const db=sdk.initializeFirestore(app,{experimentalForceLongPolling:true});const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');sdk.connectFirestoreEmulator(db,host,Number(port));
 // The service is evaluated in a VM for import injection. Normalize only its
 // cross-realm JSON payloads; all operations still hit real emulators/rules.
 const clientSdk={...sdk,runTransaction:(db,operation)=>sdk.runTransaction(db,transaction=>operation({
  get:ref=>transaction.get(ref),
  set:(ref,data)=>transaction.set(ref,JSON.parse(JSON.stringify(data))),
 }))};
 const firebase={getClient:async()=>({app,db,sdk:clientSdk})};
 const context={Promise,Error,String,Date,Object,authSdk:authSDK,firebase,HaroNoticeFirebase:firebase};context.window=context;
 let source=fs.readFileSync(react?'src/services/account.js':'js/services/account-service.js','utf8');
 if(react)source=source.replace("import firebase from './firebase.js';",'').replace("import('firebase/auth')",'Promise.resolve(authSdk)').replace('export default account;','globalThis.HaroAccount=account;');
 else source=source.replace("import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js')",'Promise.resolve(authSdk)');
 vm.runInNewContext(source,context);return{account:context.HaroAccount,db,auth};
}
for(const react of [false,true])test(`${react?'React':'legacy'} real Auth+Firestore emulator signup, ID checks and password login`,async()=>{
 const {account,db,auth}=await service(react),username=react?'react_member':'legacy_member';
 assert.equal(await account.checkId(username),true);
 await account.register({name:'검증회원',username,email:`${username}@example.test`,password:'emulator-only-password'});
 assert.equal(auth.currentUser,null,'signup signs out before success');
 assert.equal(await account.checkId(username),false);
 await assert.rejects(account.register({name:'검증회원',username:username+'2',email:`${username}@example.test`,password:'emulator-only-password'}),/이메일/);
 await assert.rejects(account.login(username,'incorrect-password'),e=>['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(e.code));
 await account.login(username.toUpperCase(),'emulator-only-password');
 const user=await account.getUser();assert.ok(user.uid);assert.equal(user.admin,false);assert.equal(user.name,'검증회원');
 const profile=await sdk.getDocFromServer(sdk.doc(db,'users',user.uid));assert.equal(profile.data().role,'user');
 await assertFails(sdk.updateDoc(sdk.doc(db,'users',user.uid),{role:'admin'}));
 await account.logout();assert.equal(await account.getUser(),null);
});
test('valid exact-key lookup works; lists, malformed keys and injected private fields are denied',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();for(const col of ['usernames','emails']){
   await sdk.setDoc(sdk.doc(db,col,col==='emails'?'valid@example.test':'valid_user'),{uid:'synthetic-uid'});
   await sdk.setDoc(sdk.doc(db,col,col==='emails'?'polluted@example.test':'polluted_user'),{uid:'synthetic-uid',privateNote:'must not be public'});
  }
 });
 const db=env.unauthenticatedContext().firestore();
 for(const [col,valid,missing,polluted,bad]of [['usernames','valid_user','missing_user','polluted_user','BAD'],['emails','valid@example.test','missing@example.test','polluted@example.test','not-an-email']]){
  const found=await assertSucceeds(sdk.getDocFromServer(sdk.doc(db,col,valid)));assert.deepEqual(Object.keys(found.data()),['uid']);
  assert.equal((await assertSucceeds(sdk.getDocFromServer(sdk.doc(db,col,missing)))).exists(),false);
  await assertFails(sdk.getDocFromServer(sdk.doc(db,col,polluted)));await assertFails(sdk.getDocFromServer(sdk.doc(db,col,bad)));await assertFails(sdk.getDocs(sdk.collection(db,col)));
 }
});
