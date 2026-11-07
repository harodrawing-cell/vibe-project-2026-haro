import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Message from '../components/Message';
function Quantity({ item, busy, mutate, shop }) {
  const [value, setValue] = useState(item.quantity);
  return (
    <div className="quantity-control">
      <button
        type="button"
        disabled={busy || !item.available || item.quantity <= 1}
        aria-label={`${item.product?.name} 수량 줄이기`}
        onClick={() =>
          mutate(() =>
            shop.setQuantity(item.productId, item.optionId, item.quantity - 1),
          )
        }
      >
        −
      </button>
      <input
        type="number"
        min="1"
        max="99"
        step="1"
        value={value}
        aria-label={`${item.product?.name} 수량`}
        disabled={busy || !item.available}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (Number(value) !== item.quantity)
            void mutate(() =>
              shop.setQuantity(item.productId, item.optionId, Number(value)),
            ).then(() => setValue(item.quantity));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <button
        type="button"
        disabled={busy || !item.available || item.quantity >= 99}
        aria-label={`${item.product?.name} 수량 늘리기`}
        onClick={() =>
          mutate(() =>
            shop.setQuantity(item.productId, item.optionId, item.quantity + 1),
          )
        }
      >
        +
      </button>
    </div>
  );
}
export default function CartPage() {
  const { cart, error, shop } = useCart(),
    [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  async function mutate(operation) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await operation();
      setMessage('장바구니를 업데이트했습니다.');
    } catch (e) {
      setMessage(e.message);
      setFailed(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main id="main-content" tabIndex={-1} className="shop-page cart-page">
      <h1 className="cart-heading">장바구니</h1>
      <Message error={!!error || failed}>
        {error || message || (!cart ? '장바구니를 불러오는 중입니다.' : '')}
      </Message>
      {!error &&
        cart &&
        (!cart.items.length ? (
          <div className="cart-empty">
            <p>장바구니가 비어 있습니다.</p>
            <Link className="shop-button" to="/#goods">
              GOODS 둘러보기
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section aria-label="장바구니 상품">
              <ul className="cart-items" aria-busy={busy}>
                {cart.items.map((item) => (
                  <li
                    key={JSON.stringify([item.productId, item.optionId])}
                    className="cart-item"
                  >
                    {item.product && (
                      <img
                        className="cart-item__image"
                        src={shop.assetUrl(item.product.images[0])}
                        alt={item.product.name}
                      />
                    )}
                    <div className="cart-item__copy">
                      {item.product ? (
                        <Link
                          className="cart-item__name"
                          to={`/goods?id=${encodeURIComponent(item.productId)}`}
                        >
                          {item.product.name}
                        </Link>
                      ) : (
                        <strong>등록되지 않은 상품</strong>
                      )}
                      <p className="shop-muted">
                        {item.option?.label ||
                          '선택한 옵션이 더 이상 제공되지 않습니다.'}
                      </p>
                      <p className="cart-item__price">
                        {item.available
                          ? shop.money(item.product.price)
                          : '현재 가격·옵션을 확인할 수 없습니다. 이 상품은 합계에서 제외됩니다.'}
                      </p>
                      <Quantity
                        key={item.quantity}
                        item={item}
                        busy={busy}
                        mutate={mutate}
                        shop={shop}
                      />
                    </div>
                    <strong className="cart-item__subtotal">
                      {shop.money(item.subtotal)}
                    </strong>
                    <button
                      className="shop-button shop-button--small cart-item__remove"
                      type="button"
                      disabled={busy}
                      aria-label={`${item.product?.name || '상품'} 장바구니에서 삭제`}
                      onClick={() =>
                        mutate(() => shop.remove(item.productId, item.optionId))
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <aside className="cart-summary">
              <h2>주문 금액</h2>
              <dl>
                <div>
                  <dt>총 수량</dt>
                  <dd>{cart.quantity}개</dd>
                </div>
                <div>
                  <dt>상품 금액</dt>
                  <dd>{shop.money(cart.subtotal)}</dd>
                </div>
                <div>
                  <dt>배송비</dt>
                  <dd>{shop.money(cart.shipping)}</dd>
                </div>
                <div className="cart-summary__total">
                  <dt>총 결제 예정 금액</dt>
                  <dd>{shop.money(cart.total)}</dd>
                </div>
              </dl>
              {cart.hasUnavailable && (
                <p className="shop-muted">
                  가격·옵션을 확인할 수 없는 상품은 합계에서 제외됩니다.
                </p>
              )}
              <div className="shop-actions">
                <button
                  className="shop-button shop-button--primary"
                  type="button"
                  disabled
                  title="실제 결제 및 주문은 제공하지 않습니다"
                >
                  주문·결제 미지원
                </button>
              </div>
              <p className="shop-muted">
                배송비는 상품이 있을 때 주문당 1회 합산합니다.
              </p>
              <Link className="shop-button" to="/#goods">
                계속 둘러보기
              </Link>
            </aside>
          </div>
        ))}
    </main>
  );
}
