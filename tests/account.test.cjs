const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const validation = require('../api/account-validation.cjs');
test('registration validates fields, normalizes identifiers and reserves admin', () => {
  const input = { name: '하로회원', username: 'User_12', email: 'USER@EXAMPLE.COM', password: 'test123456' };
  assert.deepEqual(validation.registration(input), { ...input, username: 'user_12', email: 'user@example.com' });
  for (const changes of [{username:'admin'}, {username:'../bad'}, {name:' '}, {email:'invalid'}, {email:'admin.com@company.co.kr'}, {password:'1111'}, {username:'a'}]) {
    assert.throws(() => validation.registration({ ...input, ...changes }));
  }
});
function backend() {
  const docs = new Map(), users = new Map(), deleted = [];
  let sequence = 0;
  const ref = path => ({ path, get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }) });
  const db = {
    collection: collection => ({ doc: id => ref(`${collection}/${id}`) }),
    runTransaction: async operation => {
      const writes = [];
      const result = await operation({ get: r => r.get(), set: (r,v) => writes.push([r.path,v]), create: (r,v) => writes.push([r.path,v]) });
      for(const [path,value] of writes) docs.set(path,value);
      return result;
    },
  };
  const auth = {
    createUser: async data => {
      if([...users.values()].some(user => user.email===data.email)) throw { code: 'auth/email-already-exists' };
      const user={ uid: 'uid'+ ++sequence, ...data }; users.set(user.uid,user); return user;
    },
    deleteUser: async uid => { deleted.push(uid); users.delete(uid); },
    getUser: async uid => users.get(uid),
    createCustomToken: async uid => 'signed:'+uid,
  };
  class HttpsError extends Error { constructor(code,message) { super(message); this.code=code; } }
  let passwordValid = true;
  const context = {
    exports: {}, Date, AbortSignal,
    fetch: async () => ({ ok: passwordValid }),
    require: name => ({
      'firebase-admin/app': { initializeApp() {} },
      'firebase-admin/auth': { getAuth: () => auth },
      'firebase-admin/firestore': { getFirestore: () => db },
      'firebase-functions/v2/https': { onCall: (_,fn) => fn, HttpsError },
      'node:crypto': require('node:crypto'),
      './account-validation.cjs': validation,
    })[name],
  };
  vm.runInNewContext(fs.readFileSync('api/index.cjs','utf8'),context);
  const call = (name,data) => context.exports[name]({ data, rawRequest: { ip:'test-ip' } });
  return { call,docs,users,deleted,setPasswordValid: value => { passwordValid=value; } };
}
const registration = { username:'member01',name:'일반회원',email:'member@example.com',password:'password123' };
test('server creates a normal member with no admin claim and no password in Firestore', async () => {
  const s=backend();
  assert.equal((await s.call('checkUsername',{username:'ADMIN'})).available,false);
  await s.call('registerAccount',registration);
  assert.equal(s.docs.get('usernames/member01').uid,'uid1');
  assert.equal((await s.call('checkUsername',{username:'member01'})).available,false);
  assert.equal(s.docs.get('users/uid1').password,undefined);
  assert.equal(s.docs.get('users/uid1').admin,undefined);
});
test('duplicate id rolls back only the new Auth user; duplicate email is rejected', async () => {
  const s=backend();
  await s.call('registerAccount',registration);
  await assert.rejects(s.call('registerAccount',{...registration,email:'other@example.com'}),/이미 사용 중인 아이디/);
  assert.equal(s.users.size,1);
  assert.deepEqual(s.deleted,['uid2']);
  await assert.rejects(s.call('registerAccount',{...registration,username:'member02'}),/이메일/);
  assert.equal(s.docs.has('usernames/member02'),false);
});
test('server issues a session only after password verification and limits requests', async () => {
  const s=backend();
  await s.call('registerAccount',registration);
  s.setPasswordValid(false);
  await assert.rejects(s.call('loginAccount',{username:'member01',password:'wrongpass'}),/올바르지/);
  s.setPasswordValid(true);
  assert.equal((await s.call('loginAccount',{username:'member01',password:registration.password})).token,'signed:uid1');
  await assert.rejects(s.call('loginAccount',{username:'missing1',password:'wrongpass'}),/올바르지/);
  for(let i=0;i<36;i++) await s.call('checkUsername',{username:'unused01'});
  await assert.rejects(s.call('checkUsername',{username:'unused01'}),/요청이 많습니다/);
});
test('all pages load account services before notice controllers; profiles and notice writes require server authority', () => {
  const pages=['index.html',...['notice','goods','cart'].flatMap(dir=>fs.readdirSync('pages/'+dir).filter(x=>x.endsWith('.html')).map(x=>'pages/'+dir+'/'+x))];
  for(const path of pages) {
    const html=fs.readFileSync(path,'utf8');
    assert.ok(html.includes('account-header.js'),path);
    assert.ok(html.indexOf('notice-firebase.js')<html.indexOf('account-service.js'),path);
    if(html.includes('notice-list.js')) assert.ok(html.indexOf('account-service.js')<html.indexOf('notice-list.js'));
    assert.ok(!html.includes('id="notice-admin"'));
  }
  const rules=fs.readFileSync('firebase/firestore.rules','utf8');
  assert.match(rules,/allow delete: if isAdmin\(\)/);
  assert.match(rules,/allow update: if isAdmin\(\)/);
  assert.match(rules,/allow create: if request.auth != null/);
  assert.doesNotMatch(rules,/timestamp.date/);
});
function clientSetup() {
  const docs=new Map(),identities=new Map();let seq=0,failure=null;
  const auth={currentUser:null,authStateReady:async()=>{}};
  const snapshot=path=>({exists:()=>docs.has(path),data:()=>docs.get(path)});
  const sdk={doc:(_,collection,id)=>collection+'/'+id,getDoc:async path=>snapshot(path),getDocFromServer:async path=>snapshot(path),
    runTransaction:async(_,operation)=>{
      if(failure)throw {code:failure};
      const writes=[];const result=await operation({get:async path=>snapshot(path),set:(path,data)=>writes.push([path,data])});
      for(const [path,data] of writes)docs.set(path,data);return result;
    }};
  const sdkAuth={getAuth:()=>auth,
    createUserWithEmailAndPassword:async(_,email,password)=>{
      if(identities.has(email))throw {code:'auth/email-already-in-use'};
      const user={uid:'uid'+ ++seq,email};identities.set(email,{user,password});auth.currentUser=user;return {user};
    },
    signOut:async()=>{auth.currentUser=null;},
    deleteUser:async user=>{identities.delete(user.email);auth.currentUser=null;},
    signInWithEmailAndPassword:async(_,email,password)=>{
      const record=identities.get(email);if(!record||record.password!==password)throw {code:'auth/invalid-credential'};
      auth.currentUser=record.user;return {user:record.user};
    },
  };
  const context={Promise,Error,String,Date,Object,authSdk:sdkAuth,HaroNoticeFirebase:{getClient:async()=>({app:{},db:{},sdk})}};
  context.window=context;
  vm.runInNewContext(fs.readFileSync('js/services/account-service.js','utf8').replace("import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js')",'Promise.resolve(authSdk)'),context);
  return {service:context.HaroAccount,docs,identities,auth,fail:code=>{failure=code;}};
}
const member={name:'무료회원',username:'member01',email:'MEMBER@EXAMPLE.COM',password:'password123'};
test('free signup reserves id/email atomically, stores no password, then returns to signed-out state',async()=>{
 const s=clientSetup();assert.equal(await s.service.checkId('member01'),true);assert.equal(await s.service.checkId('admin'),false);
 await s.service.register(member);assert.equal(s.auth.currentUser,null);
 assert.equal(s.docs.get('users/uid1').email,'member@example.com');assert.equal(s.docs.get('users/uid1').password,undefined);
 assert.equal(s.docs.get('usernames/member01').uid,'uid1');assert.equal(s.docs.get('emails/member@example.com').uid,'uid1');
 assert.ok(s.identities.has('member01@members.haro.invalid'));assert.equal(await s.service.checkId('member01'),false);
 await assert.rejects(s.service.register(member),/아이디/);
 await assert.rejects(s.service.register({...member,username:'member02'}),/이메일/);
});
test('free login uses Auth password verification; admin comes only from protected admins document',async()=>{
 const s=clientSetup();await s.service.register(member);
 await assert.rejects(s.service.login('member01','wrongpass'),/올바르지/);
 await s.service.login('MEMBER01',member.password);assert.equal(await s.service.isAdmin(),false);
 s.docs.get('users/uid1').admin=true;assert.equal(await s.service.isAdmin(),false);
 s.docs.set('admins/uid1',{enabled:true});assert.equal(await s.service.isAdmin(),true);
 await s.service.requireAdmin();await s.service.logout();assert.equal(await s.service.isAdmin(),false);
});
test('free signup validates fields and removes only a new identity on a definite rules rejection',async()=>{
 const s=clientSetup();for(const fields of [{username:'admin'},{email:'admin.com@company.co.kr'},{password:'1111'},{email:'bad'},{name:' '}])assert.throws(()=>s.service.register({...member,...fields}));
 s.fail('permission-denied');await assert.rejects(s.service.register(member),/규칙/);assert.equal(s.identities.size,0);assert.equal(s.docs.size,0);
});
test('active browser and deployment configuration have no Cloud Functions dependency',()=>{
 const source=fs.readFileSync('js/services/account-service.js','utf8');assert.doesNotMatch(source,/firebase-functions|httpsCallable|cloudfunctions.net/);
 assert.equal(JSON.parse(fs.readFileSync('firebase.json','utf8')).functions,undefined);
 const rules=fs.readFileSync('firebase/firestore.rules','utf8');assert.match(rules,/match \/admins\//);assert.match(rules,/allow list, write: if false/);assert.match(rules,/getAfter/);
});
