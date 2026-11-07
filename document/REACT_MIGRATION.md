# HARO React 전환 분석

분석일: 2026-11-07. STEP 1 정적 분석 결과이며 React 구현·브라우저 검증 완료를 의미하지 않는다.

## 작업 경계

- 현재 `vibe-project-2026-haro-react` 루트를 React 대상 프로젝트로 사용한다. 사용자 첫 지시를 우선하여 `haro-react/`를 만들지 않는다.
- 기존 index.html, pages/, css/, js/, data/, images/ 및 Firebase/배포 설정을 보존한다. 운영 원격 저장소를 수정하거나 배포하지 않는다.
- 원본 index.html을 보존해야 하므로 React 개발 진입점은 루트의 별도 HTML(예: react.html)로 구성하고, 빌드 결과에서만 index.html을 생성하는 구성을 사용한다. Vite 템플릿을 비어 있지 않은 루트에 강제로 생성하지 않는다.

## 확인 문서와 불일치

README → task-history/task.md → spec-kit/AGENTS.md 존재 여부 → HARO_SpecKit → document의 PRD 및 GOODS_CART/NOTICE_Firebase/QNA 문서를 확인했다.
spec-kit/AGENTS.md는 실제 파일이 없다. README의 파일 트리는 실제 구조와 다르다. 과거 PRD의 GSAP 및 860px 모바일 기준은 현재 구현과 구별해야 한다. 현재 코드와 최신 요청의 1024/768px 기준을 우선한다.
task-history/task.md에는 기존 병합 충돌 표시가 여러 곳 남아 있다. 이 작업에서는 기존 기록을 정리하거나 삭제하지 않는다.

## 구조 및 기능

| 영역 | 현재 소스 | 전환 시 유지할 동작 |
|---|---|---|
| 공통 UI | index.html, 각 pages HTML, js/main.js, account-header.js, cart-header.js | 메뉴 토글, Escape, 검색 오버레이, 로그인/로그아웃, 장바구니 배지 |
| HERO | js/main.js, images/box-animation/transparent | BOX_001.png~BOX_012.png 순서, 프레임당125ms(총1.5초), 선로딩, 아래 스크롤 시 초기화, 모션 감소 설정 |
| 메인 섹션 | index.html, css/sections.css | ABOUT, EMOTICON, STORY, GOODS, FOOTER의 클래스·구조·반응형 |
| 슬라이더 | js/main.js | Swiper12 기반 EMOTICON/GOODS. React Swiper로 전환하고 기존 간격·속도·그리드·조작 유지 |
| STORY | js/story-adapter.js, story-feed.js, data/story.json | 중복 없는 랜덤4개와 유효한 인스타그램 게시물 연결 |
| NOTICE | js/services/notice-{common,firebase,list,detail,form,banner}.js | 목록/검색/폼/첨부/CRUD, UID 기반 작성자·관리자 권한, 최신3개/4초 배너, 정지/닫기 |
| 계정 | js/services/account-service.js, account-page.js, notice-auth.js | 아이디를 내부 인증 주소로 변환, 실제 이메일 프로필 보관, 중복확인, 가입 후 로그아웃, 로그인 오류별 안내 |
| Q&A | js/services/qna-{common,repository,page}.js | 5유형, 7개 페이지, 공개 제목검색, 작성자 수정/삭제, 관리자 답변, 비공개 보호 |
| GOODS/CART | js/shop-repository.js, goods-detail.js, cart-page.js, data/products.json | 상품8개, 수량1~99, haro-cart-v1 저장 형식, 합계 및 배송비3000원 |

정적 자산: images 아래 PNG118개, SVG17개, JPG40개. CSS는 tokens/base/layout/components/box/sections 및 account/notice/notice-banner/qna/shop으로 분리되어 있다. 기존 로딩 순서와 상대경로를 보존하여 React용 복사본 또는 import 구성을 만든다.

## Firebase 및 보안

- 기존 프로젝트는 haro-web-project. 웹 SDK12.6.0을 동적 CDN import하고 공유 클라이언트를 캐시한다. React에서는 npm SDK와 단일 초기화 서비스 및 AuthContext로 통합한다.
- NOTICE는 notices, Q&A는 qnaList/qnaDetails/qnaAnswers를 사용한다. 공개 메타와 실제 비공개 내용을 분리한 데이터 구조 및 원자적 쓰기를 유지한다.
- 관리자 판정은 보호된 users/{uid}.role:admin 또는 admins/{uid}.enabled:true이다. STEP 2에서 실제 규칙의 isAdmin 함수를 재확인하여 admins 전용이라는 초기 분석을 정정했다. 일반 클라이언트의 관리자 role 생성·프로필 수정은 서버 규칙에서 차단한다. 기존 firestore.rules와 인덱스는 변경·게시하지 않는다.
- VITE_ 변수는 공개 빌드에 포함된다. Firebase 웹 설정만 취급하고 서비스 계정·관리자 비밀키를 넣지 않는다.
- 신규 가입/게시글 생성 및 실제 데이터 변경은 정적 분석에서 수행하지 않았다. 운영 서버에 게시된 규칙과 실계정 동작은 미검증이다.

## 미완성·미사용 구분

- 검색 오버레이는 열기/닫기 UI가 있으나 submit은 preventDefault만 수행한다. 통합 검색 구현 완료로 취급하지 않는다.
- 실제 결제/주문/배송은 없다. 노트4500원 이외 7개 상품 가격은 null이며 담기 금지를 유지한다.
- 가상 인증 이메일 방식이므로 실제 이메일 인증/자동 비밀번호 재설정은 없다. 현재 수동 복구 문의 안내를 유지한다.
- HERO는 이미지 교체 방식이며 별도 Canvas 패키지를 쓰지 않는다. STEP 2에서 notice-common.js의 첨부 이미지 WebP 변환에 Canvas/getContext 사용을 확인하여 초기 미발견 기록을 정정했다.
- api/는 과거 Cloud Functions 자료이며 현재 firebase.json에 functions 설정이 없다. React 번들에 포함하지 않고 보존한다.
- notice-data.js, notice-repository.js 등 과거 로컬 게시판 모듈은 활성 Firebase 서비스와 구분하여 import 참조를 추가 점검한다. 삭제하지 않는다.
- 기존 이력의 Pages 배포 성공 여부, 실제 Firestore 규칙 게시, iPhone Safari 동작은 현재 검증 결과가 아니다.

## 구현 및 검증 계획

1. Node/npm 준비 후 임시 템플릿에서 Vite React JavaScript 구성을 생성하고 필요한 파일만 현재 루트에 추가한다.
2. src 아래 layouts/components/sections/pages/hooks/services/contexts/styles로 분리한다. 기존 전역 UI 스크립트를 그대로 재실행하는 방식은 피하고 이벤트·타이머·구독을 effect 정리와 연결한다.
3. 정적 호스팅을 고려해 HashRouter와 상대 base를 기본 후보로 사용한다. 기존 HTML 주소는 원본으로 남겨 비교에 사용하고 React 내부 링크는 Router로 연결한다.
4. 1920/1024/768/390px에서 원본과 비교한다. Firebase 쓰기는 테스트 대역/에뮬레이터를 우선하며 실계정·운영 데이터 검증은 별도로 표시한다.
5. build/preview, 자산404, 라우트 직접 접근/새로고침을 검사하고 dist와 실행 문서를 준비한다. 운영 배포 설정은 교체하지 않는다.

## 개발 환경 확인 및 다음 단계

현재 PowerShell에서 node/npm/git 명령을 찾지 못했다. 일반적인 Program Files/nodejs 등 설치 위치에서도 실행 파일을 확인하지 못했으며, 시스템 전체 미설치로 단정하지 않는다.
Vite 공식 요구사항은 Node20.19+ 또는22.12+이다: https://vite.dev/guide/
Node 공식 Windows ZIP을 프로젝트 로컬 도구 폴더에 풀어 세션에서만 사용하는 방식이면 시스템 PATH/레지스트리를 변경하지 않아도 된다. 설치 승인 후 호환 LTS를 선택하고 체크섬 및 node/npm 버전을 확인한다.
사용자 요청 4항에 따라 Node 설치는 승인 전 수행하지 않는다. 아직 의존성 설치, Vite 생성, 개발 서버, 브라우저 비교, 프로덕션 빌드를 실행하지 않았다.

## 후속 진행(2026-11-08)

위 환경 미준비 기록은 STEP 1 당시 상태다. 사용자 설치 후 Node26.13.0/npm11.20.0을 확인하고 STEP 2~8을 진행했다. React 개발 주소는 http://127.0.0.1:5173/react.html, 빌드 미리보기는 http://127.0.0.1:4173/ 이다. 실행 방법은 ../README.react.md, 실제 검증 결과와 남은 실계정·실기기 검증은 REACT_VALIDATION.md를 따른다. 운영 배포와 GitHub push는 하지 않았다.

## 최종 검증 — 2026-11-08(KST)

**배포 판정: 보류.** React 렌더링·빌드 경로·쇼핑/애니메이션 검증은 통과했으나, 실제 Firebase에서 비공개 Q&A 문서의 비로그인 조회가 허용되는 중대 문제를 확인했다. 이전 단계의 테스트 대역 통과를 실제 서버 권한 검증 완료로 해석하면 안 된다.

### 1. 두 주소의 실제 React 렌더링

| 주소 | 직접 관찰한 증거 | 판정 |
|---|---|---|
| `http://127.0.0.1:5173/react.html` | `#root`의 React container, main의 React Fiber, Home/App/AuthProvider/CartProvider/HashRouter 조상 트리, `/src/main.jsx` 로드, HERO 상태 변경 | 실제 개발용 React |
| `http://127.0.0.1:4173/` | `#root`의 React container/Fiber, `/assets/react-B9A-SPc9.js` 로드, HERO 상태 변경. `/js/main.js` 로드 없음 | 실제 빌드된 React |
| `http://127.0.0.1:5173/` | 원본 HTML과 `/js/main.js`, React root 없음 | 의도적으로 보존된 원본 |

빌드의 컴포넌트 이름은 minify되어 개발용 이름과 다르지만 React Fiber와 상태 변경은 동일하다. HTML 안에 React처럼 보이는 문자열만 있는지 보는 검사에 그치지 않았다.

개발 진입점이 react.html인 이유는 원본 index.html을 덮어쓰지 않기 위해서다. vite.config.mjs는 react.html을 빌드 입력으로 사용하고 **dist 안에서만 index.html로 변경**한다. 최종 호스팅의 document root를 dist로 지정하면 **`/`에서 React 사용이 가능**하며 preview4173에서 이미 그 구성을 확인했다. 소스 프로젝트 전체를 그대로 기존 Pages에 올리는 것과 다르다. 기존 Pages 브랜치 배포를 그대로 사용하면 원본 index.html이 계속 진입점이 될 수 있다.

React 내부 주소는 `/#/notice` 같은 HashRouter 형식이다. 도메인 루트 `/` 진입은 가능하지만 `/notice` 같은 해시 없는 직접 경로를 지원한다는 뜻은 아니다. 하위 경로 `/haro/`에서도 자산과7개 해시 라우트 직접 접근·새로고침 검사를 통과했다. 기존 HTML URL을 위한 운영 리디렉트는 아직 없다.

### 2. 디자인 비교: 원본 ↔ React

동일한 Edge, 동일한1920/1024/768/390px, 비로그인/빈 장바구니·빈 게시판 대역 및 고정 랜덤 조건에서28개 원본/React 쌍을 캡처했다. 이는56개 화면이며 실제 운영 게시글 내용을 캡처한 결과가 아니다. 메인 스크롤 등장 효과와 지연 이미지를 로드한 뒤 비교했다. React 쪽 가로 넘침은0건이었다.

| 영역 | 확인한 차이 | 판단 |
|---|---|---|
| 메인 HERO/ABOUT/EMOTICON/STORY/GOODS | 네 너비에서 각 섹션의 시작 위치·높이 동일. 원본 이미지·색상·레이아웃 유지 | 주요 디자인 보존 |
| HEADER/일반 FOOTER | 비교한 캡처에서 주요 배치·색상·아이콘 유지 | 주요 디자인 보존; 모든 상태의 픽셀 일치는 별개 |
| NOTICE 목록 | React 안내에서 `NOTICE 안내` 강조 문구와 breadcrumb 생략, 빈 상태 문구 차이. main 높이 차이는1920/1024px에서 약−21.59px,768px에서0px,390px에서−19.8px | 원본 동일성 보완 대상 |
| Q&A 목록 | 주요 배치·main 높이 동일. 빈 상태 `등록된 질문이 없습니다` → `등록된 게시글이 없습니다` | 문구 차이 |
| LOGIN | 비교한 기본 화면의 main 문구 동일, 높이 차이 약+0.41px | 미세한 렌더링 차이 |
| SIGN UP | 헤딩 설명 변경, 비밀번호6자 도움말 생략, 이메일 인증 미지원 설명/로그인 링크 추가. 카드/main 높이 약+32.81px | 승인 없이 달라진 안내·배치 보완 대상 |
| GOODS 상세 | 원본은 첫 옵션 자동 선택/즉시 담기 가능. React는 `옵션을 선택해 주세요` 상태이며 선택해야 담기 가능. 상단 수업용 안내와 확인된 가격 안내 문구 생략 | 동작·콘텐츠 차이; 원본 동작 복원 또는 명시적 합의 필요 |
| GOODS 높이 | main 높이 차이:1920px −80.09px /1024px −131.87px /768px −108.48px /390px −153.97px | 동일 CSS 사용만으로 동일 화면이라고 볼 수 없음 |
| CART | breadcrumb·수업용/브라우저 저장 안내 생략. 빈 상태 문구와 둘러보기 버튼 primary 클래스 차이. 최소 높이 때문에 main 총높이는 같음 | 안내/버튼 디자인 보완 대상 |
| 검색 오버레이 | 상품명이 원본의 짧은 이름·플레이스홀더에서 실제 긴 상품명으로 바뀌어 줄바꿈·카드 높이 증가. 하단 긴 브랜드 설명·이메일·SNS 아이콘3개·copyright 생략 | 콘텐츠 누락 및 모바일 세로 배치 차이 |
| STORY 접근성 | 새 StoryGrid 상태 안내 외에 이전 `로컬 인스타툰 이미지 불러오는 중입니다` aria-live 문구가 DOM에 남음 | 화면 밖 보조 안내 중복. 완료 후의 잘못된 로딩 안내 제거 필요 |

390px 가입/상품/검색 원본·React 캡처를 직접 확인했다. 변경 요청이 최종 검증이므로 이번에는 위 차이를 수정하지 않고 기록했다. 테스트 대역은 기존 서버·데이터를 수정하지 않기 위한 비교 조건이다.

### 3. 실제 Firebase 읽기 및 권한 검증

테스트 대역을 사용하지 않는 별도 Edge 임시 컨텍스트에서 실제 **haro-web-project/(default)**에 연결했다. 실사용자 브라우저 프로필·세션·장바구니를 사용하지 않았다. 신규 가입, 로그인 시도, 게시글·답변 저장/수정/삭제, 보안 규칙 게시를 하지 않았다. 결과 파일에는 게시글 제목·본문·작성자·UID·문서 ID를 저장하지 않고 개수·공개 여부·HTTP 결과만 남겼다.

| 항목 | 실제 서버 결과 | 판정 |
|---|---|---|
| Auth 초기화/비로그인 상태 | 초기화 완료, signedIn:false | 확인 |
| NOTICE 목록 | 서버 조회7개 | 실제 읽기 연결 확인 |
| Q&A 공개 목록 | 서버 조회2개, 비공개 메타의 제목/작성자 마스킹 및 본문·답변 미포함 확인 | 공개 메타 구조 확인 |
| 공개 Q&A 상세 | 실제 문서 조회 성공 | 확인 |
| 비공개 Q&A 상세 | **isPublic:false 문서가 비로그인 SDK에서 읽힘** | **권한 실패** |
| 비공개 Q&A 상세 REST | Authorization 헤더 없음, credentials:omit 요청에도 **HTTP200 / isPublic:false** | **서버 보호 실패 재확인** |
| 해당 비공개 질문 답변 REST | 같은 무인증 조건에서 **HTTP200** | **서버 보호 실패** |
| React의 비공개 상세 가드 | 실제 해당 문서 ID로 getById를 호출하면 작성자/관리자 전용 안내로 거부 | 클라이언트 가드는 동작하지만 서버 차단은 실패 |
| dev/build 실제 목록 화면 | 두 주소 모두 NOTICE `총7개`, Q&A `총2개` 렌더링 확인 | 실제 서버 데이터를 표시함 |
| users/admins의 존재하지 않는 감사용 ID 읽기 | permission-denied가 아닌 정상 응답 exists:false | 로컬 규칙의 비로그인 차단 기대와 다름. 실제 회원 문서를 읽었다는 의미는 아님 |
| 실제 계정 로그인·가입 | 테스트 계정 미제공, 가입은 실제 Auth/Firestore 변경을 수반하므로 미실행 | 미완료 |
| 작성자/타인/관리자 쓰기 권한 | 운영 문서 변경 금지 조건으로 실제 쓰기 미실행. 기존 대역·서비스 검증만 통과 | 서버 쓰기 권한 미검증 |

**배포 전 최우선 문제:** 로컬 firebase/firestore.rules의 qnaReadable 함수는 비공개 문서를 작성자/관리자만 읽도록 되어 있으나, 실제 배포 서버의 읽기 결과는 그 정책과 다르다. React의 클라이언트 가드만으로 서버 자료 보호를 대신할 수 없다. Firebase Console의 실제 `(default)` 규칙, 광범위한 allow read/wildcard, 게시된 버전과 데이터 공개 플래그를 관리자가 확인해야 한다. 잘못된 규칙의 정확한 위치/게시 이력은 콘솔을 보지 못했으므로 단정하지 않는다. 규칙 변경·배포는 이번 작업에서 하지 않았다.

실제 데이터를 변경하지 않으면서 로그인·가입·쓰기 권한까지 모두 검증했다고 보고할 수는 없다. 전용 검증 계정과 별도 테스트 데이터/에뮬레이터 사용 범위를 정한 뒤 방문자/본인/타인/관리자와 비공개 직접 API 접근을 다시 검증해야 한다. 기존 데이터의 공개 설정을 임의로 바꾸지 않는다.

### 4. GOODS·장바구니·Swiper·HERO

- dev5173과 build4173을 각각 새 임시 브라우저 컨텍스트에서 검사했다. 운영 Firebase 요청은 차단했다.
- 노트 옵션 선택 후2개 담기: localStorage `haro-cart-v1`의1개 행/quantity2, 헤더 배지2 확인. 새로고침 후에도2 유지. 장바구니에서3개로 증가하면 배지3, 상품금액13500원+배송비3000원=16500원. 실사용자 브라우저 저장소는 변경하지 않았다.
- 가격 미등록 상품 담기 차단, 수량/삭제/동일 옵션 합산은 기존52개 화면·서비스 검사에서 재확인했다.
- EMOTICON/GOODS 모두 다음0→1, 이전1→0 인덱스 이동 확인. 같은 페이지의1920→390→1024→768→1920px 전환도 통과했다. 실제 손가락 터치는 미검증이다.
- 실제 DOM 이미지 변경을 기록하여 **BOX_001~012의12개 프레임 순서**를 dev/build 각각 확인했다. 이번 최종 측정의 전체 재생은 개발 약1510ms, 빌드 약1518ms. 소스 목표125ms/프레임과 일치하는 약1.5초 재생이며 스케줄링에 따른 수ms 차이가 있다. 스크롤 후 초기화와 모션 감소 최종 프레임도 확인했다.
- npm test5개 통과(원본229개 파일 SHA-256 보존 포함). 기존 브라우저52개 화면 조합과 주요 대역 기반 기능 검사 재실행 통과. dist 이미지175개 동일성, 하위 경로7개 라우트/새로고침/자산404없음 재확인. 이 결과는 실제 Firebase 권한 실패를 상쇄하지 않는다.

### 5. 실제 iPhone에서 남은 체크리스트

Safari와 카카오톡 인앱 브라우저에서 각각 다음을 확인한다. 현재 결과는 Edge이며 iPhone 실기기 검증으로 간주하지 않는다.

- CLICK 기본/터치/포커스/비활성 글자색, WebKit text fill, 첫 터치 한 번의 HERO 시작과12컷 이미지 decode.
- 가로/세로 회전, Safari 주소창 높이 변화, 노치·safe-area, 고정 헤더/배너 및100vh 화면 잘림.
- 메뉴·검색 열고 닫기, 배경 스크롤 잠금, 닫은 뒤 포커스 복귀, 키보드 표시 시 입력란 가림/자동 확대.
- Swiper 손가락 스와이프, 세로 스크롤과의 충돌, 화살표 터치 영역, 화면 회전 후 중복 슬라이드/오류.
- 스토리지 제한·사생활 보호 모드의 오류 안내, 장바구니 새로고침/앱 재진입 및 배지 복원.
- 보안 문제 해결 후 전용 계정으로 로그인 유지·로그아웃·가입 완료·본인/타인/관리자·비공개 직접 접근. 일반/모션 감소 설정, VoiceOver의 STORY 로딩 안내도 확인.

### 6. 미완료와 배포 전 조치 구분

| 구분 | 항목 | 다음 조치 |
|---|---|---|
| **배포 차단** | 실제 서버에서 비공개 Q&A 본문/답변 무인증 열람 가능 | 관리자 Console 규칙 검토·별도 승인된 규칙 적용 후 SDK와 무인증 REST 모두 permission-denied인지 재검증 |
| 배포 전 보완 | 검색 하단 콘텐츠/상품·장바구니 안내 누락, 가입 문구·간격, 상품 옵션 초기 동작, STORY 잘못된 로딩 안내 | 원본에 맞게 React만 보완하거나 변경사항에 대한 명시적 합의 후 재검증 |
| 검증 미완료 | 실계정 로그인/가입, 본인·타인·관리자 서버 쓰기 권한, 실제 iPhone | 전용 계정·별도 테스트 데이터/에뮬레이터와 실기기에서 수행 |
| 배포 준비 확인 | dist를 사이트 루트 또는 프로젝트 하위 경로에 올릴 대상/절차, 이전 HTML URL 호환, 도메인·인증 환경 | 운영 설정을 바꾸기 전에 계획 검토. 현재 push/배포 없음 |

반복 실행용 감사 코드: tests/react-final-readonly.cjs(실제 서버 읽기), tests/react-design-audit.cjs(대역 기반 원본 비교), tests/react-interactions-final.cjs(격리 저장소/실제 React 인터랙션). 증거: test-results/react-final/readonly-report.json, design-report.json, interactions-report.json 및 캡처. 이 디렉터리는 gitignore 대상이다. 기존 HTML/CSS/JS/JSON/이미지/Firebase 설정·규칙과 React 앱 소스·빌드는 이번 감사에서 수정하지 않았다.

## Q&A 보안 수정 후보 및 Emulator 검증 — 2026-11-08(KST)

**현재 판정: 로컬 전체 규칙 준비/테스트 완료, 운영 미적용이므로 실서버 보안 문제 해결 완료는 아님.** 운영 규칙 게시와 GitHub/React 배포는 승인 전 진행하지 않았다.

### 실제 원인과 운영 규칙 확인

사용자가 Firebase Console에서 현재 운영 규칙이 **2026-12-06까지 모든 문서 읽기·쓰기를 허용**한다고 확인했다. 로컬 firestore.rules의 제한과 실제 서버 정책이 달랐던 것이 원인이다. 광범위한 허용 match에 다른 제한을 추가하거나 마지막에 deny를 덧붙이는 것으로는 허용을 취소할 수 없으므로, 전체 허용 정책을 제거한 전체 파일로 교체해야 한다.

실서버 무인증 REST를 다시 확인했다. 비공개 상세 isPublic:false/실제 제목9자·본문38자, 해당 답변본문39자가 HTTP200 응답 fields에 들어 있었다. Authorization/Firebase ID Token/OAuth/서비스 계정 없이 credentials:omit로 호출했다. 길이·필드 존재만 증거에 저장했고 개인 내용/UID/문서ID는 기록하지 않았다. 서비스 계정의 규칙 우회로 발생한 오탐이 아니다. 실제 운영 쓰기는 하지 않았으며 쓰기 허용은 사용자 Console 확인 정보다.

관리 API는403/PERMISSION_DENIED로 운영 규칙 원문을 반환하지 않았다. 사용자에게서 정책 설명은 받았지만 전체 코드 문자열은 받지 않았다. 따라서 정확한 운영 원문 백업 완료로 표시하지 않는다. **게시 전 Console 원문을 별도 파일로 복사하는 단계가 남아 있다.**

### 전체 후보 코드와 백업

- 전체 Console 게시 후보: [firebase/firestore.rules](../firebase/firestore.rules). NOTICE/회원/Q&A/기본 거부까지 포함한다.
- 수정 전 로컬 전체 백업: [local-before.rules](../firebase/backups/20261108/local-before.rules). SHA-256 e70b9f36741c6ec13d22a4f760b5930f554bb4ba038cd1fc5f38feb526e6ecfc.
- 운영 원문 백업과 로컬 백업은 서로 다르며, 상세 상태는 firebase/backups/20261108/README.md에 기록했다.
- 적용 설명/전후 비교/권한표/테스트/Console 절차: [QNA_SECURITY_FIX.md](QNA_SECURITY_FIX.md).

### 변경 전후와 유지 범위

기존 로컬 qnaReadable(d)는 상세 isPublic 또는 본인/관리자를 확인했다. 후보 qnaReadable(id,d)는 **상세와 공개목록이 둘 다 공개일 때만** 비로그인 공개 읽기를 허용한다. 불일치는 비공개로 취급하고 본인/관리자만 읽는다. qnaDetails/qnaAnswers는 get만, list는 명시적으로 차단했다. 미등록 경로는 기본 거부이며 날짜 기반 전체 allow가 없다.

NOTICE와 계정/관리자 규칙 블록은 로컬 원본과 동일함을 테스트로 검증했다. users는 자기 프로필 읽기 및 role:user 신규 생성만, usernames/emails는 중복확인용 정확한 키 읽기와 자기 UID 예약만, 목록 및 클라이언트 수정/삭제는 거부한다. 보호된 role:admin 또는 admins.enabled:true만 관리자다. 회원의 UID/관리자 권한 위조는 차단한다.

기존 구조대로 질문 생성 시 빈 답변 자리 문서를 함께 만들며, 실제 답변 작성/수정/내용삭제는 관리자만 가능하다. 질문 작성자의 전체 질문 삭제는3개 문서를 원자적으로 정리한다. 기존 답변 수정은 답변 작성 관리자만 가능하다는 기존 정책을 유지한다.

React/원본 HTML·CSS·JS·JSON·이미지·회원 계정·게시글·장바구니 형식·firebase.json은 변경하지 않았다. 원본 보존 테스트는 이번에 승인된 firestore.rules 변경만 별도로 취급하며, 기존 전체 백업 해시와 NOTICE/계정 블록 동일성을 검사하도록 갱신했다.

### 실제 Emulator 결과

로컬127.0.0.1:8089, demo 프로젝트에서 **27개 통과**: NOTICE6 + 기존Q&A7 + 보안14. 준비 작업 외 실제 테스트 요청에는 서비스 계정이나 규칙 우회 토큰을 사용하지 않았다.

| 필수 테스트 | 결과 |
|---|---|
| 1 비로그인 공개 질문·답변 읽기 | 허용 |
| 2 비로그인 비공개 질문·답변 읽기 | 차단 |
| 3 타 회원 비공개 질문·답변 읽기 | 차단 |
| 4 작성자 자기 비공개 읽기 | 허용 |
| 5 관리자 비공개 읽기 | role/admins 방식 모두 허용 |
| 6 비로그인 질문 생성 | 차단 |
| 7 회원 자기 질문 생성·수정·삭제 | 허용 |
| 8 회원 타인 질문 수정·삭제 | 차단 |
| 9 회원 답변 작성·상태 위조 | 차단 |
| 10 관리자 답변 작성·수정·내용삭제 | 허용 |

REST도 Emulator 서버에서 검사했다. 무인증 공개 읽기200, 무인증/타인 비공개 본문·답변403/PERMISSION_DENIED/fields없음, 본인/관리자200. 인증 REST에는 로컬 Emulator 전용 unsigned 사용자 토큰을 썼으며 서비스 계정이나 특수 Bearer owner 우회는 사용하지 않았다. UID/role위조, 목록에 실제제목/본문 삽입, 잘못된 공개플래그 조합, 보호컬렉션 전체조회/미등록경로쓰기 차단도 통과했다.

최초 보안 테스트의 이미 answered인 문서에 answered를 다시 쓰는 no-op을 실패해야 한다고 잡은 테스트를 수정했다. 실제 불일치 waiting 상태 위조 요청은 거부됨을 확인했다. 이는 운영 권한 완화를 위해 규칙을 바꾼 것이 아니다.

회귀36개, React 브라우저52개 화면·HERO/Swiper/장바구니/계정·NOTICE/Q&A 대역 기능, npm run build 통과. 증거: test-results/security/emulator-tests.log 및 live-before.json, test-results/react/report.json. 테스트 도구/JRE/CLI는 OS임시폴더에 격리했으며 전역 설정은 변경하지 않았다. Emulator는 테스트 후 종료했다.

### 운영 적용 전 남은 단계

1. Console 현재 전체 규칙 원문을 실제로 백업하고 후보와 비교한다.
2. 전체 후보/테스트 결과에 대한 운영 규칙 게시 승인을 받는다.
3. 승인 후 haro-web-project/(default) Rules를 후보 **전체로 교체**하고 전체 허용 정책을 남기지 않는다. 데이터·계정·인덱스·Hosting은 변경하지 않는다.
4. 서버 반영 후 비공개 본문/답변의 무인증 REST403과 공개읽기200을 재확인한다. 전용 계정의 본인/타인/관리자 권한과 가입·쓰기는 승인된 테스트 데이터 범위에서 검증한다.
5. 실제 iPhone 및 이전에 기록한 디자인 차이 확인을 완료하고, React 사이트 배포는 별도 승인 후 진행한다.

아직 운영 규칙을 게시하지 않아 기존 서버의 HTTP200 노출은 해결됐다고 보고할 수 없다. 현재 제공물은 **Emulator 검증을 통과한 전체 규칙과 적용 절차**다.

## 사용자 게시 완료 알림 후 실서버 읽기 전용 검증 — 2026-11-08 01:19~01:22 KST

사용자가 최종 규칙을 Console에 게시했다고 알려 실제 haro-web-project/(default)를 검사했다. **현재 실제 응답은 여전히 비공개 접근 허용이며 보안 검증 실패/React 배포 보류다.** 위의 미게시 설명은 후보 준비 당시의 이력이다. Console 게시 자체가 없었다고 단정하지 않으며, 현재 적용된 원문·대상·반영 상태는 관리 인증이 없어 직접 확인하지 못했다.

### 실제 실행 결과

| 항목 | 결과 | 판정 |
|---|---|---|
| 비로그인 qnaDetails SDK 조회 | isPublic:false 실제 문서 읽기 성공 | 실패 |
| 비로그인 비공개 본문 REST | HTTP200, 실제 content필드38자/제목9자 포함 | 실패, 기대는403/내용없음 |
| 비로그인 해당 답변 REST | HTTP200, 실제 content필드39자 포함 | 실패, 기대는403/내용없음 |
| NOTICE 공개 조회 |7개 서버조회, dev/build 실제 목록에도총7개 | 정상 |
| Q&A 공개 목록 |2개 서버조회, dev/build 실제 목록에도총2개, 비공개 메타마스킹 유지 | 정상 |
| 공개 Q&A 상세 | 서버조회 성공 | 정상 |
| React 비공개 getById 가드 | 작성자/관리자 전용 오류로 거부 | UI/서비스 가드 정상, 서버 보안과 구분 |
| Auth 초기화·비로그인 상태 | 초기화 완료, signedIn:false | 확인한 범위 정상 |
| 가입용 ID 중복확인 읽기 | 합성 감사용ID를 실제서비스 checkId로 조회완료 | 확인한 범위 정상 |
| 가입용 이메일 중복확인 읽기 | 합성 감사용키의 정확문서조회 완료, exists:false | 확인한 범위 정상 |
| users/admins 비로그인 감사용 존재하지않는문서 | permission-denied가 아닌 정상exists:false | 로컬후보의 접근거부 정책과 불일치. 실제 회원정보 조회를 의미하지는 않음 |

### 브라우저와 독립 REST 교차 확인

- 새 Edge 임시 컨텍스트에서 tests/react-final-readonly.cjs를 실행했다. 실제 운영 SDK와 REST를 사용했으며 인증·DB 서비스 대역은 없었다. 보고서에는 개인 제목·본문·작성자·문서ID를 저장하지 않았다.
- 별도 Node 프로세스의 scripts/verify-live-qna-rest.cjs에서도 직접 Firestore REST를 호출했다. API키·SDK·브라우저프로필·Authorization·쿠키·Firebase ID Token·서비스계정이 모두 없고 Cache-Control:no-cache/credentials:omit를 사용했다.
- 독립 REST를 다시 실행한 최종 기록은 **2026-11-08 01:21:59 KST**, 서버응답Date는01:21:57 KST이다. 비공개 본문/답변 모두200 및내용필드존재, privateReadBlocked:false였다. 새프로세스 요청에서도 재현되어 기존브라우저의 화면캐시만으로 설명할 수 없다.
- 실제 서버에 읽기만 했으며 신규계정·로그인시도·글/답변 생성수정삭제·규칙게시·인덱스변경을 하지 않았다. writes 차단가드의 mutation요청기록은빈배열이다.

### 미검증 및 다음 확인

- 테스트계정/권한토큰이 없어 실계정 로그인 성공·인증유지·본인/타인/관리자 서버읽기는 미검증이다. 초기화·중복확인조회 정상만으로 로그인전체정상이라고 보고하지 않는다.
- 회원가입 및 글/답변쓰기 권한은 데이터변경이므로 운영에서 실행하지 않았다. 이전 Emulator27개 통과 결과와 운영검증을 구분한다.
- 실제 Console에서 **haro-web-project / (default)**를 대상으로 후보전체를게시했는지, 날짜기반 또는다른광범위allow가남아있는지, 게시된정확한원문·시간·상태를확인해야한다. 대상착오/불완전교체/반영지연 등 구체원인은 현재 증거만으로단정하지않는다.
- 로컬후보SHA256은 여전히c7098adb43f76171f35bd7c1bb84f0e43ac18f831964f5b8728c2de33a2ae644다. Console원문을확보해전체비교하고 필요한 조치를 별도 검토해야한다. 이번 작업에서 추가 규칙수정·게시는하지않았다.
- 증거: test-results/security/production-postpublish-browser.json, production-postpublish-rest.json 및production-postpublish-browser-run.log. 재실행코드: tests/react-final-readonly.cjs, scripts/verify-live-qna-rest.cjs. 기존Firebase데이터/사용자계정은불변이며 GitHub Push 및React배포도실행하지않았다.


## 2026-11-08 Account privacy and permission review

See [full review](SECURITY_REVIEW_20261108.md). Auth/Firestore Emulator: 30/30 passed; regression: 36/36 passed. Production read-only check at 01:34:33 KST: private Q&A body and answer SDK denied, REST403, no content fields; public NOTICE7 and Q&A2 readable, private metadata masked. This supersedes earlier200 observations. New reservation read restrictions are local only; production administrator legitimacy audit, real account login and writes remain unverified. No production data/rules changes, push or deployment.


## 2026-11-08 Production administrator audit and release checklist

Prepared [operator checklist](PRODUCTION_SECURITY_CHECKLIST.md): read-only audit of both administrator sources, approved remediation and backup, Console-versus-local full-text comparison, postpublish G/A/B/M account test matrix, and residual privacy backlog AUTH-PRIVACY-01. Exact production rules equality and administrator legitimacy remain unverified. Previous Emulator30/regression36 and production private REST403 results are historical evidence, not newly rerun or full production acceptance. No account/data/rule mutations, push or deployment.


## 2026-11-08 Latest published rules: production read-only verification

[Execution report](LATEST_PUBLISH_VERIFICATION.md): 01:51:00 KST fresh Edge session; private Q&A body/answer SDK permission-denied and unauthenticated REST403, content absent. Public NOTICE7/Q&A2 and masked private metadata confirmed. Guest profile/admin reads denied, synthetic signup availability lookups succeeded. Actual login/admin identities not tested (no test credentials); signup and CRUD not run (production mutation prohibited). Production rules source equality not independently verified. No production data/account/rules modifications, push or deployment. Evidence: test-results/security/latest-publish-readonly.json and latest-publish-readonly.log.


## 2026-11-08 Member/admin operational acceptance procedure

Prepared [member/admin test and cleanup guide](MEMBER_ADMIN_ACCEPTANCE.md), covering existing login/session, dedicated signup, A/B/G private reads, owner CRUD, admin answer and answered/waiting transitions, dedicated test IDs and approval-based cleanup. No production tests or mutations were executed in this documentation step. Prior evidence remains Emulator30/regression36 and production read-only at 01:51 KST. Real login/signup and authenticated permissions/writes/cleanup remain pending; administrator audit and exact deployed-source comparison remain pending. No production data/account changes, push or React deployment.


## 2026-11-08 Member A real-browser acceptance: PASS (user-reported)

User confirmed all five checks passed: A login; session retained after reload; private Q&A creation and Firebase save; owner private-detail read; public list title masked. These are completed user-executed production checks, not agent-observed automated results. See [result and next steps](MEMBER_A_TEST_RESULT.md). Exact execution time and test document ID were not supplied. B private access denial and M answer create/edit/remove with answered/waiting transitions remain pending. Other untested items remain pending. Only the user-created test question is in scope for eventual separately agreed cleanup; no data/account/rule changes, deletions, push or deployment were performed by the agent.


## 2026-11-08 Member B private-question access: PASS (user-reported)

User logged in as member B and confirmed the body of member A private Q&A question could not be viewed. Mark this specific check as passed by actual user browser testing, not agent-observed automation. See [B test result](MEMBER_B_TEST_RESULT.md). Exact execution time/document ID/server status were not supplied. Answer access and post-answer recheck are not inferred. Pending: A question edit/delete; M answer create/edit/remove and answered/waiting transitions. Complete M tests before deleting only the exact A-owned user-created test question. No production data/account/rule modifications or deletions, GitHub push or React deployment by the agent.

## 2026-11-08 실제 브라우저 Q&A 검증 완료 보고 추가

기록일 및 사용자 실행 완료 보고일: **2026-11-08(KST)**. 사용자가 회원 Q&A 4단계와 회원 B 접근 차단 테스트를 모두 실행 완료했다고 보고했다. 에이전트 직접 실행 결과와 구분한다. 정확한 실행 시각·문서 ID는 전달받지 않았다. 기존 기록은 유지한다.

| 테스트 항목 | 검증 결과 | 검증 완료일 및 확인 범위 |
|---|---|---|
| 회원 B의 회원 A 비공개 질문 본문 접근 차단 | **PASS** | 2026-11-08. 앞선 사용자 보고에서 본문 열람 불가를 명시적으로 확인했고 이번에 실행 완료를 재보고함 |
| 회원 A 본인 질문 수정·저장 | 실행 완료 보고 / 판정 확인 필요 | 실행 완료 보고일 2026-11-08. 저장 반영·새로고침 후 유지 여부가 이번 보고에 명시되지 않아 PASS 완료일 미확정 |
| 관리자 M 답변 등록·수정 및 답변완료 상태 | 실행 완료 보고 / 판정 확인 필요 | 실행 완료 보고일 2026-11-08. 답변 저장·수정 반영 및 answered 전환의 항목별 실제 결과 확인 필요 |
| 관리자 M 답변 삭제 및 답변대기 상태 | 실행 완료 보고 / 판정 확인 필요 | 실행 완료 보고일 2026-11-08. 답변 비움·waiting 전환의 실제 결과 확인 필요 |
| 회원 A 테스트 질문 삭제 및 목록 반영 | 실행 완료 보고 / 판정 확인 필요 | 실행 완료 보고일 2026-11-08. 삭제 성공·목록 반영의 실제 결과 확인 필요 |

확인된 기능은 기존 사용자 보고의 회원 A 로그인·세션 유지·비공개 질문 작성/저장·본인 열람·목록 제목 마스킹과 회원 B 본문 접근 차단이다. 이번 메시지에는 나머지 4단계의 개별 정상/실패 결과가 명시되지 않았다. 실패가 보고된 항목은 없으나, 실패 보고가 없다는 이유로 PASS를 추정하지 않는다. 4단계 모두 기대 동작이 정상임을 사용자에게 확인받으면 판정과 완료일을 추가 기록한다.

추가 검증 사항: 질문 삭제 시 qnaList/qnaDetails/qnaAnswers의 고아 문서 없음, 관리자 답변 이후 B의 답변 접근 차단, 신규 회원가입, 관리자 권한 정당성·예약문서 오염 감사, Console 원문과 로컬 규칙 일치, 잔여 개인정보 과제 AUTH-PRIVACY-01 및 기존 실제 iPhone/디자인 검증. 이 항목들을 이번 실행 완료 보고만으로 통과 처리하지 않는다. 전체 운영 보안 검증 완료 판정은 보류한다.

이번 작업은 문서 추가만 수행했다. 기존 운영 데이터·회원 계정·규칙 변경 및 삭제, GitHub Push·React 배포는 하지 않았다.

## 2026-11-08 회원 Q&A 실제 브라우저 검증 최종 확정 — 5개 모두 PASS

**검증 완료일: 2026-11-08(KST). 최종 결과: 5개 항목 모두 PASS, 오류 없음.** 사용자가 직접 실행한 실제 브라우저 테스트 결과를 명시적으로 확정했다. 에이전트가 재실행하거나 직접 관찰한 결과와 구분한다. 이전 기록은 보존하며, 앞선 4개 항목의 ‘판정 확인 필요’ 상태는 이번 확정 보고로 해소한다.

| 테스트 항목 | 검증 결과 | 검증 완료일 | 확인된 기능 |
|---|---|---|---|
| 회원 B의 회원 A 비공개 질문 접근 차단 | **PASS** | 2026-11-08 | 다른 일반회원의 비공개 질문 접근 거절 |
| 회원 A의 본인 질문 수정·저장·새로고침 | **PASS** | 2026-11-08 | 작성자의 질문 수정 및 저장 내용 유지 |
| 관리자 M의 답변 등록·수정 및 답변완료 확인 | **PASS** | 2026-11-08 | 관리자 답변 저장·수정, 답변완료 상태 |
| 관리자 M의 답변 삭제 및 답변대기 확인 | **PASS** | 2026-11-08 | 답변 삭제와 답변대기 상태 전환 |
| 회원 A의 테스트 질문 삭제 및 목록 반영 | **PASS** | 2026-11-08 | 작성자 테스트 질문 삭제와 목록 갱신 |

이 5개 기능에서 보고된 오류나 불명확한 결과는 없다. 사용자 테스트 질문 삭제는 사용자가 수행한 결과이며, 에이전트는 운영 데이터·회원 계정을 수정하거나 삭제하지 않았다. 정확한 실행 시각·문서 ID·서버 응답 증거는 별도 제공되지 않았으나 명시적인 사용자 실행 결과로 위 항목을 검증 완료 처리한다.

범위 밖의 추가 확인 사항은 별도로 유지한다: 삭제 후 qnaList/qnaDetails/qnaAnswers의 고아 문서 없음에 대한 직접 확인, 답변 등록 이후 B의 답변 접근 재검사, 신규 회원가입, 관리자 권한 정당성·예약문서 오염 감사, Console 전체 규칙과 로컬 후보 비교, AUTH-PRIVACY-01 및 기존 실제 iPhone/디자인 검증. 이 사항은 이번 5개 PASS의 실패를 의미하지 않으며 전체 운영 보안·배포 준비 완료로 확대 해석하지 않는다.

이번 변경은 document/REACT_MIGRATION.md와 task-history/task.md에 기록 추가만 수행했다. 기능 코드 수정·추가 테스트 실행·운영 데이터 및 계정 변경·규칙 게시·GitHub Push·React 배포는 하지 않았다.
