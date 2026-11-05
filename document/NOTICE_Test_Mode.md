# NOTICE 개발 및 Firebase 이전 안내

## 기존 코드 분석과 적용 범위

기존 NOTICE는 `notice.html?view=list|detail|write|edit`와 동기식 `notice-data.js` 어댑터를 사용했다. 데이터는 `{ body, image: { name, src } }` 형태였고, 카테고리 필터·삭제·이미지 압축 기능이 없었다.

루트의 `localstorage_to_firebase_guidelines.md`, `spec-kit/AGENTS.md`, `css/common.css`는 없다. 사용자가 지정한 `curr-task/005-공지사항/localstorage_to_firebase_guidelines.md`와 HARO 규약을 확인하고 현재 공통 CSS(`tokens`, `base`, `layout`, `components`, `box`, `sections`)를 재사용했다. 별도 첨부 화면은 이번 요청에 없으므로 기존 NOTICE UI와 이전 데모를 기준으로 유지했다.

## 실행 및 페이지

`preview.cmd` 또는 `node scripts/preview.cjs` 실행 후 홈페이지 NOTICE 메뉴로 이동한다.

- 목록: `notice-list.html` — 카테고리 탭, 제목·내용 검색, 10개 단위 페이지네이션.
- 상세: `notice-detail.html?id=게시글ID` — 본문·첨부 이미지와 관리자 수정·삭제.
- 작성: `notice-write.html` — `<body data-mode="write">`.
- 수정: `notice-edit.html?id=게시글ID` — `<body data-mode="edit">`.
- 기존 `notice.html?view=...` 주소는 새 경로로 연결한다. `notice-data.js`는 사용하지 않는 기존 경로 안내 파일로 남겼다.
- 목록 상단의 관리자 테스트 전환 버튼을 켜면 작성·수정·삭제할 수 있다. 작성자와 최초 작성일은 수정할 수 없다.

공통 헤더·검색 오버레이·푸터 및 `main.js`를 재사용하고, NOTICE 전용 CSS만 추가 적용한다. 기존에 통일한 제목 크기·밑줄 규칙도 유지한다. NOTICE 스크립트는 `notice-common.js → notice-auth.js → notice-repository.js → 화면 JS` 순서다.

## 저장소와 데이터

저장 문서는 `{ id, category, title, content, author, imageUrl, createdAt, updatedAt }`이며 날짜는 ISO 문자열, 이미지 없음은 빈 문자열이다. 생성 시 UUID를 만들고, 수정은 기존 `id`, `author`, `createdAt`을 유지한다.

`notice-repository.js`만 localStorage에 접근한다. 공개 API는 모두 Promise를 반환한다.

- `getList({ category })`: 해당 카테고리의 문서 배열(최신 작성일 순). 검색과 페이지네이션은 화면에서 수행한다.
- `getById(id)`: 문서 또는 `null`.
- `create(input)`, `update(id, changes)`: 저장된 문서. 수정은 일부 필드만 전달할 수도 있다.
- `remove(id)`: 삭제 성공 시 완료, 없는 글·권한 오류·저장 오류 시 reject.
- `seedIfNeeded()`: 최초 샘플 또는 구버전 데이터 이전. 전체 삭제 후에는 시드 플래그가 남아 재시드하지 않는다.

`STORAGE_KEYS`의 `POSTS`는 `haro-notices-v2`, `SEEDED`는 `haro-notices-v2-seeded`, `LEGACY`는 `haro-notices-test-v1`이다. 구버전 글은 ID·작성자·날짜와 이미지 원본을 유지해 새 문서 구조로 변환한다. 구버전 원본 키는 복구 참고용으로 남기며 새 저장소가 있으면 다시 가져오지 않는다. 손상 데이터는 오류를 표시하고 임의 초기화하지 않는다.

관리자 테스트 상태는 `notice-auth.js`에서 sessionStorage로 관리한다. 개발용 전환은 실제 인증이 아니며 일반 방문자도 켤 수 있다. 저장소에서 쓰기 직전에 권한을 재검사하지만 실서비스 보안은 서버 규칙으로 보장해야 한다. 여러 탭의 동시 편집을 원자적으로 병합하는 기능은 localStorage 모드에서 제공하지 않는다.

## 이미지와 실패 처리

JPG/PNG/WebP, 0바이트 초과·5MB 이하만 허용한다. `notice-common.js`의 `fileToImageUrl()`이 canvas로 긴 변을 최대 1200px로 축소하고 WebP data URL 문자열을 반환한다. 수정 시 유지/교체/제거를 `imageUrl` 하나에 반영한다. 기존 글에서 가져온 이미지는 재압축 없이 유지한다.

QuotaExceededError는 용량 부족 메시지로 안내하며 입력과 기존 저장 데이터를 유지한다. 이미지 변환 중에는 저장을 막고, 제출 중에는 제출 플래그와 버튼 비활성화로 중복 요청을 막는다. 취소·링크 이동은 변경 시 확인하고, 새로고침·닫기는 beforeunload 경고를 사용한다. 본문은 textContent와 white-space: pre-wrap으로 표시한다.

## Firebase 이전 시 변경 지점 (5줄)

1. `notice-repository.js`: `getList/getById/create/update/remove` 내부를 Firestore로 교체하고 Promise·문서 형식을 유지한다.
2. `notice-repository.js`: 로컬 `STORAGE_KEYS`·`seedIfNeeded` 및 구버전 이전을 제거하고 Firestore Timestamp를 ISO 문자열로 정규화한다.
3. `notice-auth.js`: `isAdmin/getCurrentUserName/requireAdmin`을 Firebase Auth로 교체하고 `devSetAdmin`과 목록 상단 전환 UI를 제거한다.
4. `notice-common.js`: `fileToImageUrl()`의 압축 결과를 Firebase Storage에 업로드하고 다운로드 URL 문자열을 반환한다.
5. Firestore·Storage 보안 규칙에서 관리자 쓰기, 불변 필드, 허용 이미지 형식·크기를 검증한다. 화면의 await 호출은 유지한다.

## 검증

- 모든 프로젝트 `.js`/`.cjs`: `node --check`.
- 데이터/기존 STORY: `node --test tests/notice-data.test.js tests/story-adapter.test.js`.
- 브라우저: `node tests/notice-browser.cjs` (설치된 Chrome, 별도 임시 프로필과 8097 포트 사용).
- 1920/1024/768/390px의 수정 화면 스크린샷: `tests/notice-screenshots/edit-*.png`.

실제 Firebase 연동, 서버 관리자 인증, 실기기 터치, Chrome 외 브라우저 검증은 이번 범위에 포함하지 않는다.