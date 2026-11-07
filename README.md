# HARO 웹사이트 프로젝트

하로(HARO) 캐릭터와 콘텐츠를 소개하는 웹사이트 프로젝트입니다. 메인 페이지와 NOTICE·Q&A 게시판, GOODS 상품 상세·장바구니 페이지를 포함합니다.  
**HTML5 / CSS3 / Vanilla JavaScript**를 기본으로 하며, Firebase Authentication·Firestore 및 일부 로컬 JSON·localStorage 데이터를 사용합니다.

> 이 문서는 제공된 HARO README의 내용을 TOM README의 **개발 시작 안내 → 핵심 규칙 → 구조 → 기능 안내 → 검증** 순서로 재편집한 것입니다. 구현 여부·실제 파일 경로·배포 상태는 작업 시 현재 저장소에서 다시 확인하세요.

---

## 🚨 개발 시작 전 필독 (Agent & Developer Notice)

> **모든 코드 작성·수정·리팩토링에 앞서 다음 순서로 문서와 실제 소스를 확인합니다.**

1. **이전 작업 이력 및 인계**: [`task-history/task.md`](./task-history/task.md) — 완료·미완료·미검증 내용을 확인합니다.
2. **HARO 핵심 규약**: [`spec-kit/HARO_SpecKit.md`](./spec-kit/HARO_SpecKit.md) — 캐릭터·디자인·반응형·구현 규약을 확인합니다.
3. **공통 에이전트 규칙**: [`spec-kit/AGENTS.md`](./spec-kit/AGENTS.md) — 현재 작업에 해당하는 MUST / MUST NOT을 확인합니다.
4. **관련 요구사항**: [`document/`](./document/)의 PRD·기능별 명세 및 승인된 화면 시안을 확인합니다.
5. **현재 저장소 조사**: 대상 HTML, 실제 연결된 CSS/JS, 이미지·폰트·데이터 경로를 확인한 뒤 수정합니다.

- 작업 이력은 참고 자료입니다. **현재 사용자 요청과 실제 코드 상태를 우선 확인**하며, 오래된 기록을 그대로 구현 완료로 간주하지 않습니다.
- 보안·접근성 요구사항을 훼손하지 않습니다. 다른 규칙이 충돌하면 **사용자 요구 범위 → 승인된 HARO PRD·화면 명세 → 현재 저장소 구조·디자인 토큰 → HARO_SpecKit → AGENTS → 일반 개발 관행** 순서로 해석하고, 충돌은 명시합니다.
- 작업 종료 시 `task-history/task.md`에 **수정 파일 / 구현 결과 / 실제 검증 / 미완료·미검증 사항**을 갱신합니다.

---

## 📌 핵심 작업 규칙 요약

### 1. 기존 구조·기능 보호

- **MUST**: 요청받은 영역만 수정하고 현재 클래스명, ID, 앵커, 링크, `data-*` 후크 및 이벤트 연결을 우선 유지합니다.
- **MUST**: 기존 HEADER·FOOTER, HERO 상자 애니메이션, EMOTICON/GOODS 슬라이더, STORY, NOTICE, Q&A, 로그인, 장바구니 동작을 무단 변경하지 않습니다.
- **MUST NOT**: 작동하는 영역을 이유 없이 전면 재작성하거나, 실제 파일 확인 없이 경로·기능·데이터를 만들어 내지 않습니다.

### 2. HARO 디자인·반응형 유지

- 기존 `css/tokens.css`의 공통 색상·타이포그래피·간격·레이어·모션 변수를 우선 사용합니다.
- 승인된 HARO 시안의 **화이트·크림·브라운·네이비 계열** 및 기존 캐릭터 원본 이미지를 보존합니다.
- 기존 프로젝트의 **Desktop First** 전략과 디바이스별 화면 명세를 따릅니다. 태블릿 `max-width: 1024px`, 모바일 `max-width: 768px`를 기준으로 기존 미디어쿼리를 점검합니다.
- Flexbox 또는 Grid는 현재 섹션의 구조에 맞게 사용합니다. 다른 프로젝트의 강제 레이아웃 계층이나 모노톤 규칙을 HARO에 기계적으로 적용하지 않습니다.

### 3. 의미·접근성·보안

- 이동은 `<a>`, 기능 실행은 `<button>`으로 구현하고, 시맨틱 HTML·키보드 조작·포커스·대체 텍스트·상태에 맞는 ARIA를 확인합니다.
- Firebase의 로그인·작성자·관리자·비공개 글 권한은 **클라이언트의 표시 제어가 아닌 Firestore Security Rules**에서도 검증합니다.
- 승인되지 않은 프레임워크·라이브러리·CDN·빌드 도구를 추가하지 않습니다. `!important`나 `overflow-x: hidden`으로 레이아웃 원인을 덮지 않습니다.
- 확인되지 않은 상품 가격, 이미지, URL, 계정 설정이나 테스트 데이터를 실제 정보처럼 표시하지 않습니다.

---

## ▶ 로컬 미리보기

1. Node.js가 설치된 환경에서 `preview.cmd`를 실행하거나 프로젝트 루트에서 `node scripts/preview.cjs`를 실행합니다.
2. 브라우저에서 **http://127.0.0.1:8080/** 로 접속합니다.
3. 파일 수정 후 새로고침하고, 종료 시 서버 터미널에서 `Ctrl+C`를 누릅니다.

> STORY는 로컬 JSON을 읽으므로 `file://` 방식으로 `index.html`을 직접 열지 않습니다. 실행 파일·스크립트가 실제 저장소에 있는지 먼저 확인합니다.

---

## 📁 주요 디렉터리 구조

```text
/
├── README.md
├── index.html                    # HARO 메인 엔트리
├── preview.cmd                   # 로컬 미리보기 실행(문서상 경로)
├── scripts/preview.cjs           # 로컬 HTTP 서버(문서상 경로)
├── pages/
│   ├── notice/                   # NOTICE, Q&A, 로그인·회원가입 관련 화면
│   ├── goods/                    # 상품 상세 템플릿
│   └── cart/                     # 장바구니
├── css/
│   ├── tokens.css                # 디자인 토큰
│   ├── base.css                  # 기본 스타일
│   ├── layout.css                # 공통 레이아웃
│   ├── components.css            # 공통 컴포넌트
│   ├── box.css                   # HERO 상자
│   └── sections.css              # 메인 섹션·반응형
├── js/
│   └── services/                 # NOTICE·계정·Firebase 관련 서비스
├── images/                       # 캐릭터·굿즈·아이콘 등 자산
├── data/
│   └── products.json             # GOODS 상품 정보
├── firebase.json                 # Firebase CLI 설정
├── firebase/
│   ├── firestore.rules           # Firestore 보안 규칙
│   └── firestore.indexes.json    # Firestore 인덱스
├── document/                     # PRD 및 기능별 운영 문서
├── task-history/task.md          # 작업 이력·인계
└── spec-kit/
    ├── HARO_SpecKit.md           # HARO 통합 규약
    └── AGENTS.md                 # 공통 에이전트 규칙
```

메인 HTML의 CSS 연결 순서는 문서상 `tokens.css → base.css → layout.css → components.css → box.css → sections.css`입니다. 상품·STORY·장바구니 등 나머지 JavaScript는 기존 `js/` 경로를 재사용합니다. **위 트리는 제공된 HARO README에 근거한 안내이며, 실제 존재 여부는 저장소에서 검증해야 합니다.**

---

## 📣 NOTICE 게시판 및 상단 공지 배너

- **목록**: [`pages/notice/notice-list.html`](./pages/notice/notice-list.html); 목록·상세·작성·수정 등의 HTML은 `pages/notice/`에서 관리합니다.
- **데이터베이스**: Firebase 프로젝트 `haro-web-project`, Firestore `(default)` 데이터베이스, `notices` 컬렉션.
- **문서상 현재 권한**: 로그인한 회원은 공지 작성 가능하며, 수정·삭제는 작성자 본인과 관리자만 가능합니다. 정책 변경이 필요하면 별도 작업으로 명시합니다.
- **첨부 이미지**: 기존 WebP/Base64 처리 방식을 유지합니다.
- **데이터 전환**: 이전 localStorage 데이터를 자동 업로드하지 않으며, Firebase 조회 실패 시 로컬 데이터로 대체하지 않습니다. Firebase 버전은 방문 시 샘플/기본 글을 생성하지 않습니다.
- **상단 배너**: 메인 `index.html`의 HEADER 위에만 표시합니다. 최신 공지 최대 3개를 4초 간격으로 순환하고 제목은 해당 상세 페이지로 이동합니다. 1개면 자동 전환하지 않으며 0개 또는 읽기 실패 시 숨깁니다.
- **배너 제어**: 일시정지·재생·닫기 지원, 모션 감소 설정에서는 자동 순환을 시작하지 않습니다. NOTICE 라벨은 목록으로 이동합니다. 닫으면 여백이 제거되며 새로고침/재방문 시 다시 표시됩니다. 별도의 배너 데이터 복사본·샘플 글은 만들지 않습니다.
- **정렬**: 현재 문서에는 별도의 고정 공지 필드가 없으므로 최신 작성일 정렬을 사용한다고 명시되어 있습니다.

상세 설정: [NOTICE·Firebase 안내](./document/NOTICE_Firebase.md)

### 기존 NOTICE URL 호환성

로컬 미리보기 서버는 아래 경로를 쿼리스트링을 보존하면서 **308 리다이렉트**하도록 문서화되어 있습니다.

| 이전 주소 | 현재 주소 |
|---|---|
| `/notice.html` | `/pages/notice/notice.html` |
| `/notice-list.html` | `/pages/notice/notice-list.html` |
| `/notice-detail.html` | `/pages/notice/notice-detail.html` |
| `/notice-edit.html` | `/pages/notice/notice-edit.html` |
| `/notice-write.html` | `/pages/notice/notice-write.html` |

`/pages/notice*.html` 중간 경로도 대응 대상이며, `notice.html?view=detail&id=...`은 호환 페이지를 거칩니다. **이 규칙은 로컬 Node 서버에만 적용**됩니다. GitHub Pages 등 별도 리다이렉트가 없는 정적 배포에서는 과거 URL이 404가 될 수 있으므로 배포 시 대응을 확인합니다. 루트에 임시 리다이렉트 HTML을 임의로 추가하지 않습니다.

---

## 💬 Q&A 질문·답변 게시판

- **접속**: [`pages/notice/qna.html`](./pages/notice/qna.html) — NOTICE의 디자인과 기존 로그인 체계를 재사용합니다.
- **주요 기능**: 질문 유형 5개, 공개 질문 제목 검색, 페이지당 7개 목록, 공개/비공개 질문, 관리자 답변.
- **권한**: 질문 수정·삭제는 작성자 본인만 가능하며, 관리자는 답변을 관리합니다.
- **비공개**: 실제 제목·본문·답변은 공개 목록 데이터와 분리하여 작성자·관리자만 읽도록 합니다. 공개 표시만 숨기는 것으로 보안을 대체하지 않습니다.
- **배포 전 필수**: 최신 Firestore Security Rules를 적용하고 실제 권한별 접근 테스트를 수행합니다.

상세 설정: [Q&A 구조·적용·검증](./document/QNA.md)

---

## 🔐 Firebase·로그인 설정

- **로그인**: [`pages/notice/login.html`](./pages/notice/login.html)
- **회원가입**: [`pages/notice/signup.html`](./pages/notice/signup.html) — 이름·아이디·비밀번호·이메일 입력과 로그인 복귀 링크 제공.
- **UI 상태**: 비로그인 시 로그인 버튼, 로그인 후 환영 문구와 로그아웃 버튼을 표시합니다.
- **서비스 로딩 순서**: `js/services/notice-common.js` → `notice-firebase.js` → `account-service.js` → `notice-auth.js` → 각 화면 코드.
- **인증 방식**: 웹 SDK에서 직접 인증하고 회원의 실제 이메일을 보관합니다. 문서상 아이디 기반 내부 인증 주소를 사용하여 **이메일 인증·비밀번호 재설정 메일은 제공하지 않습니다.**
- **요금제/구성**: Spark 무료 요금제 기준이며 Cloud Functions/Blaze는 사용하지 않습니다. 기존 `api/` 함수 코드는 현재 미사용으로 기술되어 있습니다.
- **운영 전 준비**: Firebase Authentication 이메일/비밀번호 제공업체 활성화, Firestore 보안 규칙 게시, 관리자 계정 수동 등록이 필요합니다.

> 인증·관리자 권한·비공개 자료의 접근 통제는 브라우저 UI뿐 아니라 Firebase 측 규칙에서도 검증해야 합니다. 실제 운영을 위한 계정·보안 설정은 반드시 위 안내 문서를 참조하세요.

---

## 🛍 GOODS 상세페이지·장바구니

- **GOODS 카드**: 메인 페이지 8개 카드가 `pages/goods/goods-detail.html?id=상품ID`로 연결됩니다.
- **상품 데이터**: [`data/products.json`](./data/products.json) — 상품명·이미지·가격 등 공통 데이터로 관리합니다.
- **장바구니**: [`pages/cart/cart.html`](./pages/cart/cart.html); 로컬 저장 키는 `haro-cart-v1`입니다. 모든 페이지 상단 아이콘에서 접근합니다.
- **가격 처리**: 무지노트는 확인된 **4,500원**을 사용하며, 가격이 확인되지 않은 다른 7개 상품은 **가격 미등록**으로 표시하여 장바구니 담기를 막습니다.
- **범위**: 실제 결제·주문·배송 기능은 제공하지 않습니다.

상세 설정: [GOODS·CART 안내](./document/GOODS_CART.md)

---

## ✅ 완료 전 체크리스트

작업 전:

- [ ] `task-history/task.md`와 해당 Spec-kit·PRD·기능 문서를 읽었습니다.
- [ ] 사용자 요청 범위, 보존할 기능, 수정 파일, 완료 기준을 정리했습니다.
- [ ] 실제 HTML/CSS/JS, 이미지·폰트·데이터 경로를 확인했습니다.

작업 후:

- [ ] 요청 범위 밖의 페이지·콘텐츠·기능은 변경하지 않았습니다.
- [ ] 디자인 토큰·기존 반응형·헤더/푸터·이벤트 후크가 유지됩니다.
- [ ] 링크, 이미지, JSON, 로그인, Firebase 권한, 장바구니 등 **해당 작업에 영향받는 기능**을 검사했습니다.
- [ ] 데스크탑·태블릿·모바일 및 브레이크포인트 경계의 레이아웃을 확인했습니다.
- [ ] 접근성(시맨틱, 키보드, 포커스, ARIA)과 관련 보안 조건을 확인했습니다.
- [ ] 수행한 실제 테스트와 미검증 항목을 구분했습니다.
- [ ] 변경 사항과 다음 작업 인계를 `task-history/task.md`에 기록했습니다.

### 테스트 및 작업 종료 원칙

- 변경 범위에 필요한 기존 테스트 또는 브라우저 검증을 수행합니다. **문서만 수정한 경우에는 실행 테스트를 생략할 수 있습니다.**
- 사용한 임시 서버·워처·백그라운드 프로세스는 검증 종료 후 정리합니다.
- 최종 보고는 **작업 요약 / 변경 파일 / 보존한 기능 / 검증 결과 / 미완료·미검증** 형식으로 간결하게 작성합니다.
