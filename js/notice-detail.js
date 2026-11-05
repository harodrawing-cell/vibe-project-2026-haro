(async () => {
  'use strict';
  const common = HaroNoticeCommon, auth = HaroNoticeAuth, repository = HaroNoticeRepository;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  let deleting = false;
  common.showMessage('공지사항을 불러오는 중입니다.');
  try {
    const post = await repository.getById(id);
    if (!post) throw new Error('해당 게시글을 찾을 수 없습니다. NOTICE 목록으로 돌아가 주세요.');
    $('notice-detail-title').textContent = post.title;
    $('notice-detail-meta').textContent = common.meta(post);
    $('notice-detail-body').textContent = post.content;
    if (post.imageUrl) {
      $('notice-detail-image').src = post.imageUrl;
      $('notice-detail-image').hidden = false;
    }
    $('notice-edit-link').href = common.editUrl(post.id);
    const admin = await auth.isAdmin();
    $('notice-edit-link').hidden = !admin;
    $('notice-delete').hidden = !admin;
    $('notice-detail-panel').hidden = false;
    common.showMessage(params.get('saved') === '1' ? '수정 내용이 이 브라우저에 저장되었습니다.' : params.get('created') === '1' ? '게시글이 이 브라우저에 등록되었습니다.' : '');
  } catch (error) {
    common.showMessage(error.message || '공지사항을 불러오지 못했습니다.', true);
    $('notice-back').hidden = false;
  } finally {
    document.body.dataset.ready = 'true';
  }
  $('notice-delete').addEventListener('click', async () => {
    if (deleting || !confirm('이 게시글을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.')) return;
    deleting = true;
    $('notice-delete').disabled = true;
    try {
      await repository.remove(id);
      location.href = './notice-list.html?deleted=1';
    } catch (error) {
      common.showMessage(error.message || '삭제하지 못했습니다. 다시 시도해 주세요.', true);
      deleting = false;
      $('notice-delete').disabled = false;
    }
  });
})();
