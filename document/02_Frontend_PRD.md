# [문서 02] 프론트엔드 개발용 PRD

## 1. 기술 스택 및 에셋 구조 명세
- **Markup & Styling**: HTML5, Vanilla CSS3 (Custom CSS Properties, Flexbox, Grid, Media Queries)
- **Script/Animation**: JavaScript (ES6+), GSAP (GreenSock Animation Platform) 라이브러리 연동[cite: 1]
- **Font 시스템**: 
  - `Pretendard` (웹폰트 로컬/CDN 연동)[cite: 1, 9]
  - 커스텀 폰트 `Cafe24Syongsyong` 지원 (`index.css`)[cite: 7]

## 2. 모듈별 컴포넌트 아키텍처
- **Layout & Tokens (`tokens.css`, `base.css`, `layout.css`)**:
  - `--content-max-width: 1200px` 기준 중앙 정렬 컨테이너[cite: 8]
  - 부드러운 스크롤 (`scroll-behavior: smooth`) 적용[cite: 4]
- **Interactive Components**:
  - `box-interaction.js`: GSAP 타임라인을 활용한 12프레임 스프라이트/이미지 스와핑 제어[cite: 1, 5]
  - `scroll-animations.js`: IntersectionObserver 기반 순차적 리빌(`[data-reveal]`) 제어[cite: 1, 8]
  - `goods-carousel.js`: 상품 트랙 좌우 네비게이션 스크롤 계산 로직[cite: 1, 10]

## 3. 반응형 제약 및 뷰포트 규칙
- **Breakpoints**: 
  - Desktop: `1025px ~`
  - Tablet: `861px ~ 1024px`
  - Mobile: `~ 860px` (네비게이션 햄버거 메뉴 활성화 기준)[cite: 6]
- **단일 DOM 반응형 전략**: 레이아웃 변화 시 요소를 중복 생성하지 않고 CSS Grid/Flexbox와 미디어 쿼리를 통해 유동적 재배치 수행[cite: 5, 10]