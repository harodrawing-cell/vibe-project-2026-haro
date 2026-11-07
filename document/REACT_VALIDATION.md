# React 전환 검증

> Latest 2026-11-08 01:34:33 KST: private body/answer REST403 and SDK denied; public metadata masked. Earlier200 observations are historical. Local reservation candidate not published. See [review](SECURITY_REVIEW_20261108.md).

> 최신 운영 확인(2026-11-08 01:22 KST): 사용자 게시 완료 알림 후에도 비공개Q&A본문/답변의 무인증 REST가200 및내용필드를반환했다. NOTICE7개/Q&A목록2개·Auth초기화·가입중복확인읽기는정상. 실계정로그인/가입/쓰기권한은미검증이며배포보류를유지한다. REACT_MIGRATION.md에실행증거와미검증범위를추가했다.

> 후속 최종 감사(2026-11-08): **운영 배포 보류**. 실제 Firebase의 비공개 Q&A 문서가 무인증 REST에 HTTP200으로 반환되는 문제와 세부 디자인 차이를 확인했다. 아래의 이전 대역 기반 통과 기록과 구분하며, 최신 판정은 [REACT_MIGRATION.md](REACT_MIGRATION.md)의 최종 검증 절을 따른다.

> 보안 수정 후속: 전체 규칙 후보와 Emulator27개 검증을 완료했다. 사용자가 확인한 원인은2026-12-06까지 모든 문서를 허용하는 운영 정책이다. **아직 운영 미게시**이므로 배포 보류를 유지한다. [적용할 전체 규칙 및 절차](QNA_SECURITY_FIX.md).

검증일: 2026-11-08(한국 시간). STEP 2~8 작업 기록. React 구현과 빌드 결과를 준비했으며 운영 배포는 하지 않았다.

## 변경과 보존

루트에 package.json/package-lock.json, vite.config.mjs, react.html, src/, README.react.md, .env.example과 검증 코드를 추가했다. 기존 .gitignore에 node_modules/dist/개인 환경변수/검증 산출물 제외를 추가했다. 원본 README와 HTML/CSS/JS/JSON/이미지, Firebase 규칙·설정은 보존했다. 원본 SHA-256 기준은 document/react-original-hashes.json에 기록했다.

Vite React JavaScript 공식 템플릿을 임시 디렉터리에 생성해 구성 기준으로 사용했다. 원본 index.html을 보호하기 위해 개발 진입점을 react.html로 분리했다. 프로덕션 dist/index.html은 React 전용이다. React Router는 HashRouter이며 상대 base로 빌드한다.

## 단계별 결과

| 단계 | 결과 |
|---|---|
| STEP 2 | Node26.13.0/npm11.20.0 확인, Vite8.3.6/React19.3.1 및 Router/Swiper/Firebase 설치, dev5173/preview4173 실행 |
| STEP 3 | 공통 Header/Footer/게시판 레이아웃, AuthContext/CartContext, 기존 CSS 재사용 |
| STEP 4 | 메인6개 영역, Swiper React, HERO12컷/125ms, STORY 랜덤4개, 배너4초/제어 |
| STEP 5 | NOTICE/Q&A 목록·검색·상세·폼·권한·첨부/관리자 답변, 계정 중복확인·로그인·가입완료·수동 복구 안내 |
| STEP 6 | 상품 옵션·수량·가격 미등록 차단, 장바구니 배지·합계·수량·삭제·저장 유지 |
| STEP 7 | 외부 Edge 실행 엔진으로 반응형·기능 자동 검증, 원본/React 캡처 및 섹션 크기 비교 |
| STEP 8 | npm run build 성공, dist/index.html과 자산 생성, preview에서 해시 라우트 직접 접근/새로고침 확인 |

## 실제 실행한 검사

- 원본 SHA-256 동일성, React 서비스5개 및 기존 계정/NOTICE/Q&A/상품/STORY 회귀를 포함한36개 테스트 통과.
- 초기 Edge 검사에서 상품 상세의 추가 이미지에 크기 클래스가 빠져768px 화면이 넘치는 문제를 발견했다. product-detail-image를 적용해 해결했다.
- 메인/목록/계정/상품/장바구니28개 및 NOTICE·Q&A 상세·작성·수정24개, 총52개 화면 조합(1920/1024/768/390px) 가로 넘침 없음 확인.
- HERO 모션 감소 설정의 마지막 프레임과 글자색/WebKit text fill rgb(32,32,32), 메뉴·검색 Escape, 배너 닫기/여백 제거 확인.
- HERO 일반 모션의1.5초 재생과 Canvas의 PNG→WebP 첨부 변환을 실제 Edge 엔진에서 확인했다. 자동 브라우저 검사에서 JavaScript 예외·콘솔 오류·로컬 자산404는0건이었다.
- 장바구니2개 담기12000원,3개로 변경16500원, 새로고침 저장 유지 및 삭제 확인. 가격 미등록 상품 담기 차단 확인.
- 테스트 대역으로 NOTICE 제목검색/작성자 수정·동일ID/삭제 취소·확인, Q&A 비공개 방문자 거부·작성자 접근·관리자 답변, 로그인1회/2회 오류·복구 안내·가입 중복확인·완료 흐름 확인.
- 1920/1024/768/390px에서 원본과 React의 HERO/ABOUT/EMOTICON/STORY/GOODS20개 섹션 비교에서 시작 위치와 높이 차이0px. STORY 이미지는 랜덤이므로 픽셀 일치를 목표로 하지 않는다. 헤더·푸터 및390/1920px 캡처를 직접 확인했다.
- npm audit 결과 취약점0건. grpc 간접 의존성을1.13.6 이상 호환 패치 범위로 override했다.
- 실제 화면을 연 상태에서1920→390→1024→768→1920px 전환과 Swiper 다음 상품 이동을 확인했다. 기존 이력의 breakpoint/getAttribute 오류는 이 검사에서 재현되지 않았다.
- dist의 이미지175개가 원본과 SHA-256으로 동일하다. 별도 로컬 정적 서버의 `/haro/` 하위 경로에서7개 라우트 직접 접근·새로고침과 이미지/CSS/JS 경로를 검사해 자산404와 JavaScript 예외0건을 확인했다.

## 실제 차이와 남은 검증

- 기존 HTML 주소와 React 해시 주소가 다르다. 원본 주소 리디렉트·운영 전환은 적용하지 않았다.
- 기존 전역 스크립트 대신 React 상태·이벤트를 사용한다. Swiper는 React API로 연결하고 모션 감소 설정에서 자동 재생을 중지한다.
- 관리자 판정은 보호된 users.role:admin 또는 admins.enabled:true로 실제 기존 코드·서버 규칙과 동일하다. STEP 1 문서에 있던 admins 전용 설명을 실제 규칙에 맞게 정정했다. 일반 회원 프로필 수정과 관리자 role 생성은 기존 서버 규칙에서 차단된다.
- 기존 상품 상세/게시판 안내와 공통 레이아웃을 재사용했으나 모든 문장·빈 상태의 픽셀 단위 동일성은 검증하지 않았다.
- 자동 테스트는 운영 Auth/Firestore 요청을 차단했다. 실계정 로그인·신규 가입·운영 글 저장 및 서버에 게시된 규칙·권한은 이번 검증 범위 밖이다. 기존 데이터와 실제 사용자 계정을 변경하지 않았다.
- 실제 iPhone Safari/카카오톡 인앱/실물 터치 기기는 미검증이다. Edge 너비390px와 WebKit 관련 CSS 계산 확인을 실기기 검증으로 간주하지 않는다.
- 실제 결제/주문/배송·통합 검색·자동 비밀번호 재설정은 기존에 없던 기능이며 새로 구현하지 않았다. api 및 레거시 로컬 게시판 코드는 보존하고 React에서 import하지 않는다.
- 푸시, 커밋, 운영 배포, 원격 origin 변경, Firestore 규칙 게시, 계정/DB 마이그레이션은 수행하지 않았다.

실행 방법은 ../README.react.md, 상세 브라우저 증거는 ../test-results/react/report.json 및 comparison.json을 확인한다.
