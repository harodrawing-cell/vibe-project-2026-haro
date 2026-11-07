import { useEffect, useState } from 'react';
import { Swiper } from 'swiper/react';
import { Navigation, Grid, Autoplay, Keyboard, A11y } from 'swiper/modules';
export default function Carousel({ kind, className, children }) {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [gap, setGap] = useState(() =>
    innerWidth <= 768 ? 8 : Math.min(18, Math.max(12, innerWidth * 0.014)),
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const resize = () =>
      setGap(
        innerWidth <= 768 ? 8 : Math.min(18, Math.max(12, innerWidth * 0.014)),
      );
    media.addEventListener('change', motion);
    window.addEventListener('resize', resize);
    return () => {
      media.removeEventListener('change', motion);
      window.removeEventListener('resize', resize);
    };
  }, []);
  const emoticon = kind === 'emoticon';
  return (
    <Swiper
      key={`${kind}-${reduced}`}
      className={className}
      modules={[Navigation, Grid, Autoplay, Keyboard, A11y]}
      loop
      slidesPerView={emoticon ? 2 : 1.1}
      grid={emoticon ? { rows: 2, fill: 'column' } : undefined}
      spaceBetween={emoticon ? gap : 24}
      speed={reduced ? 0 : emoticon ? 600 : 350}
      autoplay={reduced ? false : { delay: 4000, disableOnInteraction: false }}
      keyboard={{ enabled: true, onlyInViewport: true }}
      navigation={{
        prevEl: `[data-${kind}-prev]`,
        nextEl: `[data-${kind}-next]`,
      }}
      a11y={{
        prevSlideMessage: emoticon ? '이전 이모티콘' : '이전 상품',
        nextSlideMessage: emoticon ? '다음 이모티콘' : '다음 상품',
      }}
      breakpoints={
        emoticon
          ? { 769: { slidesPerView: 4, grid: { rows: 1 } } }
          : {
              769: { slidesPerView: 4, spaceBetween: 16 },
              1025: { slidesPerView: 4, spaceBetween: 24 },
              1441: { slidesPerView: 4, spaceBetween: 22 },
            }
      }
    >
      {children}
    </Swiper>
  );
}
