const common = (() => {
  'use strict';
  const categories = ['공지사항', '이모티콘', '굿즈', '사이트 소식'];
  const formatDate = (value) =>
    new Date(value).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const detailUrl = (id) => `./notice-detail.html?id=${encodeURIComponent(id)}`;
  const editUrl = (id) => `./notice-edit.html?id=${encodeURIComponent(id)}`;
  function showMessage(message, focus = false) {
    const target = document.getElementById('notice-message');
    if (!target) return;
    target.textContent = message;
    if (focus) target.focus();
  }
  function validateInput(input) {
    if (typeof input.title !== 'string' || !input.title.trim())
      throw new Error('제목을 입력해 주세요.');
    if (input.title.trim().length > 120)
      throw new Error('제목은 120자 이하로 입력해 주세요.');
    if (typeof input.content !== 'string' || !input.content.trim())
      throw new Error('내용을 입력해 주세요.');
    if (input.content.trim().length > 30000)
      throw new Error('내용은 30,000자 이하로 입력해 주세요.');
    if (!categories.includes(input.category))
      throw new Error('카테고리를 선택해 주세요.');
    if (
      typeof input.imageUrl !== 'string' ||
      (input.imageUrl !== '' &&
        !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
          input.imageUrl,
        ) &&
        !/^https:\/\//.test(input.imageUrl))
    )
      throw new Error('첨부 이미지 주소가 올바르지 않습니다.');
    return {
      category: input.category,
      title: input.title.trim(),
      content: input.content.trim(),
      imageUrl: input.imageUrl,
    };
  }
  function validateFile(file) {
    if (
      !file ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size <= 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      throw new Error('JPG, PNG 또는 WebP 이미지(5MB 이하)를 선택해 주세요.');
    }
  }
  async function fileToImageUrl(file) {
    validateFile(file);
    // 테스트용 Firestore에서도 기존 WebP/Base64 첨부 방식을 유지한다.
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const scale = Math.min(
        1,
        1200 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context)
        throw new Error('이 브라우저에서 이미지 변환을 지원하지 않습니다.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/webp', 0.82);
      if (!result.startsWith('data:image/webp;base64,'))
        throw new Error('이 브라우저에서 WebP 변환을 지원하지 않습니다.');
      return result;
    } catch (error) {
      throw new Error(
        error.message.includes('지원하지')
          ? error.message
          : '이미지를 읽거나 변환하지 못했습니다. 정상적인 이미지 파일을 선택해 주세요.',
      );
    } finally {
      URL.revokeObjectURL(source);
    }
  }
  const meta = (post) =>
    `${post.category} · ${post.author} · ${formatDate(post.createdAt)}${post.updatedAt !== post.createdAt ? ` · 수정 ${formatDate(post.updatedAt)}` : ''}`;
  const canManagePost = (user, post) =>
    !!user &&
    !!post &&
    (user.admin === true ||
      (typeof user.uid === 'string' &&
        user.uid.length > 0 &&
        typeof post.authorUid === 'string' &&
        user.uid === post.authorUid));
  return {
    categories,
    formatDate,
    detailUrl,
    editUrl,
    showMessage,
    validateInput,
    validateFile,
    fileToImageUrl,
    meta,
    canManagePost,
  };
})();
export default common;
