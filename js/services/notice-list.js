(async () => {
  'use strict';
  const common = HaroNoticeCommon, auth = HaroNoticeAuth, repository = HaroNoticeRepository;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const category = common.categories.includes(params.get('category')) ? params.get('category') : '';
  const query = (params.get('q') || '').trim();
  const updateWriteLink = loggedIn => {
    $('notice-write-link').href = loggedIn ? './notice-write.html' : './login.html';
    $('notice-write-link').title = loggedIn ? '공지사항 작성' : '로그인 후 글쓰기를 이용할 수 있습니다.';
  };
  auth.subscribe(user => { updateWriteLink(!!user); });
  $('notice-query').value = query;
  const listUrl = (selected, page = 1) => `./notice-list.html?${new URLSearchParams({ category: selected, q: query, page: String(page) })}`;
  ['', ...common.categories].forEach(value => {
    const link = document.createElement('a');
    link.href = listUrl(value);
    link.className = 'notice-button';
    link.textContent = value || '전체';
    if (category === value) link.setAttribute('aria-current', 'page');
    $('notice-categories').append(link);
  });
  $('notice-search').addEventListener('submit', event => {
    event.preventDefault();
    location.href = `./notice-list.html?${new URLSearchParams({ category, q: $('notice-query').value.trim() })}`;
  });
  try {
    $('notice-list-panel').setAttribute('aria-busy', 'true');
    common.showMessage('공지사항을 불러오는 중입니다.');
    const posts = (await repository.getList({ category })).filter(post => `${post.title} ${post.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    const pages = Math.max(1, Math.ceil(posts.length / 10));
    const page = Math.min(pages, Math.max(1, Math.floor(Number(params.get('page'))) || 1));
    $('notice-count').textContent = `총 ${posts.length}개 · ${page} / ${pages} 페이지`;
    const items = posts.slice((page - 1) * 10, page * 10);
    if (!items.length) {
      const item = document.createElement('li');
      item.textContent = query ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.';
      $('notice-list').append(item);
    }
    items.forEach(post => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = common.detailUrl(post.id);
      link.textContent = post.title;
      const meta = document.createElement('p');
      meta.className = 'notice-meta';
      meta.textContent = common.meta(post);
      item.append(link, meta);
      $('notice-list').append(item);
    });
    const addPage = (number, text, current = false) => {
      const link = document.createElement('a');
      link.className = 'notice-button';
      link.href = listUrl(category, number);
      link.textContent = text;
      if (current) link.setAttribute('aria-current', 'page');
      $('notice-pagination').append(link);
    };
    if (page > 1) addPage(page - 1, '이전');
    for (let number = Math.max(1, page - 2); number <= Math.min(pages, page + 2); number++) addPage(number, String(number), page === number);
    if (page < pages) addPage(page + 1, '다음');
    updateWriteLink(!!(await auth.getUser()));
    common.showMessage(params.get('deleted') === '1' ? '게시글이 삭제되었습니다.' : '');
  } catch (error) {
    common.showMessage(error.message || '공지사항을 불러오지 못했습니다.', true);
  } finally {
    $('notice-list-panel').setAttribute('aria-busy', 'false');
    document.body.dataset.ready = 'true';
  }
})();
