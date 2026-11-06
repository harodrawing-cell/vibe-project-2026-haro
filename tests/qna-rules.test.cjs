const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const resolve=name=>require(require.resolve(name,{paths:[process.env.HARO_RULES_MODULES||process.cwd()]}));
const {initializeTestEnvironment,assertSucceeds,assertFails}=resolve('@firebase/rules-unit-testing');
const sdk=resolve('firebase/firestore');
const common=require('../js/services/qna-common.js');
const {createRepository}=require('../js/services/qna-repository.js');
if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw new Error('Local emulator required; production is forbidden.');
let env;
const name=uid=>uid==='owner'?'질문회원':uid?.startsWith('admin')?'관리자':'다른회원';
const db=uid=>uid?env.authenticatedContext(uid,{email:uid+'@members.haro.invalid'}).firestore():env.unauthenticatedContext().firestore();
function repository(uid,forceAdmin=false){
 const user=uid?{uid,name:name(uid),admin:uid.startsWith('admin')||forceAdmin}:null;
 return createRepository({connect:async()=>({sdk,db:db(uid)}),auth:{getUser:async()=>user,requireLogin:async()=>{if(!user)throw new Error('로그인 필요');return user;},requireAdmin:async()=>{if(!user?.admin)throw new Error('관리자만 가능');}}});
}
const input={category:common.categories[0],title:'실제 질문 제목',content:'보호할 질문 본문',isPublic:true};
test.before(async()=>{
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
 env=await initializeTestEnvironment({projectId:'demo-haro-qna',firestore:{host,port:Number(port),rules:fs.readFileSync(path.join(__dirname,'../firebase/firestore.rules'),'utf8')}});
});
test.beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  for(const uid of ['owner','other','admin','admin2'])await sdk.setDoc(sdk.doc(context.firestore(),'users',uid),{name:name(uid),username:uid,email:uid+'@example.com',role:uid.startsWith('admin')?'admin':'user',createdAt:'2026-11-06T00:00:00.000Z'});
  for(const uid of ['admin','admin2'])await sdk.setDoc(sdk.doc(context.firestore(),'admins',uid),{enabled:true});
 });
});
test.after(async()=>{await env?.cleanup();});
test('public metadata contains no private title/body; private question and answer reads are enforced by rules',async()=>{
 const owner=repository('owner'),guest=repository(null);
 const publicPost=await owner.create(input),privatePost=await owner.create({...input,isPublic:false});
 const list=await guest.getList();assert.equal(list.length,2);
 const hidden=list.find(item=>item.id===privatePost.id);
 assert.equal(hidden.title,common.privateTitle);assert.equal(hidden.author,'비공개');assert.equal(hidden.content,undefined);
 assert.equal(JSON.stringify(hidden).includes(input.title),false);
 assert.equal((await guest.getById(publicPost.id)).content,input.content);
 for(const uid of [null,'other']){
  await assert.rejects(repository(uid).getById(privatePost.id),/비공개/);
  await assertFails(sdk.getDoc(sdk.doc(db(uid),'qnaDetails',privatePost.id)));
  await assertFails(sdk.getDoc(sdk.doc(db(uid),'qnaAnswers',privatePost.id)));
 }
 assert.equal((await owner.getById(privatePost.id)).title,input.title);
 assert.equal((await repository('admin').getById(privatePost.id)).content,input.content);
 await assertFails(sdk.getDocs(sdk.collection(db(null),'qnaDetails')));
});
test('guest cannot create; another member and administrator cannot edit/delete someone else question',async()=>{
 await assert.rejects(repository(null).create(input),/로그인/);
 const post=await repository('owner').create(input);
 for(const uid of ['other','admin']){
  await assert.rejects(repository(uid).update(post.id,input),/작성자/);
  await assert.rejects(repository(uid).remove(post.id),/작성자/);
  await assertFails(sdk.updateDoc(sdk.doc(db(uid),'qnaDetails',post.id),{content:'위조'}));
  await assertFails(sdk.deleteDoc(sdk.doc(db(uid),'qnaDetails',post.id)));
 }
 await assertFails(sdk.updateDoc(sdk.doc(db('owner'),'qnaDetails',post.id),{authorUid:'other'}));
});
test('owner edits preserve id, creation date and existing answer; visibility atomically sanitizes public metadata',async()=>{
 const owner=repository('owner'),post=await owner.create(input);
 await repository('admin').saveAnswer(post.id,'관리자 답변');
 const changed=await owner.update(post.id,{...input,title:'비밀 제목',content:'변경 본문',isPublic:false});
 assert.equal(changed.id,post.id);assert.equal(changed.createdAt,post.createdAt);
 const saved=await owner.getById(post.id);assert.equal(saved.answer.content,'관리자 답변');assert.equal(saved.status,'answered');
 assert.equal((await repository(null).getList())[0].title,common.privateTitle);
 await assertFails(sdk.updateDoc(sdk.doc(db('owner'),'qnaDetails',post.id),{isPublic:true}));
 await assertFails(sdk.updateDoc(sdk.doc(db('owner'),'qnaList',post.id),{title:'비밀 제목'}));
 await assertFails(sdk.updateDoc(sdk.doc(db('owner'),'qnaList',post.id),{content:'누출'}));
 await owner.update(post.id,input);assert.equal((await repository(null).getById(post.id)).title,input.title);
});
test('only a verified admin can answer and change status; only its admin author can edit an existing answer',async()=>{
 const owner=repository('owner'),post=await owner.create(input),admin=repository('admin');
 await assert.rejects(owner.saveAnswer(post.id,'위조'),/관리자/);
 await assert.rejects(repository('other',true).saveAnswer(post.id,'로컬 관리자 위조'),/권한|규칙/);
 await assertFails(sdk.updateDoc(sdk.doc(db('owner'),'qnaList',post.id),{status:'answered'}));
 await admin.saveAnswer(post.id,'첫 답변');assert.equal((await owner.getById(post.id)).status,'answered');
 await admin.saveAnswer(post.id,'수정 답변');assert.equal((await repository(null).getById(post.id)).answer.content,'수정 답변');
 await assert.rejects(repository('admin2').saveAnswer(post.id,'다른 관리자 위조'),/다른 관리자/);
 await assertFails(sdk.updateDoc(sdk.doc(db('other'),'qnaAnswers',post.id),{content:'회원 답변'}));
 await admin.removeAnswer(post.id);const saved=await owner.getById(post.id);assert.equal(saved.status,'waiting');assert.equal(saved.answer.content,'');
});
test('question deletion is owner-only and must remove metadata, protected body and answer atomically',async()=>{
 const owner=repository('owner'),post=await owner.create({...input,isPublic:false});await repository('admin').saveAnswer(post.id,'비공개 답변');
 await assertFails(sdk.deleteDoc(sdk.doc(db('owner'),'qnaDetails',post.id)));
 await assertFails(sdk.deleteDoc(sdk.doc(db('owner'),'qnaAnswers',post.id)));
 await owner.remove(post.id);
 assert.equal(await owner.getById(post.id),null);
 await env.withSecurityRulesDisabled(async context=>{for(const collection of ['qnaList','qnaDetails','qnaAnswers'])assert.equal((await sdk.getDoc(sdk.doc(context.firestore(),collection,post.id))).exists(),false);});
});
test('private visibility and answer protection follow the latest question; concurrent edits preserve answer status',async()=>{
 const owner=repository('owner'),post=await owner.create(input);
 await Promise.all([owner.update(post.id,{...input,isPublic:false}),repository('admin').saveAnswer(post.id,'동시 답변')]);
 const saved=await owner.getById(post.id);assert.equal(saved.answer.content,'동시 답변');assert.equal(saved.status,'answered');
 await assertFails(sdk.getDoc(sdk.doc(db(null),'qnaAnswers',post.id)));
 await assertFails(sdk.getDoc(sdk.doc(db('other'),'qnaDetails',post.id)));
 const metadata=(await repository(null).getList())[0];assert.equal(metadata.title,common.privateTitle);assert.equal(metadata.status,'answered');
});
