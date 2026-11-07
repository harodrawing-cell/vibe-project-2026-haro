import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel';
import { SwiperSlide } from 'swiper/react';

export default function Emoticon() {
  return (
    <section
      className={'emoticon'}
      id={'emoticon'}
      aria-labelledby={'emoticon-title'}
    >
      <h2 className={'emoticon__title'} id={'emoticon-title'} data-reveal={''}>
        {'EMOTICON'}
      </h2>
      <span className={'emoticon__rule'} aria-hidden={'true'}></span>
      {'\n\n        '}
      <div className={'emoticon__carousel'}>
        <button
          className={'emoticon__arrow emoticon__arrow--prev'}
          type={'button'}
          data-emoticon-prev={''}
          aria-label={'Previous emoticon'}
        >
          <span aria-hidden={'true'}></span>
        </button>
        <Carousel kind="emoticon" className="emoticon__gallery swiper">
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_6_tile-1.png'}
              alt={'하로 고양이 이모티콘'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_7_tile-2.png'}
              alt={'몽돌·부싯돌 이모티콘'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_8_tile-3.png'}
              alt={'캐릭터 블로그 구분선 이미지'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_9_tile-4.png'}
              alt={'블로그용 리뷰·예약·주차 구분선 이미지'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_10_image-1.png'}
              alt={'HARO emoticon 5'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_11_image-2.png'}
              alt={'HARO emoticon 6'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_12_image-3.png'}
              alt={'HARO emoticon 7'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
          <SwiperSlide className="">
            <img
              className={'emoticon__image'}
              src={'./images/img-dt/img_13_image-4.png'}
              alt={'HARO emoticon 8'}
              loading={'lazy'}
              decoding={'async'}
            />
          </SwiperSlide>
        </Carousel>
        <button
          className={'emoticon__arrow emoticon__arrow--next'}
          type={'button'}
          data-emoticon-next={''}
          aria-label={'Next emoticon'}
        >
          <span aria-hidden={'true'}></span>
        </button>
      </div>
      {'\n\n        '}
      <p className={'emoticon__description'} data-reveal={''}>
        {'\n          오늘도 적당히 덤덤한 하로'}
        <br />
        {'\n          네이버 OGA에서 만나보세요!\n        '}
      </p>
      {'\n\n        '}
      <div className={'emoticon__actions'} data-reveal={''}>
        <a
          className={'emoticon__button'}
          href={
            'https://ogqmarket.naver.com/search/artworks/stickers?keyword=%EB%A6%AC%EB%B2%A0%EB%A1%9C%EA%BD%83%EB%8F%BC%EC%A7%80'
          }
          target={'_blank'}
          rel={'noopener noreferrer'}
        >
          {'\n            OGQ 이모티콘\n          '}
        </a>
        <button
          className={'emoticon__button'}
          type={'button'}
          disabled={true}
          aria-disabled={'true'}
        >
          {'\n            카카오 이모티콘\n          '}
        </button>
      </div>
    </section>
  );
}
