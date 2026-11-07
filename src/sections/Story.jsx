import { Link } from 'react-router-dom';
import StoryGrid from '../components/StoryGrid';

export default function Story() {
  return (
    <section className={'story'} id={'story'} aria-labelledby={'story-title'}>
      <div className={'story__layout'} data-reveal={''}>
        <div className={'story__intro'}>
          <h2 className={'story__title'} id={'story-title'}>
            {'STORY'}
          </h2>
          <span className={'story__rule'} aria-hidden={'true'}></span>
          <h3 className={'story__headline'}>
            {'\n              오늘도 적당히 덤덤한'}
            <br />
            {'\n              현생 고양이 하로\n            '}
          </h3>
          <p className={'story__description'}>
            {
              '\n              팬덤의 공감과 응원 속에 세대를 대변하는 아이콘으로 자리잡고 있는\n              무덤덤의 대표 캐릭터입니다.\n            '
            }
          </p>
          <a
            className={'story__instagram'}
            href={'https://www.instagram.com/liberoflowerpig/'}
            target={'_blank'}
            rel={'noopener noreferrer'}
          >
            {'\n              Instagram\n            '}
          </a>
          <img
            className={'story__character'}
            src={'./images/img-dt/img_5_haro-cat.png'}
            alt={'무덤덤한 표정의 하로 캐릭터'}
            loading={'lazy'}
            decoding={'async'}
          />
        </div>
        {'\n\n          '}
        <StoryGrid />
      </div>
      {'\n\n        '}
      <p
        className={'story__status visually-hidden'}
        data-story-status={''}
        role={'status'}
        aria-live={'polite'}
      >
        {'\n          로컬 인스타툰 이미지 불러오는 중입니다.\n        '}
      </p>
    </section>
  );
}
