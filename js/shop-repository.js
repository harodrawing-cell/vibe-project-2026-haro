(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    const base = new URL('../', document.currentScript.src);
    root.HaroShop = api.createRepository({ getStorage: () => root.localStorage,
      loadCatalog: async () => {
        const response = await fetch(new URL('data/products.json', base));
        if (!response.ok) throw new Error('상품 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
        return response.json();
      }, assetUrl: source => new URL(source, base).href });
  }
})(globalThis, function () {
  'use strict';
  const STORAGE_KEY = 'haro-cart-v1';
  const MAX_QUANTITY = 99;
  const money = amount => amount === null ? '가격 미등록' : `${amount.toLocaleString('ko-KR')}원`;
  function createRepository({ getStorage, loadCatalog, assetUrl = value => value }) {
    let catalogPromise = null, queue = Promise.resolve();
    const listeners = new Set();
    const serialize = action => { const result = queue.then(action); queue = result.catch(() => {}); return result; };
    function validateQuantity(quantity) {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new Error('수량은 1~99 사이의 정수로 입력해 주세요.');
    }
    async function getCatalog() {
      if (!catalogPromise) catalogPromise = Promise.resolve().then(loadCatalog).then(data => {
        if (!data || data.currency !== 'KRW' || !Number.isSafeInteger(data.shipping?.fee) || data.shipping.fee < 0 || !Array.isArray(data.products)) throw new Error('상품 데이터 형식이 올바르지 않습니다.');
        const seen = new Set();
        for (const product of data.products) {
          if (!product || typeof product.id !== 'string' || !product.id || seen.has(product.id) || typeof product.name !== 'string' || !product.name ||
              (product.price !== null && (!Number.isSafeInteger(product.price) || product.price < 0)) ||
              !Array.isArray(product.images) || !product.images.length || product.images.some(src => typeof src !== 'string' || !/^images\//.test(src) || src.includes('..')) ||
              !Array.isArray(product.options) || !product.options.length || new Set(product.options.map(option => option.id)).size !== product.options.length ||
              product.options.some(option => !option || typeof option.id !== 'string' || !option.id || typeof option.label !== 'string')) throw new Error('상품 데이터 형식이 올바르지 않습니다.');
          seen.add(product.id);
        }
        return data;
      }).catch(error => { catalogPromise = null; throw error; });
      return catalogPromise;
    }
    function read() {
      let raw;
      try { raw = getStorage().getItem(STORAGE_KEY); }
      catch { throw new Error('장바구니 저장소에 접근할 수 없습니다. 브라우저 설정을 확인해 주세요.'); }
      if (raw === null) return [];
      try {
        const rows = JSON.parse(raw);
        const seen = new Set();
        if (!Array.isArray(rows)) throw new Error();
        for (const row of rows) {
          validateQuantity(row.quantity);
          const key = JSON.stringify([row.productId, row.optionId]);
          if (typeof row.productId !== 'string' || typeof row.optionId !== 'string' || seen.has(key)) throw new Error();
          seen.add(key);
        }
        return rows;
      } catch { throw new Error('저장된 장바구니를 읽지 못했습니다. 원본 데이터는 그대로 유지됩니다.'); }
    }
    function publish() { for (const listener of listeners) { try { listener(); } catch {} } }
    function write(rows) {
      try { getStorage().setItem(STORAGE_KEY, JSON.stringify(rows)); }
      catch { throw new Error('장바구니를 저장하지 못했습니다. 브라우저 저장 공간·설정을 확인해 주세요. 변경사항은 저장되지 않았습니다.'); }
      publish();
    }
    function requireOption(data, productId, optionId) {
      const product = data.products.find(item => item.id === productId);
      if (!product) throw new Error('해당 상품을 찾을 수 없습니다.');
      const option = product.options.find(item => item.id === optionId);
      if (!option) throw new Error('상품 옵션을 선택해 주세요.');
      if (product.price === null) throw new Error('가격이 등록되지 않아 장바구니에 담을 수 없습니다.');
      return { product, option };
    }
    async function getCart() {
      const data = await getCatalog();
      const rows = read();
      const items = rows.map(row => {
        const product = data.products.find(item => item.id === row.productId);
        const option = product?.options.find(item => item.id === row.optionId);
        const available = Boolean(product && option && product.price !== null);
        return { ...row, product: product || null, option: option || null, available, subtotal: available ? product.price * row.quantity : null };
      });
      const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const shipping = items.some(item => item.available) ? data.shipping.fee : 0;
      return { items, quantity, subtotal, shipping, total: subtotal + shipping, hasUnavailable: items.some(item => !item.available) };
    }
    return { STORAGE_KEY, MAX_QUANTITY, money, assetUrl, getCatalog, getCart,
      getProduct: async id => (await getCatalog()).products.find(product => product.id === id) || null,
      getCount: () => read().reduce((sum, row) => sum + row.quantity, 0),
      add: (productId, optionId, quantity) => serialize(async () => {
        validateQuantity(quantity);
        requireOption(await getCatalog(), productId, optionId);
        const rows = read();
        const existing = rows.find(row => row.productId === productId && row.optionId === optionId);
        if (existing) { validateQuantity(existing.quantity + quantity); existing.quantity += quantity; }
        else rows.push({ productId, optionId, quantity });
        write(rows);
      }),
      setQuantity: (productId, optionId, quantity) => serialize(async () => {
        validateQuantity(quantity);
        requireOption(await getCatalog(), productId, optionId);
        const rows = read();
        const row = rows.find(item => item.productId === productId && item.optionId === optionId);
        if (!row) throw new Error('장바구니에서 상품을 찾을 수 없습니다.');
        row.quantity = quantity;
        write(rows);
      }),
      remove: (productId, optionId) => serialize(async () => {
        const rows = read();
        const next = rows.filter(row => row.productId !== productId || row.optionId !== optionId);
        if (next.length === rows.length) throw new Error('장바구니에서 상품을 찾을 수 없습니다.');
        write(next);
      }),
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      notifyExternalChange: publish,
    };
  }
  return { createRepository, STORAGE_KEY, MAX_QUANTITY };
});
