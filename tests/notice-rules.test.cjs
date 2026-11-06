// Isolated Firestore emulator only. HARO_RULES_MODULES may point to temporary QA dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const resolve = name => require(require.resolve(name, { paths: [process.env.HARO_RULES_MODULES || process.cwd()] }));
const { initializeTestEnvironment, assertSucceeds, assertFails } = resolve('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } = resolve('firebase/firestore');
if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local Firestore emulator required; never run against production.');
let environment;
const post = { id:'owner-post', category:'공지사항',title:'테스트 글',content:'테스트 본문',author:'동일이름',authorUid:'owner',imageUrl:'',createdAt:'2026-11-06T00:00:00.000Z',updatedAt:'2026-11-06T00:00:00.000Z' };
const client = uid => uid ? environment.authenticatedContext(uid, { email:uid+'@members.haro.invalid' }).firestore() : environment.unauthenticatedContext().firestore();
test.before(async () => {
  const [host,port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({ projectId:'demo-haro-notice',firestore:{host,port:Number(port),rules:fs.readFileSync(path.join(__dirname,'../firebase/firestore.rules'),'utf8')} });
});
test.beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await setDoc(doc(db,'notices','owner-post'),post);
    const legacy={...post,id:'legacy'};delete legacy.authorUid;
    await setDoc(doc(db,'notices','legacy'),legacy);
    for(const uid of ['owner','other','admin']) await setDoc(doc(db,'users',uid),{name:'동일이름',username:uid,email:uid+'@example.com',role:uid==='admin'?'admin':'user',createdAt:post.createdAt});
    await setDoc(doc(db,'admins','admin'),{enabled:true});
  });
});
test.after(async () => { await environment?.cleanup(); });
test('guests can read but cannot create, edit or delete',async()=>{
 const db=client(null);await assertSucceeds(getDoc(doc(db,'notices','owner-post')));
 await assertFails(updateDoc(doc(db,'notices','owner-post'),{title:'forged'}));
 await assertFails(deleteDoc(doc(db,'notices','owner-post')));
 await assertFails(setDoc(doc(db,'notices','new'),{...post,id:'new'}));
});
test('different UID with identical display name cannot edit/delete or forge ownership',async()=>{
 const db=client('other');
 await assertFails(updateDoc(doc(db,'notices','owner-post'),{title:'forged'}));
 await assertFails(updateDoc(doc(db,'notices','owner-post'),{authorUid:'other',title:'forged'}));
 await assertFails(deleteDoc(doc(db,'notices','owner-post')));
});
test('owner can edit/delete but cannot change immutable authorship or creation date',async()=>{
 const db=client('owner'),ref=doc(db,'notices','owner-post');
 await assertSucceeds(updateDoc(ref,{title:'작성자 수정',updatedAt:'2026-11-06T01:00:00.000Z'}));
 assert.equal((await getDoc(ref)).data().title,'작성자 수정');
 await assertFails(updateDoc(ref,{authorUid:'other'}));
 await assertFails(updateDoc(ref,{author:'위조 작성자'}));
 await assertFails(updateDoc(ref,{createdAt:'2026-11-07T00:00:00.000Z'}));
 await assertSucceeds(deleteDoc(ref));
});
test('administrator can manage others and legacy documents; no owner inference for legacy',async()=>{
 await assertFails(updateDoc(doc(client('owner'),'notices','legacy'),{title:'위조'}));
 await assertFails(deleteDoc(doc(client('owner'),'notices','legacy')));
 const db=client('admin');
 await assertSucceeds(updateDoc(doc(db,'notices','owner-post'),{title:'관리자 수정'}));
 await assertSucceeds(updateDoc(doc(db,'notices','legacy'),{title:'이전 글 수정'}));
 await assertFails(updateDoc(doc(db,'notices','legacy'),{authorUid:'admin'}));
 await assertSucceeds(deleteDoc(doc(db,'notices','legacy')));
 await assertSucceeds(deleteDoc(doc(db,'notices','owner-post')));
});
test('signed-in member can create only with own UID/profile name; member cannot promote self',async()=>{
 const db=client('other');
 await assertSucceeds(setDoc(doc(db,'notices','new'),{...post,id:'new',authorUid:'other'}));
 await assertFails(setDoc(doc(db,'notices','spoof'),{...post,id:'spoof'}));
 await assertFails(setDoc(doc(db,'admins','other'),{enabled:true}));
 await assertFails(updateDoc(doc(db,'users','other'),{role:'admin'}));
});
test('free signup atomically creates profile with user role and matching unique reservations',async()=>{
 const db=client('member01');
 const batch=writeBatch(db);
 batch.set(doc(db,'users','member01'),{name:'신규회원',username:'member01',email:'member@example.com',role:'user',createdAt:post.createdAt});
 batch.set(doc(db,'usernames','member01'),{uid:'member01'});
 batch.set(doc(db,'emails','member@example.com'),{uid:'member01'});
 await assertSucceeds(batch.commit());
 await assertFails(updateDoc(doc(db,'users','member01'),{role:'admin'}));
});
