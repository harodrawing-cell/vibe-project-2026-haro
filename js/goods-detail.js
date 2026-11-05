(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const shop = window.HaroShop;
  if (!shop || !$('product-form')) return;
  const message = (text, focus = false) => { $('shop-message').textContent = text; if (focus) $('shop-message').focus(); };
  let product, busy = false;
  try {
    product = await shop.getProduct(new URLSearchParams(location.search).get('id'));
    if (!product) throw new Error('해당 상품을 찾을 수 없습니다. GOODS 목록에서 상품을 다시 선택해 주세요.');
    document.title = `${product.name} | HARO`;
    $('product-name').textContent = product.name;
    $('product-price').textContent = shop.money(product.price);
    $('product-description').textContent = product.description;
    $('product-main-image').src = shop.assetUrl(product.images[0]);
    $('product-main-image').alt = product.name;
    product.images.forEach((source, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'product-thumbnail';
      button.setAttribute('aria-label', `${product.name} 이미지 ${index + 1} 보기`);
      button.setAttribute('aria-pressed', String(index === 0));
      const image = document.createElement('img');
      image.src = shop.assetUrl(source);
      image.alt = '';
      button.append(image);
      button.addEventListener('click', () => {
        $('product-main-image').src = image.src;
        $('product-thumbnails').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      });
      $('product-thumbnails').append(button);
    });
    product.options.forEach(option => {
      const element = document.createElement('option');
      element.value = option.id;
      element.textContent = option.label;
      $('product-option').append(element);
    });
    for (const text of product.specifications || []) {
      const item = document.createElement('li'); item.textContent = text; $('product-specifications').append(item);
    }
    product.images.slice(1).forEach((source, index) => {
      const image = document.createElement('img');
      image.className = 'product-detail-image'; image.src = shop.assetUrl(source);
      image.alt = `${product.name} 상세 이미지 ${index + 1}`; image.loading = 'lazy';
      $('product-extra-images').append(image);
    });
    $('product-add').disabled = product.price === null;
    $('product-price-note').textContent = product.price === null
      ? '가격 자료가 제공되지 않은 상품입니다. 가격 등록 전에는 장바구니에 담을 수 없습니다.'
      : '첨부 자료에서 확인한 가격입니다. 실제 주문·결제 없이 장바구니만 체험할 수 있습니다.';
    $('product-panel').hidden = false;
    $('product-content').hidden = false;
    message('');
  } catch (error) { message(error.message || '상품 정보를 불러오지 못했습니다.', true); }
  finally { document.body.dataset.shopReady = 'true'; }
  if (!product) return;
  const quantity = () => Number($('product-quantity').value);
  function updateTotal() {
    const count = quantity();
    const valid = Number.isInteger(count) && count >= 1 && count <= shop.MAX_QUANTITY;
    $('product-total').textContent = !valid ? '수량을 확인해 주세요' : shop.money(product.price === null ? null : product.price * count);
    $('product-quantity').setAttribute('aria-invalid', String(!valid));
    $('product-decrease').disabled = !valid || count <= 1;
    $('product-increase').disabled = !valid || count >= shop.MAX_QUANTITY;
  }
  $('product-decrease').addEventListener('click', () => { $('product-quantity').value = quantity() - 1; updateTotal(); });
  $('product-increase').addEventListener('click', () => { $('product-quantity').value = quantity() + 1; updateTotal(); });
  $('product-quantity').addEventListener('input', updateTotal);
  $('product-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    $('product-add').disabled = true;
    try {
      await shop.add(product.id, $('product-option').value, quantity());
      message('장바구니에 담았습니다. 상단 장바구니 아이콘 또는 아래 장바구니 보기로 확인하세요.', true);
      $('product-cart-link').hidden = false;
    } catch (error) { message(error.message, true); }
    finally { busy = false; $('product-add').disabled = product.price === null; }
  });
  updateTotal();
})();
