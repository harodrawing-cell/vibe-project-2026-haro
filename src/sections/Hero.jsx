import { useEffect, useRef, useState } from 'react';
const frames = Array.from(
  { length: 12 },
  (_, i) =>
    `./images/box-animation/transparent/BOX_${String(i + 1).padStart(3, '0')}.png`,
);
export default function Hero() {
  const [ready, setReady] = useState(false),
    [phase, setPhase] = useState('closed'),
    [frame, setFrame] = useState(0),
    [error, setError] = useState('');
  const animation = useRef(0);
  useEffect(() => {
    let active = true;
    Promise.all(
      frames.map((src) => {
        const image = new Image();
        image.src = src;
        return image.decode();
      }),
    )
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setError('상자 애니메이션 이미지를 불러오지 못했습니다.');
      });
    return () => {
      active = false;
      cancelAnimationFrame(animation.current);
    };
  }, []);
  useEffect(() => {
    let previous = window.scrollY;
    const onScroll = () => {
      if (window.scrollY > previous && phase === 'open') {
        setPhase('closed');
        setFrame(0);
      }
      previous = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [phase]);
  function open() {
    if (!ready || phase !== 'closed') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame(11);
      setPhase('open');
      return;
    }
    setPhase('opening');
    const start = performance.now();
    const tick = (now) => {
      setFrame(Math.min(11, Math.floor((now - start) / 125)));
      if (now - start >= 1500) setPhase('open');
      else animation.current = requestAnimationFrame(tick);
    };
    animation.current = requestAnimationFrame(tick);
  }
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__room" aria-hidden="true" />
      <div className="hero__content">
        <h1 className="hero__title" id="hero-title">
          HARO
        </h1>
        <p className="hero__tagline">오늘도 적당히 덤덤하게</p>
      </div>
      <div className="hero__interaction" aria-label="상자 인터랙션 미리보기">
        <p className="hero__prompt">열어볼래?</p>
        <button
          className="hero__button-look"
          type="button"
          aria-controls="hero-box"
          aria-label={
            phase === 'open'
              ? '하로가 상자에서 나왔습니다'
              : '상자를 열어 하로 만나기'
          }
          disabled={!ready || phase !== 'closed'}
          onClick={open}
        >
          CLICK
        </button>
        <p
          className="hero__scroll-hint"
          aria-live="polite"
          hidden={phase !== 'open' && !error}
        >
          {error || '스크롤해서 하로를 만나보세요'}
        </p>
      </div>
      <div
        className={`hero-box ${phase === 'opening' ? 'is-opening' : phase === 'open' ? 'is-open' : ''}`}
        id="hero-box"
      >
        <img
          className="hero-box__image"
          id="hero-box-frame"
          src={frames[frame]}
          alt={
            phase === 'open' ? '상자에서 고개를 내민 하로' : '닫힌 HARO 상자'
          }
          fetchPriority="high"
        />
      </div>
    </section>
  );
}
