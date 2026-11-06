// Compatibility route for bookmarks from the original single-page NOTICE.
(() => {
  const params = new URLSearchParams(location.search);
  const view = params.get('view') || 'list';
  const pages = { list: 'notice-list.html', detail: 'notice-detail.html', write: 'notice-write.html', edit: 'notice-edit.html' };
  params.delete('view');
  const query = params.toString();
  location.replace('./' + (pages[view] || pages.list) + (query ? '?' + query : ''));
})();
