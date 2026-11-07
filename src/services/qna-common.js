const common = (() => {
  'use strict';
  const categories = Object.freeze([
    '이모티콘 문의',
    '굿즈 문의',
    '캐릭터 문의',
    '협업·제휴 문의',
    '기타 문의',
  ]);
  const privateTitle = '비공개 질문입니다';
  const privateMessage =
    '비공개 질문입니다. 작성자와 관리자만 확인할 수 있습니다.';
  const isOwner = (user, question) =>
    !!user &&
    !!question &&
    typeof user.uid === 'string' &&
    user.uid.length > 0 &&
    user.uid === question.authorUid;
  function validate(input) {
    if (!categories.includes(input.category))
      throw new Error('질문 유형을 선택해 주세요.');
    if (
      typeof input.title !== 'string' ||
      !input.title.trim() ||
      input.title.trim().length > 120
    )
      throw new Error('제목은 1~120자로 입력해 주세요.');
    if (
      typeof input.content !== 'string' ||
      !input.content.trim() ||
      input.content.trim().length > 30000
    )
      throw new Error('본문은 1~30,000자로 입력해 주세요.');
    if (typeof input.isPublic !== 'boolean')
      throw new Error('공개 여부를 선택해 주세요.');
    return {
      category: input.category,
      title: input.title.trim(),
      content: input.content.trim(),
      isPublic: input.isPublic,
    };
  }
  const metadata = (question, status = 'waiting') => ({
    category: question.category,
    title: question.isPublic ? question.title : privateTitle,
    author: question.isPublic ? question.author : '비공개',
    authorUid: question.authorUid,
    isPublic: question.isPublic,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    status,
  });
  const emptyAnswer = () => ({
    content: '',
    author: '',
    authorUid: '',
    createdAt: '',
    updatedAt: '',
  });
  const detailUrl = (id) => './qna-detail.html?id=' + encodeURIComponent(id);
  const editUrl = (id) => './qna-edit.html?id=' + encodeURIComponent(id);
  return {
    categories,
    privateTitle,
    privateMessage,
    isOwner,
    validate,
    metadata,
    emptyAnswer,
    detailUrl,
    editUrl,
  };
})();
export default common;
