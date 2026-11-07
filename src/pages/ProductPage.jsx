import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Message from '../components/Message';
export default function ProductPage() {
  const [params] = useSearchParams(),
    id = params.get('id'),
    { shop } = useCart();
  const [product, setProduct] = useState(null),
    [image, setImage] = useState(''),
    [option, setOption] = useState(''),
    [quantity, setQuantity] = useState(1),
    [message, setMessage] = useState('상품 정보를 불러오는 중입니다.'),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [added, setAdded] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setProduct(null);
    setAdded(false);
    setError(false);
    setQuantity(1);
    shop
      .getProduct(id)
      .then((value) => {
        if (!active) return;
        if (!value) throw new Error('해당 상품을 찾을 수 없습니다.');
        setProduct(value);
        setImage(value.images[0]);
        setOption('');
        setMessage('');
      })
      .catch((e) => {
        if (active) {
          setMessage(e.message);
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [id, shop]);
  async function add(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      await shop.add(id, option, Number(quantity));
      setAdded(true);
      setMessage('장바구니에 담았습니다.');
    } catch (e) {
      setMessage(e.message);
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main id="main-content" tabIndex={-1} className="shop-page">
      <nav className="shop-breadcrumb" aria-label="현재 위치">
        <Link to="/#goods">GOODS</Link> › 상품 상세
      </nav>
      <Message error={error}>{message}</Message>
      {product && (
        <>
          <section className="product-panel" aria-labelledby="product-name">
            <div className="product-gallery">
              <div
                className="product-thumbnails"
                role="group"
                aria-label="상품 이미지 선택"
              >
                {product.images.map((src, i) => (
                  <button
                    className="product-thumbnail"
                    key={src}
                    type="button"
                    aria-label={`상품 이미지 ${i + 1}`}
                    aria-pressed={image === src}
                    onClick={() => setImage(src)}
                  >
                    <img src={shop.assetUrl(src)} alt="" />
                  </button>
                ))}
              </div>
              <img
                className="product-main-image"
                src={shop.assetUrl(image)}
                alt={product.name}
              />
            </div>
            <div className="product-info">
              <h1 id="product-name">{product.name}</h1>
              <p className="product-price">{shop.money(product.price)}</p>
              <form onSubmit={add}>
                <fieldset className="product-form-fieldset" disabled={busy}>
                  <div className="product-field">
                    <label htmlFor="product-option">옵션</label>
                    <select
                      id="product-option"
                      value={option}
                      onChange={(e) => setOption(e.target.value)}
                      required
                    >
                      <option value="">옵션을 선택해 주세요</option>
                      {product.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="product-field">
                    <label htmlFor="product-quantity">수량</label>
                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label="상품 수량 줄이기"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity(Number(quantity) - 1)}
                      >
                        −
                      </button>
                      <input
                        id="product-quantity"
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        inputMode="numeric"
                        required
                      />
                      <button
                        type="button"
                        aria-label="상품 수량 늘리기"
                        disabled={quantity >= 99}
                        onClick={() => setQuantity(Number(quantity) + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="product-total">
                    <span>총 상품금액</span>
                    <strong>
                      {shop.money(
                        product.price === null
                          ? null
                          : product.price * (Number(quantity) || 0),
                      )}
                    </strong>
                  </div>
                  <p className="shop-muted">
                    {product.price === null
                      ? '가격이 등록되지 않아 장바구니에 담을 수 없습니다.'
                      : ''}
                  </p>
                  <p className="shop-muted">
                    배송비: 3,000원 (수업용 합계 계산 기준)
                  </p>
                  <div className="shop-actions">
                    <button
                      className="shop-button shop-button--primary"
                      type="submit"
                      disabled={
                        product.price === null ||
                        !option ||
                        !Number.isInteger(Number(quantity)) ||
                        quantity < 1 ||
                        quantity > 99
                      }
                    >
                      {busy ? '담는 중…' : '장바구니 담기'}
                    </button>
                    <button
                      className="shop-button"
                      type="button"
                      disabled
                      title="실제 구매는 제공하지 않습니다"
                    >
                      바로 구매 (미지원)
                    </button>
                  </div>
                </fieldset>
              </form>
              {added && (
                <p>
                  <Link className="shop-button" to="/cart">
                    장바구니 보기
                  </Link>
                </p>
              )}
            </div>
          </section>
          <div className="product-content">
            <nav className="product-tabs" aria-label="상품 정보">
              {[
                ['product-details', '상품 상세'],
                ['purchase-guide', '구매 안내'],
                ['product-reviews', '리뷰 · 팬레터'],
              ].map(([anchor, title]) => (
                <a
                  key={anchor}
                  href={`#${anchor}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document
                      .getElementById(anchor)
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {title}
                </a>
              ))}
            </nav>
            <section id="product-details" className="product-section">
              <h2>상품 상세</h2>
              <p>{product.description}</p>
              <ul>
                {product.specifications.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              {product.images.slice(1).map((src) => (
                <img
                  className="product-detail-image"
                  key={src}
                  src={shop.assetUrl(src)}
                  alt={product.name}
                  loading="lazy"
                />
              ))}
            </section>
            <section id="purchase-guide" className="product-section">
              <h2>구매 안내</h2>
              <p>
                옵션과 수량을 선택한 뒤 장바구니에 담아 보세요. 같은 상품과
                옵션은 수량이 합산됩니다.
              </p>
              <p>
                이 페이지는 수업용입니다. 실제 결제·주문·배송 및 외부 쇼핑몰
                연동은 제공하지 않습니다. 표시된 배송비는 장바구니 합계 계산
                연습에만 사용합니다.
              </p>
              <p>
                가격 미등록 상품은 확인된 가격이 JSON에 등록된 후 장바구니에
                담을 수 있습니다.
              </p>
            </section>
            <section id="product-reviews" className="product-section">
              <h2>리뷰 · 팬레터</h2>
              <p className="shop-muted">
                등록된 리뷰나 팬레터가 없습니다. 이 수업용 화면에서는 작성
                기능을 제공하지 않습니다.
              </p>
            </section>
          </div>
        </>
      )}
      <p>
        <Link className="shop-button" to="/#goods">
          GOODS 목록으로
        </Link>
      </p>
    </main>
  );
}
