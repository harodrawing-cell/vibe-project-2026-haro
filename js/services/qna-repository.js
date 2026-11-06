(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./qna-common.js') : root.HaroQnaCommon);
  if (node) module.exports = api;
  else root.HaroQnaRepository = api.createRepository({ connect:() => root.HaroNoticeFirebase.getClient(), auth:root.HaroAccount });
})(globalThis, function (common) {
  'use strict';
  function createRepository({ connect, auth }) {
    const run = async operation => {
      try { return await operation(await connect()); }
      catch (error) {
        if (error.code === 'permission-denied') throw new Error('접근 권한이 없거나 Q&A 보안 규칙이 아직 적용되지 않았습니다.');
        if (error.code === 'unavailable') throw new Error('서버에 연결하지 못했습니다. 입력 내용은 유지됩니다.');
        throw error;
      }
    };
    function refs(sdk, db, id) {
      if (typeof id !== 'string' || !id || id.includes('/') || id === '.' || id === '..') throw new Error('질문 ID가 올바르지 않습니다.');
      return { list:sdk.doc(db,'qnaList',id), detail:sdk.doc(db,'qnaDetails',id), answer:sdk.doc(db,'qnaAnswers',id) };
    }
    const data = snapshot => snapshot.exists() ? { ...snapshot.data(), id:snapshot.id } : null;
    const owner = (user, question) => { if (!common.isOwner(user,question)) throw new Error('질문 작성자 본인만 수정·삭제할 수 있습니다.'); };
    async function transact(sdk,db,work) {
      // Visibility can change between reading metadata and committing a reply.
      // Re-read once more through the same rules; never fall back to an unchecked write.
      for(let attempt=0; ; attempt++) {
        try {return await sdk.runTransaction(db,work);}
        catch(error) {
          if(error.code!=='permission-denied'||attempt>=2)throw error;
          await new Promise(resolve=>setTimeout(resolve,80*(attempt+1)));
        }
      }
    }
    async function readBundle(transaction, reference) {
      const question = data(await transaction.get(reference.detail));
      const list = data(await transaction.get(reference.list));
      const answer = data(await transaction.get(reference.answer));
      if (!question || !list || !answer) throw new Error('질문을 찾을 수 없거나 데이터가 완전하지 않습니다.');
      return { question, list, answer };
    }
    return {
      subscribeList: (callback,onError) => {
        let active=true, stop;
        connect().then(({sdk,db})=>{
          if(!active)return;
          stop=sdk.onSnapshot(sdk.collection(db,'qnaList'),snapshot=>callback(snapshot.docs.map(data).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))),onError);
        }).catch(onError);
        return ()=>{active=false;stop?.();};
      },
      getList: () => run(async ({ sdk, db }) => {
        const result = await sdk.getDocsFromServer(sdk.collection(db,'qnaList'));
        return result.docs.map(data).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      }),
      getById: id => run(async ({ sdk, db }) => {
        const reference=refs(sdk,db,id);
        const list=data(await sdk.getDocFromServer(reference.list));
        if (!list) return null;
        const user=await auth.getUser();
        if (!list.isPublic && !common.isOwner(user,list) && !user?.admin) throw new Error(common.privateMessage);
        try {
          const question=data(await sdk.getDocFromServer(reference.detail));
          const answer=data(await sdk.getDocFromServer(reference.answer));
          if (!question || !answer) throw new Error('질문을 찾을 수 없습니다.');
          return { ...question, answer, status:list.status };
        } catch (error) {
          if (error.code === 'permission-denied') throw new Error(common.privateMessage);
          throw error;
        }
      }),
      create: async input => {
        const user=await auth.requireLogin(), fields=common.validate(input);
        const id=crypto.randomUUID(), now=new Date().toISOString();
        const question={ ...fields, author:user.name, authorUid:user.uid, createdAt:now, updatedAt:now };
        return run(async ({ sdk, db }) => {
          const reference=refs(sdk,db,id), batch=sdk.writeBatch(db);
          batch.set(reference.detail,question);
          batch.set(reference.list,common.metadata(question));
          batch.set(reference.answer,common.emptyAnswer());
          await batch.commit();
          return { id, ...question };
        });
      },
      update: async (id, input) => {
        const user=await auth.requireLogin(), fields=common.validate(input);
        return run(({ sdk, db }) => transact(sdk,db,async transaction => {
          const reference=refs(sdk,db,id), { question,list }=await readBundle(transaction,reference);
          owner(user,question);
          const updated={ category:fields.category,title:fields.title,content:fields.content,isPublic:fields.isPublic,
            author:question.author,authorUid:question.authorUid,createdAt:question.createdAt,updatedAt:new Date().toISOString() };
          transaction.set(reference.detail,updated);
          transaction.set(reference.list,common.metadata(updated,list.status));
          return { id, ...updated };
        }));
      },
      remove: async id => {
        const user=await auth.requireLogin();
        return run(({ sdk, db }) => transact(sdk,db,async transaction => {
          const reference=refs(sdk,db,id), { question }=await readBundle(transaction,reference);
          owner(user,question);
          transaction.delete(reference.detail);transaction.delete(reference.list);transaction.delete(reference.answer);
        }));
      },
      saveAnswer: async (id, content) => {
        const user=await auth.requireLogin();
        if (!user.admin) throw new Error('관리자만 답변할 수 있습니다.');
        if (typeof content !== 'string' || !content.trim() || content.trim().length>30000) throw new Error('답변은 1~30,000자로 입력해 주세요.');
        return run(({ sdk, db }) => transact(sdk,db,async transaction => {
          const reference=refs(sdk,db,id), { list,answer }=await readBundle(transaction,reference);
          if (answer.content && answer.authorUid!==user.uid) throw new Error('다른 관리자가 작성한 답변은 수정할 수 없습니다.');
          const now=new Date().toISOString();
          transaction.set(reference.answer,{content:content.trim(),author:user.name,authorUid:user.uid,createdAt:answer.content?answer.createdAt:now,updatedAt:now});
          const { id:ignored, ...metadata }=list;
          transaction.set(reference.list,{...metadata,status:'answered'});
        }));
      },
      removeAnswer: async id => {
        await auth.requireAdmin();
        return run(({ sdk, db }) => transact(sdk,db,async transaction => {
          const reference=refs(sdk,db,id), { list }=await readBundle(transaction,reference);
          const { id:ignored, ...metadata }=list;
          transaction.set(reference.answer,common.emptyAnswer());
          transaction.set(reference.list,{...metadata,status:'waiting'});
        }));
      },
    };
  }
  return { createRepository };
});
