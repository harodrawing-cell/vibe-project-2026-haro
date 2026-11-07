import { Component, useEffect, useRef } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Header from './layouts/Header';
import Footer from './layouts/Footer';
import Hero from './sections/Hero';
import About from './sections/About';
import Emoticon from './sections/Emoticon';
import Story from './sections/Story';
import Goods from './sections/Goods';
import NoticeBanner from './components/NoticeBanner';
import BoardList from './pages/BoardList';
import BoardDetail from './pages/BoardDetail';
import BoardForm from './pages/BoardForm';
import AccountPage from './pages/AccountPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import useReveal from './hooks/useReveal';
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="react-error">
        <h1>화면을 표시하지 못했습니다.</h1>
        <p>{this.state.error.message}</p>
        <a href="./react.html">다시 열기</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Home() {
  const ref = useRef(null);
  useReveal(ref);
  return (
    <>
      <NoticeBanner />
      <main ref={ref} id="main-content" tabIndex={-1}>
        <Hero />
        <About />
        <Emoticon />
        <Story />
        <Goods />
      </main>
    </>
  );
}
export default function App() {
  const location = useLocation();
  useEffect(() => {
    const title = location.pathname.startsWith('/qna')
      ? 'Q&A'
      : location.pathname.startsWith('/notice')
        ? 'NOTICE'
        : location.pathname === '/cart'
          ? 'CART'
          : location.pathname === '/login'
            ? 'LOGIN'
            : location.pathname === '/signup'
              ? 'SIGN UP'
              : 'HARO';
    document.title = `${title} — HARO`;
    const timer = setTimeout(() => {
      const id = location.hash.slice(1);
      if (id) document.getElementById(id)?.scrollIntoView();
      else window.scrollTo(0, 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [location]);
  return (
    <ErrorBoundary>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        {['notice', 'qna'].map((board) => (
          <Route key={board} path={board}>
            <Route
              index
              element={
                <BoardList key={`${board}-list`} qna={board === 'qna'} />
              }
            />
            <Route
              path="detail"
              element={
                <BoardDetail key={`${board}-detail`} qna={board === 'qna'} />
              }
            />
            <Route
              path="write"
              element={
                <BoardForm key={`${board}-write`} qna={board === 'qna'} />
              }
            />
            <Route
              path="edit"
              element={
                <BoardForm
                  key={`${board}-edit`}
                  qna={board === 'qna'}
                  editing
                />
              }
            />
          </Route>
        ))}
        <Route path="login" element={<AccountPage key="login" />} />
        <Route path="signup" element={<AccountPage key="signup" signup />} />
        <Route path="goods" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route
          path="*"
          element={
            <main className="react-error" id="main-content">
              <h1>페이지를 찾을 수 없습니다.</h1>
              <Link to="/">홈으로</Link>
            </main>
          }
        />
      </Routes>
      <Footer />
    </ErrorBoundary>
  );
}
