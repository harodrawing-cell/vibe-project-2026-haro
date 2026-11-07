import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className={'site-footer'}>
      <div className={'site-footer__inner'}>
        <div className={'site-footer__content'}>
          <a
            className={'site-footer__brand'}
            href={'/#top'}
            aria-label={'HARO 맨 위로'}
          >
            {'HARO'}
          </a>
          <p className={'site-footer__description'}>
            {
              '\n            HARO는 오늘도 적당히 덤덤하게 살아가는 고양이의 이야기를 그립니다.\n            바쁘고 피곤한 일상 속에서 “왜?”, “어쩌라구”, “그럴 수도 있지” 하며\n            너무 애쓰지 않고 자기만의 속도로 하루를 살아가는 하로. 이모티콘과\n            그림, 작은 이야기를 통해 우리 모두의 평범한 하루에 가볍게 웃고\n            쉬어갈 순간을 전하고 싶습니다.\n          '
            }
          </p>
          <a
            className={'site-footer__email'}
            href={'mailto:harodrowing@gmail.com'}
          >
            {'\n            harodrowing@gmail.com\n          '}
          </a>
        </div>
        {'\n\n        '}
        <div className={'site-footer__bottom'}>
          <small className={'site-footer__copyright'}>
            {'© 2026 HARO. All rights reserved.'}
          </small>
          <nav className={'site-footer__socials'} aria-label={'공식 SNS'}>
            <a
              href={'https://blog.naver.com/indikang'}
              target={'_blank'}
              rel={'noopener noreferrer'}
              aria-label={'네이버 블로그 (새 탭)'}
            >
              <img
                src={'./images/icons/blog-white.svg'}
                alt={''}
                loading={'lazy'}
              />
            </a>
            <a
              href={'https://www.behance.net/indikang'}
              target={'_blank'}
              rel={'noopener noreferrer'}
              aria-label={'Behance (새 탭)'}
            >
              <img
                src={'./images/icons/behance-white.svg'}
                alt={''}
                loading={'lazy'}
              />
            </a>
            <a
              href={'https://www.instagram.com/liberoflowerpig/'}
              target={'_blank'}
              rel={'noopener noreferrer'}
              aria-label={'Instagram (새 탭)'}
            >
              <img
                src={'./images/icons/instagram-white.svg'}
                alt={''}
                loading={'lazy'}
              />
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
