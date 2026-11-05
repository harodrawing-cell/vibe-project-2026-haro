(() => {
  'use strict';
  const shop = window.HaroShop;
  const $ = id => document.getElementById(id);
  if (!shop || !$('cart-items')) return;
  let busy = false, version = 0;
  const message = (text, focus = false) => { $('shop-message').textContent = text; if (focus) $('shop-message').focus(); };
  function button(text, label, action) {
    const element = document.createElement('button');
    element.type = 'button'; element.className = 'shop-button shop-button--small';
    element.textContent = text; element.setAttribute('aria-label', label); element.addEventListener('click', action);
    return element;
  }
  async function mutate(operation) {
    if (busy) return;
    busy = true;
    $('cart-items').setAttribute('aria-busy', 'true');
    $('cart-items').querySelectorAll('button,input').forEach(element => { element.disabled = true; });
    try { await operation(); message('장바구니를 업데이트했습니다.'); }
    catch (error) { message(error.message, true); }
    finally { busy = false; await render(); }
  }
  async function render() {
    const current = ++version;
    try {
      const cart = await shop.getCart();
      if (current !== version) return;
      $('cart-items').replaceChildren();
      $('cart-empty').hidden = cart.items.length !== 0;
      $('cart-layout').hidden = cart.items.length === 0;
      for (const item of cart.items) {
        const row = document.createElement('li');
        row.className = 'cart-item';
        row.dataset.productId = item.productId;
        row.dataset.optionId = item.optionId;
        const name = item.product?.name || '등록되지 않은 상품';
        if (item.product) {
          const image = document.createElement('img'); image.className = 'cart-item__image';
          image.src = shop.assetUrl(item.product.images[0]); image.alt = name;
          row.append(image);
        }
        const copy = document.createElement('div'); copy.className = 'cart-item__copy';
        const title = document.createElement(item.product ? 'a' : 'strong');
        title.className = 'cart-item__name'; title.textContent = name;
        if (item.product) title.href = `../goods/goods-detail.html?id=${encodeURIComponent(item.productId)}`;
        const option = document.createElement('p'); option.className = 'shop-muted'; option.textContent = item.option?.label || '선택한 옵션이 더 이상 제공되지 않습니다.';
        const price = document.createElement('p'); price.className = 'cart-item__price'; price.textContent = item.available ? shop.money(item.product.price) : '현재 가격·옵션을 확인할 수 없습니다. 이 상품은 합계에서 제외됩니다.';
        copy.append(title, option, price);
        const controls = document.createElement('div'); controls.className = 'quantity-control';
        const input = document.createElement('input');
        input.type = 'number'; input.min = '1'; input.max = String(shop.MAX_QUANTITY); input.step = '1'; input.value = item.quantity;
        input.setAttribute('aria-label', `${name} 수량`); input.disabled = !item.available;
        const set = count => mutate(() => shop.setQuantity(item.productId, item.optionId, count));
        const decrease = button('−', `${name} 수량 줄이기`, () => set(item.quantity - 1));
        decrease.disabled = !item.available || item.quantity <= 1;
        const increase = button('+', `${name} 수량 늘리기`, () => set(item.quantity + 1));
        increase.disabled = !item.available || item.quantity >= shop.MAX_QUANTITY;
        input.addEventListener('change', () => set(Number(input.value)));
        controls.append(decrease, input, increase);
        copy.append(controls);
        const sum = document.createElement('strong'); sum.className = 'cart-item__subtotal'; sum.textContent = shop.money(item.subtotal);
        const remove = button('×', `${name} 장바구니에서 삭제`, () => mutate(() => shop.remove(item.productId, item.optionId)));
        remove.classList.add('cart-item__remove');
        row.append(copy, sum, remove);
        $('cart-items').append(row);
      }
      $('cart-quantity').textContent = `${cart.quantity}개`;
      $('cart-subtotal').textContent = shop.money(cart.subtotal);
      $('cart-shipping').textContent = shop.money(cart.shipping);
      $('cart-total').textContent = shop.money(cart.total);
      $('cart-unavailable').hidden = !cart.hasUnavailable;
      $('cart-items').setAttribute('aria-busy', 'false');
    } catch (error) {
      if (current !== version) return;
      message(error.message || '장바구니를 불러오지 못했습니다.', true);
      $('cart-layout').hidden = true;
      $('cart-empty').hidden = true;
    } finally { document.body.dataset.shopReady = 'true'; }
  }
  shop.subscribe(() => { if (!busy) void render(); });
  window.addEventListener('pageshow', () => { void render(); });
  void render();
})();
