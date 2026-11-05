(() => {
  'use strict';
  if (window.HaroNoticeBanner || !window.HaroNoticeRepository) return;
  const header = document.querySelector('.site-header');
  const main = document.querySelector('#main-content');
  if (!header || !main) return;
  // Resolve from this script, so both the homepage and nested NOTICE pages work
  // under root hosting and project subdirectories without copying board data.
  const detailPage = new URL('../pages/notice/notice-detail.html', document.currentScript.src);
  const listPage = new URL('../pages/notice/notice-list.html', document.currentScript.src);
  const repository = window.HaroNoticeRepository;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let closed = false;
  const banner = document.createElement('aside');
  banner.className = 'notice-banner';
  banner.setAttribute('aria-label', '주요 공지사항');
  banner.hidden = true;
  // Static trusted markup only. Post titles are always assigned via textContent.
  banner.innerHTML = `<div class="notice-banner__inner">
    <a class="notice-banner__label" aria-label="NOTICE 공지사항 목록으로 이동"><svg class="notice-banner__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 8h4l9-4v12l-9-4H3zM5 12l1 5h3l-2-5"/></svg>NOTICE</a>
    <a class="notice-banner__title" aria-live="off"></a>
    <div class="notice-banner__controls">
      <span class="notice-banner__counter" aria-live="off"></span>
      <button class="notice-banner__button" type="button" data-notice-pause aria-label="공지 자동 전환 일시정지"></button>
      <button class="notice-banner__button" type="button" data-notice-close aria-label="공지 배너 닫기"><span aria-hidden="true">×</span></button>
    </div></div>`;
  header.before(banner);
  banner.querySelector('.notice-banner__label').href = listPage.href;
  const link = banner.querySelector('.notice-banner__title');
  const counter = banner.querySelector('.notice-banner__counter');
  const toggle = banner.querySelector('[data-notice-pause]');
  const close = banner.querySelector('[data-notice-close]');
  const menu = document.querySelector('.site-nav__toggle');
  const overlay = document.querySelector('#search-overlay');
  const events = new AbortController();
  let posts = [], index = 0, timer = null, transitionTimer = null;
  let paused = reduced.matches, focused = false, suspended = false, destroyed = false;
  let frame = null, tracking = false, refreshVersion = 0;
  function stop() {
    clearTimeout(timer);
    clearTimeout(transitionTimer);
    timer = transitionTimer = null;
    banner.classList.remove('is-changing');
  }
  const canRoll = () => !closed && !destroyed && !suspended && !paused && !focused && !banner.hidden && !banner.inert && !document.hidden && posts.length > 1;
  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (canRoll()) timer = setTimeout(advance, 4000);
  }
  function updateButton() {
    toggle.disabled = posts.length < 2;
    const playing = !paused;
    toggle.textContent = playing ? 'Ⅱ' : '▶';
    toggle.setAttribute('aria-label', posts.length < 2 ? '공지 1개: 자동 전환 없음' : playing ? '공지 자동 전환 일시정지' : '공지 자동 전환 재생');
    toggle.setAttribute('aria-pressed', String(paused));
  }
  function render() {
    const post = posts[index];
    if (!post) return;
    link.textContent = post.title;
    link.title = post.title;
    const target = new URL(detailPage);
    target.searchParams.set('id', post.id);
    link.href = target.href;
    counter.textContent = `${index + 1}/${posts.length}`;
    counter.setAttribute('aria-label', `전체 ${posts.length}개 중 ${index + 1}번째 공지`);
    updateButton();
  }
  function advance() {
    timer = null;
    if (!canRoll()) return;
    const next = () => {
      transitionTimer = null;
      index = (index + 1) % posts.length;
      render();
      banner.classList.remove('is-changing');
    };
    if (reduced.matches) next();
    else {
      banner.classList.add('is-changing');
      transitionTimer = setTimeout(next, 180);
    }
    schedule();
  }
  function hide() {
    stop();
    banner.hidden = true;
    root.classList.remove('has-notice-banner');
  }
  function syncHeader() {
    frame = null;
    if (destroyed || suspended) return;
    const obscured = (overlay && !overlay.hidden) || (menu && menu.getAttribute('aria-expanded') === 'true');
    const changed = banner.inert !== Boolean(obscured);
    banner.inert = Boolean(obscured);
    banner.classList.toggle('is-obscured', Boolean(obscured));
    if (changed) { stop(); schedule(); }
    if (tracking) frame = requestAnimationFrame(syncHeader);
  }
  function requestSync() {
    if (frame === null && !suspended && !destroyed) frame = requestAnimationFrame(syncHeader);
  }
  async function refresh() {
    if (closed || destroyed || suspended) return;
    const version = ++refreshVersion;
    try {
      // No category/search parameters: use the board's canonical order. The
      // existing repository has no pinned-post field; do not invent one here.
      const data = await repository.getList({});
      if (version !== refreshVersion || closed || destroyed || suspended) return;
      const currentId = posts[index]?.id;
      stop();
      posts = data.slice(0, 3);
      if (!posts.length) { hide(); return; }
      index = Math.max(0, posts.findIndex(post => post.id === currentId));
      render();
      banner.hidden = false;
      root.classList.add('has-notice-banner');
      syncHeader();
      schedule();
    } catch {
      // Board errors must not prevent homepage/menu/search interactions.
      if (version === refreshVersion) hide();
    }
  }
  const observer = new MutationObserver(requestSync);
  const resizeObserver = new ResizeObserver(requestSync);
  function observe() {
    observer.observe(header, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    if (menu) observer.observe(menu, { attributes: true, attributeFilter: ['aria-expanded'] });
    if (overlay) observer.observe(overlay, { attributes: true, attributeFilter: ['hidden'] });
    resizeObserver.observe(header);
  }
  const on = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: events.signal });
  on(toggle, 'click', () => { paused = !paused; stop(); updateButton(); schedule(); });
  on(close, 'click', () => {
    const ownsFocus = banner.contains(document.activeElement);
    closed = true;
    refreshVersion++;
    hide();
    if (ownsFocus) header.querySelector('a, button')?.focus({ preventScroll: true });
  });
  on(link, 'focus', () => { focused = true; stop(); });
  on(link, 'blur', () => { focused = false; schedule(); });
  on(window, 'scroll', requestSync, { passive: true });
  on(window, 'resize', requestSync, { passive: true });
  on(header, 'transitionrun', event => { if (event.target === header) { tracking = true; requestSync(); } });
  const endTracking = event => { if (event.target === header) { tracking = false; requestSync(); } };
  on(header, 'transitionend', endTracking);
  on(header, 'transitioncancel', endTracking);
  on(document, 'visibilitychange', () => { stop(); if (!document.hidden) { requestSync(); void refresh(); } });
  on(window, 'storage', event => { if (Object.values(repository.STORAGE_KEYS).includes(event.key) || event.key === null) void refresh(); });
  on(window, 'focus', () => { void refresh(); });
  on(reduced, 'change', () => { if (reduced.matches) paused = true; stop(); updateButton(); schedule(); });
  on(window, 'pagehide', () => {
    suspended = true;
    stop();
    tracking = false;
    cancelAnimationFrame(frame);
    frame = null;
    observer.disconnect();
    resizeObserver.disconnect();
  });
  on(window, 'pageshow', () => { suspended = false; observe(); requestSync(); void refresh(); });
  function destroy() {
    destroyed = true;
    refreshVersion++;
    hide();
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver.disconnect();
    events.abort();
    banner.remove();
  }
  window.HaroNoticeBanner = { refresh, destroy };
  observe();
  requestSync();
  if (!closed) void refresh();
})();
