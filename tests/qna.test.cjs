const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {fileURLToPath,pathToFileURL}=require('node:url');
const common=require('../js/services/qna-common.js');
test('Q&A has five valid categories; privacy metadata never includes title/body for a private question',()=>{
 assert.equal(common.categories.length,5);
 const question={category:common.categories[0],title:'숨길 제목',content:'숨길 본문',isPublic:false,author:'숨길 이름',authorUid:'owner',createdAt:'2026-11-06T00:00:00.000Z',updatedAt:'2026-11-06T00:00:00.000Z'};
 const metadata=common.metadata(question);
 assert.equal(metadata.title,common.privateTitle);assert.equal(metadata.author,'비공개');assert.equal(metadata.content,undefined);
 assert.ok(!JSON.stringify(metadata).includes(question.title));assert.ok(!JSON.stringify(metadata).includes(question.content));
 assert.equal(common.metadata({...question,isPublic:true}).title,question.title);
 for(const fields of [{category:'잘못된 유형'},{title:''},{content:''},{isPublic:'false'}])assert.throws(()=>common.validate({...question,...fields}));
 assert.equal(common.isOwner({uid:'owner',admin:false},question),true);
 assert.equal(common.isOwner({uid:'admin',admin:true},question),false);
});
test('all pages expose Q&A after NOTICE; Q&A pages reuse existing assets and have unique IDs',()=>{
 const pages=['index.html',...['notice','goods','cart'].flatMap(dir=>fs.readdirSync('pages/'+dir).filter(x=>x.endsWith('.html')).map(x=>'pages/'+dir+'/'+x))];
 for(const file of pages){
  const html=fs.readFileSync(file,'utf8');assert.ok(html.includes('>Q&amp;A</a>'),file);
  assert.ok(html.indexOf('>NOTICE</a>')<html.indexOf('>Q&amp;A</a>'),file);
 }
 for(const name of ['qna.html','qna-detail.html','qna-write.html','qna-edit.html']){
  const file=path.resolve('pages/notice',name),html=fs.readFileSync(file,'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,new Set(ids).size,name);
  for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   if(/^(?:https?:|mailto:|tel:|data:|#)/.test(url))continue;
   assert.ok(fs.existsSync(fileURLToPath(new URL(url,pathToFileURL(file)))),name+': '+url);
  }
  assert.ok(html.indexOf('qna-common.js')<html.indexOf('qna-repository.js'));
  assert.ok(html.indexOf('qna-repository.js')<html.indexOf('qna-page.js'));
  assert.ok(!html.includes('/notice-list.js'));
 }
});
