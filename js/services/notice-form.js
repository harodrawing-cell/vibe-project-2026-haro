(async () => {
  'use strict';
  const common = HaroNoticeCommon, auth = HaroNoticeAuth, repository = HaroNoticeRepository;
  const $ = id => document.getElementById(id);
  const editing = document.body.dataset.mode === 'edit';
  const id = new URLSearchParams(location.search).get('id');
  const form = $('notice-form');
  let original = null, imageUrl = '', baseline = '', active = false;
  let imageLoading = false, submitting = false, leaving = false, imageVersion = 0;
  auth.subscribe(user => {
    if (active && (!user || (editing && !user.admin))) {
      $('notice-form-panel').hidden = true;
      common.showMessage('로그인 상태 또는 작성 권한이 변경되었습니다. 다시 로그인해 주세요.', true);
      $('notice-back').hidden = false;
    }
  });
  const fields = () => ({ category: $('notice-category').value, title: $('notice-title').value, content: $('notice-body').value, imageUrl });
  const dirty = () => active && !leaving && (imageLoading || JSON.stringify(fields()) !== baseline);
  const cancelUrl = () => original ? common.detailUrl(original.id) : './notice-list.html';
  const showImage = () => {
    $('notice-image-preview').hidden = !imageUrl;
    if (imageUrl) $('notice-image-preview').src = imageUrl;
    else $('notice-image-preview').removeAttribute('src');
    $('notice-image-name').textContent = imageUrl ? '첨부 이미지' : '첨부 이미지 없음';
    $('notice-image-remove').hidden = !imageUrl;
  };
  const setBusy = () => {
    form.setAttribute('aria-busy', String(submitting || imageLoading));
    $('notice-submit').disabled = submitting || imageLoading;
    // Freeze the draft while a future remote request is in flight.
    form.querySelectorAll('input, select, textarea, button').forEach(control => {
      if (control.id !== 'notice-submit') control.disabled = submitting;
    });
  };
  common.showMessage('입력 화면을 준비하는 중입니다.');
  try {
    if (editing) await auth.requireAdmin();
    else await auth.requireLogin();
    if (editing) {
      original = await repository.getById(id);
      if (!original) throw new Error('수정할 게시글이 없습니다. NOTICE 목록으로 돌아가 주세요.');
    }
    $('notice-author').value = original ? original.author : await auth.getCurrentUserName();
    $('notice-category').value = original ? original.category : '공지사항';
    $('notice-title').value = original ? original.title : '';
    $('notice-body').value = original ? original.content : '';
    imageUrl = original ? original.imageUrl : '';
    showImage();
    baseline = JSON.stringify(fields());
    active = true;
    $('notice-form-panel').hidden = false;
    common.showMessage('');
  } catch (error) {
    common.showMessage(error.message || '입력 화면을 불러오지 못했습니다.', true);
    $('notice-back').hidden = false;
  } finally {
    document.body.dataset.ready = 'true';
  }
  $('notice-image').addEventListener('change', async () => {
    const version = ++imageVersion;
    const file = $('notice-image').files[0];
    if (!file) {
      imageLoading = false;
      setBusy();
      return;
    }
    imageLoading = true;
    setBusy();
    try {
      const result = await common.fileToImageUrl(file);
      if (version !== imageVersion) return;
      imageUrl = result;
      showImage();
      common.showMessage('이미지를 WebP로 준비했습니다. 저장 버튼을 눌러야 반영됩니다.');
    } catch (error) {
      if (version === imageVersion) {
        $('notice-image').value = '';
        common.showMessage(`${error.message} 기존 이미지 상태는 유지됩니다.`, true);
      }
    } finally {
      if (version === imageVersion) {
        imageLoading = false;
        setBusy();
      }
    }
  });
  $('notice-image-remove').addEventListener('click', () => {
    if (submitting) return;
    imageVersion++;
    imageLoading = false;
    imageUrl = '';
    $('notice-image').value = '';
    showImage();
    setBusy();
    common.showMessage('이미지 제거를 선택했습니다. 저장 버튼을 눌러야 반영됩니다.');
  });
  $('notice-cancel').addEventListener('click', () => {
    if (submitting || (dirty() && !confirm('저장하지 않은 변경사항이 있습니다. 취소하고 이동할까요?'))) return;
    leaving = true;
    location.href = cancelUrl();
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (dirty()) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 이 페이지를 떠날까요?')) event.preventDefault();
      else leaving = true;
    }
  });
  window.addEventListener('beforeunload', event => {
    if (!dirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!active || submitting || imageLoading) return;
    const required = [$('notice-title'), $('notice-body')];
    required.forEach(control => control.setAttribute('aria-invalid', String(!control.value.trim())));
    const invalid = required.find(control => !control.value.trim());
    if (invalid) {
      common.showMessage('제목과 내용을 모두 입력해 주세요.');
      invalid.focus();
      return;
    }
    submitting = true;
    setBusy();
    try {
      const input = fields();
      common.validateInput(input);
      const post = editing ? await repository.update(original.id, input) : await repository.create(input);
      leaving = true;
      location.href = `${common.detailUrl(post.id)}&${editing ? 'saved' : 'created'}=1`;
    } catch (error) {
      common.showMessage(error.message || '저장하지 못했습니다. 입력 내용은 유지됩니다.', true);
      submitting = false;
      setBusy();
    }
  });
})();
