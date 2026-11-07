import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BoardLayout from '../layouts/BoardLayout';
import Message from '../components/Message';
import notices from '../services/notices';
import questions from '../services/qna';
import noticeCommon from '../services/notice-common';
import qnaCommon from '../services/qna-common';
import { useAuth } from '../contexts/AuthContext';
export default function BoardList({ qna = false }) {
  const [params, setParams] = useSearchParams();
  const common = qna ? qnaCommon : noticeCommon,
    repository = qna ? questions : notices,
    base = qna ? '/qna' : '/notice';
  const category = common.categories.includes(params.get('category'))
    ? params.get('category')
    : '';
  const query = params.get('q') || '';
  const [input, setInput] = useState(query),
    [posts, setPosts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const { user } = useAuth();
  useEffect(() => setInput(query), [query]);
  useEffect(() => {
    let active = true;
    const receive = (rows) => {
      if (active) {
        setPosts(rows);
        setLoading(false);
        setError('');
      }
    };
    const fail = (e) => {
      if (active) {
        setError(e.message);
        setLoading(false);
      }
    };
    repository.getList().then(receive).catch(fail);
    const stop = qna ? repository.subscribeList(receive, fail) : () => {};
    return () => {
      active = false;
      stop();
    };
  }, [repository, qna]);
  const filtered = posts.filter(
    (post) =>
      (!category || post.category === category) &&
      (!query ||
        (qna
          ? post.isPublic &&
            post.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())
          : `${post.title} ${post.content}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()))),
  );
  const size = qna ? 7 : 10,
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    page = Math.min(
      pages,
      Math.max(1, Math.floor(Number(params.get('page'))) || 1),
    );
  const url = (selected, number = 1) =>
    `${base}?${new URLSearchParams({ category: selected, q: query, page: String(number) })}`;
  const prefix = qna ? 'qna' : 'notice';
  return (
    <BoardLayout qna={qna}>
      <Message error={!!error}>
        {error ||
          (loading
            ? '목록을 불러오는 중입니다.'
            : params.get('deleted')
              ? '게시글이 삭제되었습니다.'
              : '')}
      </Message>
      <section id={`${prefix}-list-panel`} aria-busy={loading}>
        <div className="notice-board-heading">
          <h2 className="notice-panel__heading">
            {qna ? '질문과 답변' : '공지사항'}
          </h2>
        </div>
        <nav
          className={`notice-categories ${qna ? 'qna-categories' : ''}`}
          aria-label={qna ? '질문 유형' : '공지 카테고리'}
        >
          {['', ...common.categories].map((value) => (
            <Link
              key={value}
              className="notice-button"
              to={url(value)}
              aria-current={category === value ? 'page' : undefined}
            >
              {value || '전체'}
            </Link>
          ))}
        </nav>
        <form
          className="notice-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setParams({ category, q: input.trim(), page: '1' });
          }}
        >
          <label htmlFor={`${prefix}-query`}>
            <span className="visually-hidden">
              {qna ? '공개 질문 제목 검색' : '제목 또는 내용 검색'}
            </span>
            <img
              className="notice-search__icon"
              src="./images/used/haro-search.png"
              alt=""
              aria-hidden="true"
            />
            <input
              id={`${prefix}-query`}
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={120}
              placeholder={
                qna
                  ? '공개 질문의 제목을 검색해 주세요'
                  : '검색어를 입력해 주세요'
              }
            />
          </label>
          <button className="notice-button" type="submit">
            검색
          </button>
          <Link
            className="notice-button notice-button--primary"
            to={
              user
                ? `${base}/write`
                : `/login?next=${qna ? 'qna-write.html' : 'notice-write.html'}`
            }
          >
            {qna ? '질문하기' : '글쓰기'}
          </Link>
        </form>
        <p className="notice-meta" id={`${prefix}-count`}>
          총 {filtered.length}개 · {page} / {pages} 페이지
        </p>
        {qna ? (
          <div className="qna-list-head" aria-hidden="true">
            {['번호', '질문 유형', '제목', '작성자', '작성일', '답변 상태'].map(
              (v) => (
                <span key={v}>{v}</span>
              ),
            )}
          </div>
        ) : (
          <div className="notice-list-head" aria-hidden="true">
            <span>번호</span>
            <span>제목</span>
            <span>분류 · 작성자 · 작성일</span>
          </div>
        )}
        <ul className={qna ? 'qna-list' : 'notice-list'} id={`${prefix}-list`}>
          {!loading && !error && !filtered.length && (
            <li className={qna ? 'qna-empty' : ''}>
              {query ? '검색 결과가 없습니다.' : '등록된 게시글이 없습니다.'}
            </li>
          )}
          {filtered.slice((page - 1) * size, page * size).map((post, i) => (
            <li key={post.id}>
              {qna ? (
                <>
                  <span className="qna-row__number">
                    {(page - 1) * size + i + 1}
                  </span>
                  <span className="qna-row__category">{post.category}</span>
                  <Link
                    className="qna-row__title"
                    to={`${base}/detail?id=${encodeURIComponent(post.id)}`}
                  >
                    {post.isPublic
                      ? post.title
                      : `🔒 ${qnaCommon.privateTitle}`}
                  </Link>
                  <span className="qna-row__author">
                    {post.isPublic ? post.author : '비공개'}
                  </span>
                  <span className="qna-row__date">
                    {noticeCommon.formatDate(post.createdAt)}
                  </span>
                  <span
                    className={`qna-status ${post.status === 'answered' ? 'qna-status--answered' : ''}`}
                  >
                    {post.status === 'answered' ? '답변완료' : '답변대기'}
                  </span>
                </>
              ) : (
                <>
                  <Link to={`${base}/detail?id=${encodeURIComponent(post.id)}`}>
                    {post.title}
                  </Link>
                  <p className="notice-meta">{noticeCommon.meta(post)}</p>
                </>
              )}
            </li>
          ))}
        </ul>
        <nav className="notice-pagination" aria-label="게시판 페이지">
          {page > 1 && (
            <Link className="notice-button" to={url(category, page - 1)}>
              이전
            </Link>
          )}
          {Array.from(
            { length: Math.min(pages, page + 2) - Math.max(1, page - 2) + 1 },
            (_, i) => Math.max(1, page - 2) + i,
          ).map((number) => (
            <Link
              key={number}
              className="notice-button"
              to={url(category, number)}
              aria-current={page === number ? 'page' : undefined}
            >
              {number}
            </Link>
          ))}
          {page < pages && (
            <Link className="notice-button" to={url(category, page + 1)}>
              다음
            </Link>
          )}
        </nav>
      </section>
    </BoardLayout>
  );
}
