(async () => {
  'use strict';
  const common=HaroQnaCommon, repository=HaroQnaRepository, auth=HaroAccount;
  const $=id=>document.getElementById(id), params=new URLSearchParams(location.search), mode=document.body.dataset.qna;
  const id=params.get('id');
  const show=(text,focus=false)=>{ $('qna-message').textContent=text; if(focus)$('qna-message').focus(); };
  const date=value=>HaroNoticeCommon.formatDate(value);
  const element=(tag,text,className)=>{const item=document.createElement(tag);item.textContent=text;if(className)item.className=className;return item;};
  const loginUrl=()=> './login.html?next=qna-write.html';
  let currentUser=await auth.getUser().catch(()=>null), currentQuestion=null, busy=false, unsubscribe=()=>{};
  function permissions(user) {
    currentUser=user;
    if(mode==='list') {
      $('qna-write-link').href=user?'./qna-write.html':loginUrl();
      $('qna-write-link').title=user?'질문 작성':'로그인 후 질문을 작성할 수 있습니다.';
    }
    if(mode==='detail') {
      const own=common.isOwner(user,currentQuestion), admin=!!user?.admin;
      $('qna-edit').hidden=!own; $('qna-delete').hidden=!own;
      $('qna-answer-open').hidden=!currentQuestion || !admin || (!!currentQuestion.answer.content && currentQuestion.answer.authorUid!==user.uid);
      $('qna-answer-delete').hidden=!currentQuestion || !admin || !currentQuestion.answer.content;
      if(!admin) $('qna-answer-form').hidden=true;
      if(currentQuestion && !currentQuestion.isPublic && !own && !admin) {
        $('qna-detail-panel').hidden=true;
        $('qna-title').textContent='';$('qna-body').textContent='';$('qna-answer-body').textContent='';$('qna-answer-input').value='';
        currentQuestion=null;show(common.privateMessage,true);
      }
    }
    if((mode==='write'||mode==='edit') && $('qna-form-panel') && (!user || (currentQuestion && !common.isOwner(user,currentQuestion)))) {
      $('qna-form-panel').hidden=true;
      show('질문 작성은 로그인 후, 수정은 작성자 본인만 가능합니다.',true);
    }
  }
  const stopAuth=auth.subscribe(permissions,error=>show(error.message));
  window.addEventListener('pagehide',()=>{unsubscribe();stopAuth();},{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  async function operation(button, work) {
    if(busy)return;
    busy=true;button.disabled=true;
    try { await work(); }
    catch(error){show(error.message||'요청을 처리하지 못했습니다.',true);}
    finally{busy=false;button.disabled=false;}
  }
  try {
    show('질문을 불러오는 중입니다.');
    if(mode==='list') {
      const category=common.categories.includes(params.get('category'))?params.get('category'):'';
      const query=(params.get('q')||'').trim();$('qna-query').value=query;
      const listUrl=(selected,page=1)=>'./qna.html?'+new URLSearchParams({category:selected,q:query,page:String(page)});
      ['',...common.categories].forEach(value=>{
        const link=element('a',value||'전체','notice-button');link.href=listUrl(value);
        if(category===value)link.setAttribute('aria-current','page');$('qna-categories').append(link);
      });
      $('qna-search').addEventListener('submit',event=>{
        event.preventDefault();location.href='./qna.html?'+new URLSearchParams({category,q:$('qna-query').value.trim()});
      });
      const render=records=>{
        const items=records.filter(post=>(!category||post.category===category)&&(!query||(post.isPublic&&post.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()))));
        const pages=Math.max(1,Math.ceil(items.length/7)),page=Math.min(pages,Math.max(1,Math.floor(Number(params.get('page')))||1));
        $('qna-count').textContent=`총 ${items.length}개 · ${page} / ${pages} 페이지`;
        $('qna-list').replaceChildren();$('qna-pagination').replaceChildren();
        if(!items.length)$('qna-list').append(element('li',query?'검색 결과가 없습니다.':'등록된 질문이 없습니다.','qna-empty'));
        items.slice((page-1)*7,page*7).forEach((post,index)=>{
          const item=document.createElement('li');
          const title=element('a',post.isPublic?post.title:'🔒 '+common.privateTitle,'qna-row__title');title.href=common.detailUrl(post.id);
          item.append(element('span',String((page-1)*7+index+1),'qna-row__number'),element('span',post.category,'qna-row__category'),title,
            element('span',post.isPublic?post.author:'비공개','qna-row__author'),element('span',date(post.createdAt),'qna-row__date'),
            element('span',post.status==='answered'?'답변완료':'답변대기','qna-status'+(post.status==='answered'?' qna-status--answered':'')));
          $('qna-list').append(item);
        });
        const pageLink=(number,text)=>{const link=element('a',text,'notice-button');link.href=listUrl(category,number);if(number===page&&text===String(number))link.setAttribute('aria-current','page');$('qna-pagination').append(link);};
        if(page>1)pageLink(page-1,'이전');for(let n=Math.max(1,page-2);n<=Math.min(pages,page+2);n++)pageLink(n,String(n));if(page<pages)pageLink(page+1,'다음');
        show('');
      };
      render(await repository.getList());permissions(currentUser);
      // Public metadata only: live answer status changes never fetch protected bodies.
      if(repository.subscribeList)unsubscribe=repository.subscribeList(render,error=>show(error.message,true));
    } else if(mode==='detail') {
      async function load() {
        currentQuestion=await repository.getById(id);
        if(!currentQuestion)throw new Error('질문을 찾을 수 없습니다.');
        const post=currentQuestion,answer=post.answer;
        $('qna-title').textContent=post.title;
        $('qna-meta').textContent=`${post.category} · ${post.author} · ${date(post.createdAt)} · ${post.isPublic?'공개':'비공개'} · ${post.status==='answered'?'답변완료':'답변대기'}`;
        $('qna-body').textContent=post.content;
        $('qna-answer-body').textContent=answer.content||'관리자 답변을 기다리고 있습니다.';
        $('qna-answer-meta').textContent=answer.content?`${answer.author} · ${date(answer.updatedAt)}`:'';
        $('qna-edit').href=common.editUrl(id);$('qna-answer-input').value=answer.content;
        $('qna-answer-open').textContent=answer.content?'답변 수정':'답변 작성';
        $('qna-detail-panel').hidden=false;permissions(await auth.getUser());show('');
      }
      await load();
      $('qna-delete').addEventListener('click',()=>{void operation($('qna-delete'),async()=>{
        if(!confirm('이 질문을 삭제하시겠습니까? 질문과 답변은 복구할 수 없습니다.'))return;
        await repository.remove(id);location.href='./qna.html';
      });});
      $('qna-answer-open').addEventListener('click',()=>{ $('qna-answer-form').hidden=false;$('qna-answer-input').focus(); });
      $('qna-answer-cancel').addEventListener('click',()=>{ $('qna-answer-form').hidden=true;$('qna-answer-input').value=currentQuestion.answer.content; });
      $('qna-answer-form').addEventListener('submit',event=>{event.preventDefault();void operation($('qna-answer-submit'),async()=>{
        const content=$('qna-answer-input').value;
        $('qna-answer-input').disabled=true;$('qna-answer-cancel').disabled=true;
        try {await repository.saveAnswer(id,content);$('qna-answer-form').hidden=true;await load();show('답변을 저장했습니다.');}
        finally {$('qna-answer-input').disabled=false;$('qna-answer-cancel').disabled=false;}
      });});
      $('qna-answer-delete').addEventListener('click',()=>{void operation($('qna-answer-delete'),async()=>{
        if(!confirm('관리자 답변을 삭제하시겠습니까?'))return;
        await repository.removeAnswer(id);$('qna-answer-form').hidden=true;await load();show('답변을 삭제했습니다.');
      });});
    } else {
      const user=await auth.requireLogin();
      common.categories.forEach(value=>$('qna-category').append(new Option(value,value)));
      if(mode==='edit') {
        currentQuestion=await repository.getById(id);
        if(!common.isOwner(user,currentQuestion))throw new Error('질문 작성자 본인만 수정할 수 있습니다.');
        $('qna-category').value=currentQuestion.category;$('qna-input-title').value=currentQuestion.title;
        $('qna-content').value=currentQuestion.content;$('qna-public').value=String(currentQuestion.isPublic);
      }
      $('qna-author').value=currentQuestion?currentQuestion.author:user.name;
      $('qna-form-panel').hidden=false;show('');
      const fields=()=>({category:$('qna-category').value,title:$('qna-input-title').value,content:$('qna-content').value,isPublic:$('qna-public').value==='true'});
      const initial=JSON.stringify(fields());let leaving=false;
      window.addEventListener('beforeunload',event=>{if(!leaving&&JSON.stringify(fields())!==initial){event.preventDefault();event.returnValue='';}});
      $('qna-cancel').addEventListener('click',()=>{if(JSON.stringify(fields())!==initial&&!confirm('입력한 내용을 저장하지 않고 나가시겠습니까?'))return;leaving=true;location.href=currentQuestion?common.detailUrl(id):'./qna.html';});
      $('qna-form').addEventListener('submit',event=>{event.preventDefault();void operation($('qna-submit'),async()=>{
        const input=common.validate(fields());
        const controls=[...$('qna-form').querySelectorAll('input,select,textarea,button')];controls.forEach(control=>{control.disabled=true;});
        try {const saved=mode==='edit'?await repository.update(id,input):await repository.create(input);leaving=true;location.href=common.detailUrl(saved.id);}
        finally {controls.forEach(control=>{control.disabled=false;});}
      });});
    }
  } catch(error) {
    show(error.message||'질문을 불러오지 못했습니다.',true);
    if(mode==='detail')$('qna-detail-panel').hidden=true;
    if((mode==='write'||mode==='edit')&&!currentUser){$('qna-login-link').hidden=false;$('qna-login-link').href=loginUrl();}
  } finally {document.body.dataset.ready='true';}
})();
