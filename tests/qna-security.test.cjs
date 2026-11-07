// Isolated demo project only. No Admin SDK or service-account identity in requests.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const resolve=name=>require(require.resolve(name,{paths:[process.env.HARO_RULES_MODULES||process.cwd()]}));
const {initializeTestEnvironment,assertSucceeds,assertFails}=resolve('@firebase/rules-unit-testing');
const sdk=resolve('firebase/firestore');
const projectId='demo-haro-security';
const host=process.env.FIRESTORE_EMULATOR_HOST;
if(!/^127\.0\.0\.1:\d+$/.test(host||''))throw Error('Only a local Firestore emulator is allowed.');
let env;
const time='2026-11-08T00:00:00.000Z';
const question=(isPublic=false)=>({category:'기타 문의',title:'비공개 실제 제목',content:'비공개 실제 본문',author:'작성자',authorUid:'member-a',isPublic,createdAt:time,updatedAt:time});
const metadata=d=>({category:d.category,title:d.isPublic?d.title:'비공개 질문입니다',author:d.isPublic?d.author:'비공개',authorUid:d.authorUid,isPublic:d.isPublic,createdAt:d.createdAt,updatedAt:d.updatedAt,status:'waiting'});
const emptyAnswer={content:'',author:'',authorUid:'',createdAt:'',updatedAt:''};
const client=uid=>uid?env.authenticatedContext(uid,{email:`${uid}@members.haro.invalid`}).firestore():env.unauthenticatedContext().firestore();
async function create(uid,id='created'){
 const db=client(uid),q=question(false),batch=sdk.writeBatch(db);
 batch.set(sdk.doc(db,'qnaDetails',id),q);batch.set(sdk.doc(db,'qnaList',id),metadata(q));batch.set(sdk.doc(db,'qnaAnswers',id),emptyAnswer);return batch.commit();
}
async function remove(uid,id='private'){
 const db=client(uid),batch=sdk.writeBatch(db);
 for(const c of ['qnaDetails','qnaList','qnaAnswers'])batch.delete(sdk.doc(db,c,id));return batch.commit();
}
async function edit(uid,changes,id='private'){
 const db=client(uid),q={...question(false),...changes},batch=sdk.writeBatch(db);
 batch.update(sdk.doc(db,'qnaDetails',id),changes);batch.update(sdk.doc(db,'qnaList',id),{...metadata(q),status:'answered'});return batch.commit();
}
async function answer(uid,content){
 const db=client(uid),batch=sdk.writeBatch(db);
 batch.set(sdk.doc(db,'qnaAnswers','private'),content?{content,author:'관리자',authorUid:uid,createdAt:time,updatedAt:time}:emptyAnswer);
 batch.update(sdk.doc(db,'qnaList','private'),{status:content?'answered':'waiting'});return batch.commit();
}
test.before(async()=>{const [hostname,port]=host.split(':');env=await initializeTestEnvironment({projectId,firestore:{host:hostname,port:Number(port),rules:fs.readFileSync('firebase/firestore.rules','utf8')}})});
test.beforeEach(async()=>{
 await env.clearFirestore();
 // Fixture seeding bypasses rules only inside this local demo project.
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  for(const [uid,name,role]of [['member-a','작성자','user'],['member-b','다른 회원','user'],['admin-role','관리자','admin'],['admin-legacy','관리자','user']])await sdk.setDoc(sdk.doc(db,'users',uid),{name,username:uid,email:uid+'@example.com',role,createdAt:time});
  await sdk.setDoc(sdk.doc(db,'admins','admin-legacy'),{enabled:true});
  for(const [id,isPublic]of [['public',true],['private',false]]){const q=question(isPublic);await sdk.setDoc(sdk.doc(db,'qnaDetails',id),q);await sdk.setDoc(sdk.doc(db,'qnaList',id),{...metadata(q),status:'answered'});await sdk.setDoc(sdk.doc(db,'qnaAnswers',id),{content:'비공개 관리자 답변',author:'관리자',authorUid:'admin-role',createdAt:time,updatedAt:time})}
 });
});
test.after(async()=>{await env?.cleanup()});
test('01 guest reads public question and answer',async()=>{for(const c of ['qnaDetails','qnaAnswers'])await assertSucceeds(sdk.getDocFromServer(sdk.doc(client(null),c,'public')))});
test('02 guest cannot read private question or answer',async()=>{for(const c of ['qnaDetails','qnaAnswers'])await assertFails(sdk.getDocFromServer(sdk.doc(client(null),c,'private')))});
test('03 another member cannot read private question or answer',async()=>{for(const c of ['qnaDetails','qnaAnswers'])await assertFails(sdk.getDocFromServer(sdk.doc(client('member-b'),c,'private')))});
test('04 author reads own private question and answer',async()=>{for(const c of ['qnaDetails','qnaAnswers'])await assertSucceeds(sdk.getDocFromServer(sdk.doc(client('member-a'),c,'private')))});
test('05 role and legacy admins read private question and answer',async()=>{for(const uid of ['admin-role','admin-legacy'])for(const c of ['qnaDetails','qnaAnswers'])await assertSucceeds(sdk.getDocFromServer(sdk.doc(client(uid),c,'private')))});
test('06 guest cannot create a question even with an author UID',async()=>{await assertFails(create(null))});
test('07 member creates, edits and deletes own question atomically',async()=>{
 await assertSucceeds(create('member-a'));
 await assertSucceeds(edit('member-a',{title:'수정 제목',content:'수정 본문'}));
 await assertSucceeds(remove('member-a'));
 await env.withSecurityRulesDisabled(async c=>{for(const col of ['qnaList','qnaDetails','qnaAnswers'])assert.equal((await sdk.getDoc(sdk.doc(c.firestore(),col,'private'))).exists(),false)});
});
test('08 other member cannot edit/delete someone else question',async()=>{await assertFails(edit('member-b',{title:'위조 제목'}));await assertFails(remove('member-b'))});
test('09 member cannot write an answer or forge inconsistent answer status',async()=>{await assertFails(answer('member-a','위조 답변'));await assertFails(answer('member-b','위조 답변'));await assertFails(sdk.updateDoc(sdk.doc(client('member-a'),'qnaList','private'),{status:'waiting'}))});
test('10 admin creates, edits and clears answer; non-owner admin cannot alter question',async()=>{
 await env.withSecurityRulesDisabled(async c=>{await sdk.setDoc(sdk.doc(c.firestore(),'qnaAnswers','private'),emptyAnswer)});
 await assertSucceeds(answer('admin-role','첫 답변'));await assertSucceeds(answer('admin-role','수정 답변'));await assertSucceeds(answer('admin-role',''));
 await assertFails(edit('admin-role',{title:'관리자의 질문 수정'}));await assertFails(remove('admin-role'));
});
test('private metadata is public but excludes real title/body/answer',async()=>{
 const snapshot=await sdk.getDocs(sdk.collection(client(null),'qnaList'));assert.equal(snapshot.size,2);
 const value=snapshot.docs.find(d=>d.id==='private').data();assert.equal(value.title,'비공개 질문입니다');assert.equal(value.author,'비공개');assert.equal(value.content,undefined);assert.equal(value.answer,undefined);
 await assertFails(sdk.getDocs(sdk.collection(client(null),'qnaDetails')));await assertFails(sdk.getDocs(sdk.collection(client('admin-role'),'qnaAnswers')));
});
test('UID/profile/admin escalation and private title leak are rejected',async()=>{
 await assertFails(edit('member-a',{authorUid:'member-b'}));
 await assertFails(sdk.updateDoc(sdk.doc(client('member-b'),'users','member-b'),{role:'admin'}));
 await assertFails(sdk.setDoc(sdk.doc(client('member-b'),'admins','member-b'),{enabled:true}));
 await assertFails(sdk.updateDoc(sdk.doc(client('member-a'),'qnaList','private'),{title:'비공개 실제 제목'}));
 await assertFails(sdk.updateDoc(sdk.doc(client('member-a'),'qnaList','private'),{content:'누출'}));
});
test('mismatched public flags and unknown paths fail closed',async()=>{
 await env.withSecurityRulesDisabled(async c=>{await sdk.updateDoc(sdk.doc(c.firestore(),'qnaList','public'),{isPublic:false,title:'비공개 질문입니다',author:'비공개'})});
 for(const c of ['qnaDetails','qnaAnswers'])await assertFails(sdk.getDocFromServer(sdk.doc(client(null),c,'public')));
 await assertSucceeds(sdk.getDoc(sdk.doc(client('member-a'),'qnaDetails','public')));
 await assertFails(sdk.setDoc(sdk.doc(client('member-a'),'unexpected','doc'),{content:'x'}));
});
test('unauthenticated REST never returns private content; emulator-only user tokens obey rules',async()=>{
 const rest=async(collection,id,uid)=>{
  const headers={};if(uid){const now=Math.floor(Date.now()/1000);const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');headers.Authorization=`Bearer ${enc({alg:'none',typ:'JWT'})}.${enc({iss:`https://securetoken.google.com/${projectId}`,aud:projectId,sub:uid,user_id:uid,iat:now,exp:now+3600,auth_time:now,firebase:{sign_in_provider:'custom',identities:{}}})}.`}
  const response=await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${collection}/${id}`,{headers});const body=await response.json();return{status:response.status,body};
 };
 assert.equal((await rest('qnaDetails','public')).status,200);
 for(const collection of ['qnaDetails','qnaAnswers'])for(const uid of [null,'member-b','member-a','admin-role','admin-legacy']){
  const r=await rest(collection,'private',uid);
  if(!uid||uid==='member-b'){assert.equal(r.status,403);assert.equal(r.body.error.status,'PERMISSION_DENIED');assert.equal(r.body.fields,undefined)}else{assert.equal(r.status,200);assert.ok(r.body.fields.content.stringValue)}
 }
});
