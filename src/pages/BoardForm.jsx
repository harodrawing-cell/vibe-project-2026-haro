import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BoardLayout from '../layouts/BoardLayout';
import Message from '../components/Message';
import notices from '../services/notices';
import questions from '../services/qna';
import common from '../services/notice-common';
import qnaCommon from '../services/qna-common';
import { useAuth } from '../contexts/AuthContext';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
export default function BoardForm({ qna = false, editing = false }) {
  const [params] = useSearchParams(),
    id = params.get('id'),
    navigate = useNavigate();
  const { user, loading } = useAuth(),
    repository = qna ? questions : notices,
    base = qna ? '/qna' : '/notice';
  const categories = qna ? qnaCommon.categories : common.categories;
  const [original, setOriginal] = useState(null),
    [draft, setDraft] = useState(null),
    [baseline, setBaseline] = useState(''),
    [message, setMessage] = useState('입력 화면을 준비하는 중입니다.'),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [imageLoading, setImageLoading] = useState(false),
    [leaving, setLeaving] = useState(false);
  const lock = useRef(false),
    imageVersion = useRef(0),
    fileInput = useRef(null);
  useEffect(() => {
    if (loading) return;
    let active = true;
    async function load() {
      try {
        if (!user) throw new Error('로그인 후 글쓰기를 이용할 수 있습니다.');
        const post = editing ? await repository.getById(id) : null;
        if (
          editing &&
          (!post ||
            !(qna
              ? qnaCommon.isOwner(user, post)
              : common.canManagePost(user, post)))
        )
          throw new Error(
            qna
              ? '질문 작성자 본인만 수정할 수 있습니다.'
              : '게시글 작성자 본인과 관리자만 수정할 수 있습니다.',
          );
        if (!active) return;
        const value = post
          ? {
              category: post.category,
              title: post.title,
              content: post.content,
              imageUrl: post.imageUrl || '',
              isPublic: post.isPublic ?? true,
            }
          : {
              category: categories[0],
              title: '',
              content: '',
              imageUrl: '',
              isPublic: true,
            };
        setOriginal(post);
        setDraft(value);
        setBaseline(JSON.stringify(value));
        setMessage('');
        setError(false);
      } catch (e) {
        if (active) {
          setDraft(null);
          setMessage(e.message);
          setError(true);
        }
      }
    }
    void load();
    return () => {
      active = false;
      imageVersion.current++;
    };
  }, [
    id,
    editing,
    repository,
    qna,
    user?.uid,
    user?.admin,
    loading,
    categories,
  ]);
  const authorized =
    !!user &&
    (!editing ||
      (qna
        ? qnaCommon.isOwner(user, original)
        : common.canManagePost(user, original)));
  const dirty =
    !!draft && !leaving && (imageLoading || JSON.stringify(draft) !== baseline);
  useUnsavedChanges(dirty);
  const update = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  const cancelTo = editing
    ? `${base}/detail?id=${encodeURIComponent(id)}`
    : base;
  async function imageChange(event) {
    const file = event.target.files[0],
      version = ++imageVersion.current;
    if (!file) {
      setImageLoading(false);
      return;
    }
    setImageLoading(true);
    try {
      const url = await common.fileToImageUrl(file);
      if (version === imageVersion.current) {
        update('imageUrl', url);
        setMessage(
          '이미지를 WebP로 준비했습니다. 저장 버튼을 눌러야 반영됩니다.',
        );
        setError(false);
      }
    } catch (e) {
      if (version === imageVersion.current) {
        setMessage(`${e.message} 기존 이미지 상태는 유지됩니다.`);
        setError(true);
        if (fileInput.current) fileInput.current.value = '';
      }
    } finally {
      if (version === imageVersion.current) setImageLoading(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current || imageLoading || !authorized) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      const result = editing
        ? await repository.update(id, draft)
        : await repository.create(draft);
      setLeaving(true);
      navigate(`${base}/detail?id=${encodeURIComponent(result.id)}`);
    } catch (e) {
      setMessage(e.message);
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <BoardLayout qna={qna}>
      <Message error={error}>{message}</Message>
      {draft && authorized && (
        <section>
          <h2 className="notice-panel__heading">
            {editing ? '글 수정' : qna ? '질문하기' : '글쓰기'}
          </h2>
          <form onSubmit={submit} aria-busy={busy || imageLoading}>
            <fieldset className="product-form-fieldset" disabled={busy}>
              <div className="notice-field">
                <label htmlFor="board-author">작성자</label>
                <input
                  id="board-author"
                  value={original?.author || user.name}
                  readOnly
                />
              </div>
              <div className="notice-field">
                <label htmlFor="board-category">
                  {qna ? '질문 유형' : '카테고리'}
                </label>
                <select
                  id="board-category"
                  value={draft.category}
                  onChange={(e) => update('category', e.target.value)}
                >
                  {categories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div className="notice-field">
                <label htmlFor="board-title">제목</label>
                <input
                  id="board-title"
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="notice-field">
                <label htmlFor="board-content">내용</label>
                <textarea
                  id="board-content"
                  value={draft.content}
                  onChange={(e) => update('content', e.target.value)}
                  maxLength={30000}
                  required
                  rows={10}
                />
              </div>
              {qna ? (
                <div className="notice-field">
                  <label htmlFor="board-public">공개 여부</label>
                  <select
                    id="board-public"
                    value={String(draft.isPublic)}
                    onChange={(e) =>
                      update('isPublic', e.target.value === 'true')
                    }
                  >
                    <option value="true">공개</option>
                    <option value="false">비공개</option>
                  </select>
                </div>
              ) : (
                <div className="notice-field">
                  <label htmlFor="notice-image">
                    첨부 이미지 (JPG, PNG, WebP · 5MB 이하)
                  </label>
                  <input
                    ref={fileInput}
                    id="notice-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={imageChange}
                  />
                  <p className="notice-hint">
                    {draft.imageUrl ? '첨부 이미지' : '첨부 이미지 없음'}
                  </p>
                  {draft.imageUrl && (
                    <>
                      <img
                        className="notice-image-preview"
                        src={draft.imageUrl}
                        alt="첨부 이미지 미리보기"
                      />
                      <button
                        className="notice-button"
                        type="button"
                        onClick={() => {
                          imageVersion.current++;
                          setImageLoading(false);
                          update('imageUrl', '');
                          if (fileInput.current) fileInput.current.value = '';
                        }}
                      >
                        이미지 제거
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="notice-actions">
                <button
                  className="notice-button notice-button--primary"
                  type="submit"
                  disabled={imageLoading}
                >
                  {busy ? '저장 중…' : '저장'}
                </button>
                <button
                  className="notice-button"
                  type="button"
                  onClick={() => {
                    if (
                      !dirty ||
                      confirm(
                        '저장하지 않은 변경사항이 있습니다. 취소하고 이동할까요?',
                      )
                    ) {
                      setLeaving(true);
                      navigate(cancelTo);
                    }
                  }}
                >
                  취소
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {(!draft || !authorized) && !loading && (
        <p>
          <Link className="notice-button" to={base}>
            목록으로
          </Link>{' '}
          {!user && (
            <Link
              className="notice-button"
              to={`/login?next=${qna ? 'qna-write.html' : 'notice-write.html'}`}
            >
              로그인
            </Link>
          )}
        </p>
      )}
    </BoardLayout>
  );
}
