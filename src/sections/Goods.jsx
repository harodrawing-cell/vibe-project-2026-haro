import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel';
import { SwiperSlide } from 'swiper/react';

export default function Goods() {
  return (
    <section className={'goods'} id={'goods'} aria-labelledby={'goods-title'}>
      <h2 className={'goods__title'} id={'goods-title'} data-reveal={''}>
        {'GOODS'}
      </h2>
      <span className={'goods__rule'} aria-hidden={'true'}></span>
      {'\n\n        '}
      <div
        className={'goods__carousel'}
        role={'group'}
        aria-label={'굿즈 상품 캐러셀'}
      >
        <button
          className={'goods__arrow goods__arrow--prev'}
          type={'button'}
          data-goods-prev={''}
          aria-label={'이전 상품'}
        >
          <span aria-hidden={'true'}></span>
        </button>
        {'\n\n          '}
        <Carousel kind="goods" className="goods__viewport swiper">
          <SwiperSlide className="goods-card">
            <Link className={'goods-card__link'} to={'/goods?id=lazy-sticker'}>
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_14_item-1.png'}
                alt={'쿠션 위에서 늘어져 자는 하로 스티커'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'귀찮니스트 (79x79mm) _ sticker'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
          <SwiperSlide className="goods-card">
            <Link
              className={'goods-card__link'}
              to={'/goods?id=narcissism-sticker'}
            >
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_15_item-2.png'}
                alt={'튜브 위에 누워있는 하로 스티커'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'나르니시즘 (79x79mm) _ sticker'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
          <SwiperSlide className="goods-card">
            <Link className={'goods-card__link'} to={'/goods?id=ramen-sticker'}>
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_16_item-3.png'}
                alt={'라면을 먹는 하로 스티커'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'라면인건가요 (79x79mm) _ sticker'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
          <SwiperSlide className="goods-card">
            <Link className={'goods-card__link'} to={'/goods?id=beam-sticker'}>
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_17_item-4.png'}
                alt={'빔을 쏘는 하로 만화컷 스티커'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'받아라 빔 (79x79mm) _ sticker'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
          <SwiperSlide className="goods-card">
            <Link className={'goods-card__link'} to={'/goods?id=relax-sticker'}>
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_18_item-5.png'}
                alt={'상품 이미지 업로드 전'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'이런 여유 좋고 (79x79mm) _ sticker'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
          <SwiperSlide className="goods-card">
            <Link
              className={'goods-card__link'}
              to={'/goods?id=matatabi-sticker'}
            >
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_19_item-6.png'}
                alt={'상품 이미지 업로드 전'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'Matatabi Tea (79x79mm) _ sticker'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
          <SwiperSlide className="goods-card">
            <Link className={'goods-card__link'} to={'/goods?id=haro-note'}>
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_20_item-7.png'}
                alt={'상품 이미지 업로드 전'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'Haro Note (105 × 148mm)'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
          <SwiperSlide className="goods-card">
            <Link
              className={'goods-card__link'}
              to={'/goods?id=sticky-cleaner'}
            >
              <img
                className={'goods-card__media'}
                src={'./images/img-dt/img_21_item-8.png'}
                alt={'상품 이미지 업로드 전'}
                loading={'lazy'}
                decoding={'async'}
              />
              <div className={'goods-card__copy'}>
                <h3 className={'goods-card__title'}>
                  {'Sticky Cleaner (3.3 × 3.3mm)'}
                </h3>
              </div>
            </Link>
          </SwiperSlide>
        </Carousel>
        {'\n\n          '}
        <button
          className={'goods__arrow goods__arrow--next'}
          type={'button'}
          data-goods-next={''}
          aria-label={'다음 상품'}
        >
          <span aria-hidden={'true'}></span>
        </button>
      </div>
      {'\n\n        '}
      <a
        className={'goods__shop-link'}
        href={'https://marpple.shop/kr/mandaco'}
        target={'_blank'}
        rel={'noopener noreferrer'}
        data-reveal={''}
      >
        {'\n          굿즈 보러가기\n        '}
      </a>
    </section>
  );
}
