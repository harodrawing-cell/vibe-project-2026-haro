(() => {
  'use strict';
  const shop = window.HaroShop;
  const header = document.querySelector('.site-header__inner');
  if (!shop || !header || header.querySelector('.site-cart')) return;
  const url = new URL('../pages/cart/cart.html', document.currentScript.src);
  const link = document.createElement('a');
  link.className = 'site-cart';
  link.href = url.href;
  link.setAttribute('aria-label', '장바구니');
  link.innerHTML = '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 3h3l2 13h12l3-10H6"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg><span class="site-cart__badge" hidden></span>';
  const search = header.querySelector('.site-search__toggle');
  if (search) {
    const actions = document.createElement('div');
    actions.className = 'site-header__actions';
    search.before(actions);
    actions.append(search, link);
  } else header.append(link);
  const badge = link.querySelector('span');
  function update() {
    try {
      const count = shop.getCount();
      badge.hidden = count === 0;
      badge.textContent = count > 99 ? '99+' : String(count);
      link.setAttribute('aria-label', `장바구니, 상품 ${count}개`);
      link.removeAttribute('title');
    } catch (error) {
      badge.hidden = true;
      link.setAttribute('aria-label', '장바구니 저장 상태 확인 필요');
      link.title = error.message;
    }
  }
  shop.subscribe(update);
  window.addEventListener('storage', event => { if (event.key === shop.STORAGE_KEY || event.key === null) shop.notifyExternalChange(); });
  window.addEventListener('pageshow', update);
  update();
})();
