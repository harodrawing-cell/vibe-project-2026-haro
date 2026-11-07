import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import notices from '../services/notices';
export default function NoticeBanner() {
  const [posts, setPosts] = useState([]),
    [index, setIndex] = useState(0),
    [closed, setClosed] = useState(false),
    [paused, setPaused] = useState(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  const [focused, setFocused] = useState(false),
    [suspended, setSuspended] = useState(false);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => {
      if (reduced.matches) setPaused(true);
    };
    const visibility = () =>
      setSuspended(
        document.hidden ||
          document.body.classList.contains('search-open') ||
          document.querySelector('.site-nav')?.classList.contains('is-open'),
      );
    const observer = new MutationObserver(visibility);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    const nav = document.querySelector('.site-nav');
    if (nav)
      observer.observe(nav, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', motion);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', motion);
    };
  }, []);
  useEffect(() => {
    let active = true;
    notices
      .getList()
      .then((rows) => {
        if (active) setPosts(rows.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (paused || closed || focused || suspended || posts.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % posts.length),
      4000,
    );
    return () => clearInterval(timer);
  }, [paused, closed, posts.length, focused, suspended]);
  useEffect(() => {
    document.documentElement.classList.toggle(
      'has-notice-banner',
      !closed && posts.length > 0,
    );
    return () => document.documentElement.classList.remove('has-notice-banner');
  }, [closed, posts.length]);
  if (closed || !posts.length) return null;
  return (
    <aside
      className={`notice-banner ${suspended ? 'is-obscured' : ''}`}
      aria-label="최신 공지"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="notice-banner__inner">
        <Link className="notice-banner__label" to="/notice">
          <svg
            className="notice-banner__icon"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M3 8h4l9-4v12l-9-4H3zM5 12l1 5h3l-2-5" />
          </svg>
          NOTICE
        </Link>
        <Link
          className="notice-banner__title"
          to={`/notice/detail?id=${encodeURIComponent(posts[index].id)}`}
        >
          {posts[index].title}
        </Link>
        <div className="notice-banner__controls">
          <span className="notice-banner__counter">
            {index + 1}/{posts.length}
          </span>
          <button
            className="notice-banner__button"
            type="button"
            disabled={posts.length < 2}
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? '공지 배너 재생' : '공지 배너 일시정지'}
          >
            {paused ? '▶' : 'Ⅱ'}
          </button>
          <button
            className="notice-banner__button"
            type="button"
            onClick={() => setClosed(true)}
            aria-label="공지 배너 닫기"
          >
            ×
          </button>
        </div>
      </div>
    </aside>
  );
}
