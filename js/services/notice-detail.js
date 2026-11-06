(async () => {
  'use strict';
  const common = HaroNoticeCommon, auth = HaroNoticeAuth, repository = HaroNoticeRepository;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  let post = null;
  const updateRights = user => {
    const allowed = common.canManagePost(user, post);
    $('notice-edit-link').hidden = !allowed;
    $('notice-delete').hidden = !allowed;
  };
  auth.subscribe(updateRights);
  let deleting = false;
  common.showMessage('공지사항을 불러오는 중입니다.');
  try {
    post = await repository.getById(id);
    if (!post) throw new Error('해당 게시글을 찾을 수 없습니다. NOTICE 목록으로 돌아가 주세요.');
    $('notice-detail-title').textContent = post.title;
    $('notice-detail-meta').textContent = common.meta(post);
    $('notice-detail-body').textContent = post.content;
    if (post.imageUrl) {
      $('notice-detail-image').src = post.imageUrl;
      $('notice-detail-image').hidden = false;
    }
    $('notice-edit-link').href = common.editUrl(post.id);
    updateRights(await auth.getUser());
    $('notice-detail-panel').hidden = false;
    common.showMessage(params.get('saved') === '1' ? '수정 내용이 저장되었습니다.' : params.get('created') === '1' ? '게시글이 등록되었습니다.' : '');
  } catch (error) {
    common.showMessage(error.message || '공지사항을 불러오지 못했습니다.', true);
    $('notice-back').hidden = false;
  } finally {
    document.body.dataset.ready = 'true';
  }
  $('notice-delete').addEventListener('click', async () => {
    if (deleting) return;
    deleting = true;
    $('notice-delete').disabled = true;
    try {
      if (!common.canManagePost(await auth.getUser(), post)) throw new Error('게시글 작성자 본인과 관리자만 삭제할 수 있습니다.');
      if (!confirm('이 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) {
        deleting = false;
        $('notice-delete').disabled = false;
        return;
      }
      await repository.remove(id);
      location.href = './notice-list.html?deleted=1';
    } catch (error) {
      common.showMessage(error.message || '삭제하지 못했습니다. 다시 시도해 주세요.', true);
      deleting = false;
      $('notice-delete').disabled = false;
    }
  });
})();
