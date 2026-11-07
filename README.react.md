# HARO · Vite + React

현재 폴더가 React 프로젝트 루트입니다. `haro-react/` 중첩 폴더는 없습니다. 기존 HTML/CSS/JS/JSON/이미지와 Firebase 설정은 보존했습니다.

## 실행

검증 환경: Windows, Node.js26.13.0, npm11.20.0. 설치 버전은 package-lock.json에 고정합니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

React: **http://127.0.0.1:5173/react.html**

원본 비교: http://127.0.0.1:5173/index.html

PowerShell이 npm.ps1 실행을 제한하면 위와 같이 npm.cmd를 사용합니다. npm 실행이 가능한 환경에서는 `npm run dev`도 동일합니다. 서버는 실행 터미널에서 Ctrl+C로 종료합니다. 포트5173이 사용 중이면 기존 서버를 종료하거나 `npm.cmd run dev -- --port 5174`처럼 지정합니다. 기본 브라우저 자동 열기를 시도하며 열리지 않으면 URL을 Chrome/Edge 주소창에 붙여 넣습니다.

```powershell
npm.cmd run build
npm.cmd run preview
```

빌드 미리보기: **http://127.0.0.1:4173/**. 종료는 Ctrl+C입니다.

원본 index.html을 덮어쓰지 않도록 개발 진입점을 react.html로 분리했습니다. Vite 빌드 후 **dist 안에서만** react.html을 index.html로 바꾸고 기존 images를 복사합니다. dist는 독립된 정적 사이트이며 소스의 pages/js/api 및 Firebase 규칙을 포함하지 않습니다.

## 구성

- `src/layouts/`: Header, Footer, 게시판 공통 화면
- `src/sections/`: Hero, About, Emoticon, Story, Goods
- `src/pages/`: 게시판 목록/상세/폼, 계정, 상품, 장바구니
- `src/components/`: React Swiper, 공지 배너, STORY 이미지, 상태 안내
- `src/contexts/`: 인증 구독과 장바구니 상태
- `src/services/`: Firebase 단일 초기화, 인증, NOTICE/Q&A 저장소, 검증, 상품 저장소
- `src/hooks/`: 등장 효과 및 미저장 변경 안내
- `src/styles/react.css`: React 전용 보완 스타일

기존 CSS를 순서대로 import하여 디자인 토큰과 반응형을 재사용합니다. React가 UI를 렌더링하고 기존 페이지용 전역 DOM 스크립트는 실행하지 않습니다. 서비스의 검증·트랜잭션·장바구니 알고리즘은 기존 코드를 ES Module로 옮겼습니다. IntersectionObserver, 애니메이션 프레임, 이벤트, 타이머, 구독은 해제 함수를 갖습니다.

## 라우팅

| 기능 | 개발 주소의 해시 부분 |
|---|---|
| 메인 | `#/` |
| NOTICE | `#/notice`, `#/notice/detail?id=…`, `#/notice/write`, `#/notice/edit?id=…` |
| Q&A | `#/qna`, `#/qna/detail?id=…`, `#/qna/write`, `#/qna/edit?id=…` |
| 계정 | `#/login`, `#/signup` |
| 상품 | `#/goods?id=haro-note` |
| 장바구니 | `#/cart` |

HashRouter와 Vite 상대 base(`./`)로 GitHub Pages 같은 하위 경로 호스팅에서도 라우트 새로고침에 서버 rewrite가 필요하지 않도록 했습니다. 기존 HTML 주소는 원본 사이트 비교용으로 남아 있으며 React 빌드에 복사하지 않습니다. 기존 HTML URL을 React URL로 바꾸는 운영 리다이렉트는 설정하지 않았습니다.

## Firebase와 데이터

기존 haro-web-project의 웹 설정을 기본값으로 사용합니다. `.env.example`을 `.env.local`로 복사해 VITE_FIREBASE_* 값을 지정할 수도 있습니다. **VITE_ 값은 공개 번들에 포함됩니다.** 서비스 계정·관리자 키·비밀번호를 넣지 마세요. 웹 apiKey는 서버 비밀키가 아닙니다.

Firebase Auth/Firestore npm SDK12.6.0을 단일 앱 인스턴스로 공유합니다. notices, users/usernames/emails/admins, qnaList/qnaDetails/qnaAnswers 컬렉션과 기존 문서 형식을 유지했습니다. 관리자 판정은 서버에서 읽은 보호된 users/{uid}.role:admin 또는 admins/{uid}.enabled:true로 기존 코드·보안 규칙과 동일합니다. 일반 클라이언트는 관리자 role 생성이나 프로필 수정을 할 수 없으며 최종 권한은 서버 규칙이 결정합니다.

신규 가입·로그인·게시글 및 답변 저장 버튼은 **실제 기존 Firebase에 연결**됩니다. 자동으로 테스트 계정이나 게시글을 만들지 않습니다. 이번 자동 검증은 운영 쓰기를 차단하고 대역 데이터로 수행했습니다. 현재 서버에 게시된 규칙과 실계정 종단 검증은 별도로 필요합니다. firebase.json과 firebase/firestore.rules는 변경·배포하지 않았습니다.

장바구니 키 `haro-cart-v1`과 저장 형식은 동일합니다. 같은 브라우저·같은 origin에서 원본과 공유할 수 있지만 포트가 다른 origin이나 운영 사이트의 저장소를 자동 복사하지 않습니다. 노트4500원 외 7개 미등록 가격은 담기를 막습니다. 실제 결제·주문·배송, 통합 검색, 자동 비밀번호 재설정은 기존과 같이 제공하지 않습니다.

HERO: BOX_001~012, 125ms/프레임·총1.5초. Canvas는 NOTICE 이미지의 WebP 변환에만 사용하며 객체 URL은 변환 후 해제합니다. STORY는 로컬 JSON에서 중복 없이4개 선택하고 등록된 게시물 URL만 연결합니다.

## 검증

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run test:build
node scripts/compare-react.cjs
```

브라우저 테스트는 로컬 Edge 설치 경로를 사용합니다. 먼저 dev와 preview를 각각 실행해야 합니다. Firebase 서비스 응답을 **테스트 브라우저의 요청 가로채기에서만** 대체하며 앱에 테스트 관리자 모드나 가짜 성공 기능을 넣지 않았습니다. 테스트 대역은 서버 보안 규칙 검증을 대신하지 않습니다.

`test-results/react/`에 브라우저 결과 JSON과 비교 이미지가 생성됩니다. `document/react-original-hashes.json`과 테스트가 원본 파일 변경 여부를 확인합니다. 자세한 결과와 제한은 [React 전환 검증](document/REACT_VALIDATION.md)을 참고하세요.

## 배포 준비

산출물은 dist 전체입니다. 별도 테스트 사이트에 업로드해 도메인, 인증, 권한, 실기기 검증 후 운영 전환을 결정합니다. 현재 원격 origin은 기존 운영 저장소를 가리키므로 자동 push/배포하지 않습니다. GitHub Actions·Pages·Firebase 배포 설정은 교체하지 않았습니다.

이 환경의 npm 인증서 오류는 실행 세션에서 `NODE_USE_SYSTEM_CA=1`로 Windows 인증서를 사용해 해결했습니다. SSL 검증 해제나 시스템 PATH/전역 npm 설정 변경은 하지 않았습니다. npm audit의 grpc 간접 의존성 경고는 호환 패치 범위 override로 해결했으며 강제 Firebase 다운그레이드는 하지 않았습니다.
