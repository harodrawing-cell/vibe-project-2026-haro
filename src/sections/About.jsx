import { Link } from 'react-router-dom';

export default function About() {
  return (
    <section className={'about'} id={'about'} aria-labelledby={'about-title'}>
      <h2 className={'about__title'} id={'about-title'} data-reveal={''}>
        {'ABOUT HARO'}
      </h2>
      <span className={'about__rule'} aria-hidden={'true'}></span>
      {'\n\n        '}
      <div className={'about__paws'} aria-hidden={'true'}>
        <img
          className={'about__paw about__paw--one'}
          src={'./images/used/paw-print-a.svg'}
          alt={''}
          data-reveal={''}
        />
        <img
          className={'about__paw about__paw--two'}
          src={'./images/used/paw-print-b.svg'}
          alt={''}
          data-reveal={''}
        />
        <img
          className={'about__paw about__paw--three'}
          src={'./images/used/paw-print-a.svg'}
          alt={''}
          data-reveal={''}
        />
        <img
          className={'about__paw about__paw--four'}
          src={'./images/used/paw-print-b.svg'}
          alt={''}
          data-reveal={''}
        />
      </div>
      {'\n\n        '}
      <div className={'about__layout'}>
        <div className={'about__portrait'} data-reveal={''}>
          <img
            className={'about__character'}
            src={'./images/used/haro-dt-7.png'}
            alt={'무덤덤한 표정으로 서 있는 고양이 하로'}
            loading={'lazy'}
            decoding={'async'}
          />
        </div>
        {'\n\n          '}
        <div className={'about__copy'} data-reveal={''}>
          <h3 className={'about__copy-title'}>
            {'\n              하로는 오늘도'}
            <br />
            {'\n              적당히 버티는'}
            <br />
            {'\n              무덤덤한 고양이에요.\n            '}
          </h3>
          <p className={'about__description'}>
            {'\n              박스 안의 아늑함을 가장 좋아하며'}
            <br className={'about__desktop-break'} />
            {'\n              늘 순간 순간 적당한 하루를 보내요.'}
            <br className={'about__desktop-break'} />
            {
              '\n              오늘도 하로와 함께 소소한 행복을 느껴보세요.\n            '
            }
          </p>
        </div>
      </div>
    </section>
  );
}
