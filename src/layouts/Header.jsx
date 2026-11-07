import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import catalog from '../../data/products.json';
export default function Header() {
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const { user, account, error } = useAuth(),
    { cart } = useCart();
  const location = useLocation(),
    navigate = useNavigate();
  const toggle = useRef(null),
    searchToggle = useRef(null),
    input = useRef(null),
    overlay = useRef(null);
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [location]);
  useEffect(() => {
    if (search) input.current?.focus();
    const main = document.getElementById('main-content'),
      footer = document.querySelector('.site-footer');
    if (main) main.inert = search;
    if (footer) footer.inert = search;
    document.body.classList.toggle('search-open', search);
    return () => {
      if (main) main.inert = false;
      if (footer) footer.inert = false;
      document.body.classList.remove('search-open');
    };
  }, [search]);
  useEffect(() => {
    function keydown(event) {
      if (event.key === 'Escape') {
        if (search) {
          setSearch(false);
          searchToggle.current?.focus();
        } else if (menu) {
          setMenu(false);
          toggle.current?.focus();
        }
      }
      if (search && event.key === 'Tab') {
        const controls = [
          ...overlay.current.querySelectorAll(
            'a[href],button:not(:disabled),input',
          ),
        ];
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls.at(-1)?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === controls.at(-1)
        ) {
          event.preventDefault();
          controls[0]?.focus();
        }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [menu, search]);
  async function authAction() {
    if (!user) {
      navigate('/login');
      return;
    }
    setBusy(true);
    try {
      await account.logout();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        본문 바로가기
      </a>
      <header className="site-header" inert={search}>
        <div className="site-header__inner">
          <Link
            className="site-header__brand"
            to="/#top"
            aria-label="HARO 맨 위로"
          >
            HARO
          </Link>
          <button
            ref={toggle}
            className="site-nav__toggle"
            type="button"
            aria-label={menu ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menu}
            aria-controls="site-nav"
            onClick={() => setMenu((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <nav
            className={`site-nav ${menu ? 'is-open' : ''}`}
            id="site-nav"
            aria-label="주요 메뉴"
          >
            {[
              ['ABOUT HARO', '/#about'],
              ['EMOTICON', '/#emoticon'],
              ['STORY', '/#story'],
              ['GOODS', '/#goods'],
              ['NOTICE', '/notice'],
              ['Q&A', '/qna'],
            ].map(([title, to]) => (
              <Link
                key={to}
                className="site-nav__item"
                to={to}
                aria-current={location.pathname === to ? 'page' : undefined}
              >
                {title}
              </Link>
            ))}
          </nav>
          <div className="site-header__actions">
            <button
              ref={searchToggle}
              className="site-search__toggle"
              id="site-search-toggle"
              type="button"
              aria-label="검색 열기"
              aria-controls="search-overlay"
              aria-expanded={search}
              onClick={() => setSearch(true)}
            >
              <img
                className="search-icon"
                src="./images/used/haro-search.png"
                alt=""
                aria-hidden="true"
              />
            </button>
            <Link
              className="site-cart"
              to="/cart"
              aria-label={`장바구니 ${cart?.quantity || 0}개`}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="M2 3h3l2 13h12l3-10H6" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
              <span className="site-cart__badge" hidden={!cart?.quantity}>
                {cart?.quantity > 99 ? '99+' : cart?.quantity || 0}
              </span>
            </Link>
          </div>
          <div className="account-header" title={error}>
            <span className="account-header__welcome" role="status">
              {message || (user ? `${user.name}님 환영합니다` : '')}
            </span>
            <button
              className="account-header__action"
              type="button"
              disabled={busy}
              onClick={authAction}
            >
              {user ? '로그아웃' : '로그인'}
            </button>
          </div>
        </div>
      </header>
      <section
        ref={overlay}
        className="search-overlay"
        id="search-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="사이트 검색"
        hidden={!search}
        inert={!search}
      >
        <div className="search-overlay__topbar">
          <form
            className="search-overlay__form"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="visually-hidden" htmlFor="site-search-input">
              검색어
            </label>
            <input
              ref={input}
              id="site-search-input"
              className="search-overlay__input"
              type="search"
              placeholder="검색어를 입력하세요"
            />
            <img
              className="search-icon search-overlay__icon"
              src="./images/used/haro-search.png"
              alt=""
              aria-hidden="true"
            />
          </form>
          <button
            className="search-overlay__close"
            type="button"
            aria-label="검색 닫기"
            onClick={() => {
              setSearch(false);
              searchToggle.current?.focus();
            }}
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <div className="search-overlay__scroll">
          <div className="search-overlay__content">
            <div className="search-overlay__keywords">
              <section className="search-overlay__history">
                <h2 className="search-overlay__section-title">최근 검색어</h2>
                <p className="search-overlay__empty">최근 검색어가 없습니다</p>
              </section>
              <section className="search-overlay__popular">
                <h2 className="search-overlay__section-title">인기 검색어</h2>
              </section>
            </div>
            <section className="search-overlay__products">
              <h2 className="search-overlay__section-title">GOODS</h2>
              <div className="search-overlay__product-grid">
                {catalog.products.map((p) => (
                  <article className="search-product" key={p.id}>
                    <img src={p.images[0]} alt={p.name} loading="lazy" />
                    <h3>{p.name}</h3>
                  </article>
                ))}
              </div>
              <button
                className="search-overlay__goods-link"
                type="button"
                disabled
              >
                굿즈 보러가기
              </button>
            </section>
          </div>
          <footer className="search-overlay__footer">
            <p className="search-overlay__footer-logo">HARO</p>
            <p className="search-overlay__footer-description">
              HARO는 오늘도 적당히 덤덤하게 살아가는 고양이의 이야기를 그립니다.
            </p>
          </footer>
        </div>
      </section>
    </>
  );
}
