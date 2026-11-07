import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BoardLayout from '../layouts/BoardLayout';
import Message from '../components/Message';
import notices from '../services/notices';
import questions from '../services/qna';
import common from '../services/notice-common';
import qnaCommon from '../services/qna-common';
import { useAuth } from '../contexts/AuthContext';
export default function BoardDetail({ qna = false }) {
  const [params] = useSearchParams(),
    id = params.get('id'),
    navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(),
    repository = qna ? questions : notices,
    base = qna ? '/qna' : '/notice';
  const [post, setPost] = useState(null),
    [message, setMessage] = useState('게시글을 불러오는 중입니다.'),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [answerOpen, setAnswerOpen] = useState(false),
    [answer, setAnswer] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setPost(null);
    setAnswerOpen(false);
    setMessage('게시글을 불러오는 중입니다.');
    setError(false);
    if (!authLoading)
      repository
        .getById(id)
        .then((value) => {
          if (!active) return;
          if (!value) throw new Error('게시글을 찾을 수 없습니다.');
          setPost(value);
          setAnswer(value.answer?.content || '');
          setMessage('');
        })
        .catch((e) => {
          if (active) {
            setMessage(e.message);
            setError(true);
          }
        });
    return () => {
      active = false;
    };
  }, [id, repository, user?.uid, user?.admin, authLoading]);
  const canManage = qna
    ? qnaCommon.isOwner(user, post)
    : common.canManagePost(user, post);
  async function operation(action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      await action();
    } catch (e) {
      setMessage(e.message);
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    const value = await repository.getById(id);
    setPost(value);
    setAnswer(value?.answer?.content || '');
  }
  return (
    <BoardLayout qna={qna}>
      <nav className="notice-breadcrumb" aria-label="현재 위치">
        <Link to={base}>{qna ? 'Q&A' : 'NOTICE'} 목록</Link> › 게시글 상세
      </nav>
      <Message error={error}>{message}</Message>
      {post && (
        <article id={qna ? 'qna-detail-panel' : 'notice-detail-panel'}>
          <h2 className="notice-panel__heading notice-detail__title">
            {post.title}
          </h2>
          <p className="notice-meta">
            {common.meta(post)}
            {qna
              ? ` · ${post.isPublic ? '공개' : '비공개'} · ${post.status === 'answered' ? '답변완료' : '답변대기'}`
              : ''}
          </p>
          <div className="notice-body">{post.content}</div>
          {!qna && post.imageUrl && (
            <img
              className="notice-detail__image"
              src={post.imageUrl}
              alt="게시글 첨부 이미지"
            />
          )}
          <div
            className={`notice-actions ${qna ? 'qna-detail-actions' : 'notice-detail-actions'}`}
          >
            <Link className="notice-button" to={base}>
              목록
            </Link>
            {canManage && (
              <>
                <Link
                  className="notice-button notice-button--primary"
                  to={`${base}/edit?id=${encodeURIComponent(id)}`}
                >
                  수정
                </Link>
                <button
                  className={`notice-button ${qna ? 'qna-danger' : ''}`}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    operation(async () => {
                      if (
                        !confirm(
                          qna
                            ? '이 질문을 삭제하시겠습니까? 질문과 답변은 복구할 수 없습니다.'
                            : '이 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.',
                        )
                      )
                        return;
                      await repository.remove(id);
                      navigate(`${base}?deleted=1`);
                    })
                  }
                >
                  삭제
                </button>
              </>
            )}
          </div>
          {qna && (
            <section className="qna-answer">
              <h3>관리자 답변</h3>
              <p className="notice-meta">
                {post.answer?.content
                  ? `${post.answer.author} · ${common.formatDate(post.answer.updatedAt)}`
                  : ''}
              </p>
              <div className="notice-body">
                {post.answer?.content || '관리자 답변을 기다리고 있습니다.'}
              </div>
              {user?.admin && (
                <>
                  <div className="notice-actions">
                    {(!post.answer?.content ||
                      post.answer.authorUid === user.uid) && (
                      <button
                        className="notice-button"
                        type="button"
                        disabled={busy}
                        onClick={() => setAnswerOpen(true)}
                      >
                        {post.answer?.content ? '답변 수정' : '답변 작성'}
                      </button>
                    )}
                    {post.answer?.content && (
                      <button
                        className="notice-button qna-danger"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          operation(async () => {
                            if (!confirm('관리자 답변을 삭제하시겠습니까?'))
                              return;
                            await repository.removeAnswer(id);
                            await reload();
                            setAnswerOpen(false);
                            setMessage('답변을 삭제했습니다.');
                          })
                        }
                      >
                        답변 삭제
                      </button>
                    )}
                  </div>
                  {answerOpen && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void operation(async () => {
                          await repository.saveAnswer(id, answer);
                          await reload();
                          setAnswerOpen(false);
                          setMessage('답변을 저장했습니다.');
                        });
                      }}
                    >
                      <fieldset
                        className="product-form-fieldset"
                        disabled={busy}
                      >
                        <div className="notice-field">
                          <label htmlFor="qna-answer-input">관리자 답변</label>
                          <textarea
                            id="qna-answer-input"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            required
                            maxLength={30000}
                          />
                        </div>
                        <div className="notice-actions">
                          <button
                            className="notice-button notice-button--primary"
                            type="submit"
                          >
                            답변 저장
                          </button>
                          <button
                            className="notice-button"
                            type="button"
                            onClick={() => {
                              setAnswerOpen(false);
                              setAnswer(post.answer?.content || '');
                            }}
                          >
                            취소
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  )}
                </>
              )}
            </section>
          )}
        </article>
      )}
      {!post && (
        <Link className="notice-button" to={base}>
          목록으로
        </Link>
      )}
    </BoardLayout>
  );
}
