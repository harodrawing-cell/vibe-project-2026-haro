# NOTICE Firebase 테스트 연결

## 현재 연결

- 프로젝트: `haro-web-project`, Cloud Firestore `(default)` DB의 `notices` 컬렉션.
- `js/notice-firebase.js`에서 Firebase 웹 SDK 12.6.0을 브라우저 모듈로 불러온다. npm 설치나 빌드는 필요 없다.
- 기존 비동기 CRUD와 ISO 날짜, UUID, 카테고리·검색·페이지네이션 및 메인 배너를 유지한다.
- 별도 관리자 계정이나 Firebase Authentication은 사용하지 않는다. 목록의 관리자 테스트 모드 버튼은 기존처럼 작성·수정·삭제 UI를 켜는 기능이다. 실제 접근 통제가 아니다.
- 이미지 선택 5MB 이하, 최대 1200px WebP 변환 및 Base64 저장을 유지한다. Storage는 사용하지 않는다. Firestore 1MiB 문서 제한에 여유를 두어 JSON 기준 950,000바이트 초과 글은 저장 전에 거부한다. 이때 입력과 첨부는 유지한다.
- 조회는 서버에서 수행하며 연결 실패를 로컬 저장으로 대체하지 않는다. 다른 기기의 변경은 목록 재접속/새로고침으로 확인한다. 메인 배너는 포커스 복귀 시에도 새로 조회한다.

## 실행과 콘솔 설정

1. `preview.cmd` 또는 `node scripts/preview.cjs` 실행.
2. `http://127.0.0.1:8080/pages/notice/notice-list.html` 접속.
3. 관리자 테스트 모드 켜기 → 글쓰기 → 저장. 다른 브라우저에서도 같은 글을 확인할 수 있다.
4. Firebase 콘솔 → Firestore Database → 데이터에서 `notices` 확인. 컬렉션은 첫 저장 시 만들어지므로 미리 생성할 필요 없다.
5. Firestore Database → 규칙에서 프로젝트 루트 `firestore.rules`를 검토하고 게시한다. **로컬 파일 생성만으로 서버 규칙이 바뀌지 않는다.** 현재 콘솔 규칙을 먼저 보관한다.

제공된 규칙은 `notices`만 공개 테스트 읽기·쓰기·삭제를 허용하며 **2026-12-06 00:00 UTC (한국시간 09:00)**에 만료된다. 다른 컬렉션은 허용하지 않는다. 기존 다른 서비스 규칙이 있다면 통째로 덮어쓰지 말고 `notices` 규칙을 병합한다. 관리자 없이 공개 쓰기를 허용하므로 URL을 아는 사람은 누구나 변경·삭제할 수 있다. 운영 전에는 인증 규칙으로 바꿔야 한다.

Base64 이미지와 본문은 검색 인덱스가 필요 없다. Firestore 콘솔의 색인 → 단일 필드에서 컬렉션 그룹 `notices`의 `imageUrl`, `content` 필드에 색인 면제를 추가하는 것을 권장한다. `firestore.indexes.json`에 같은 설정을 준비했다. 현재는 기존처럼 화면에서 검색·카테고리 필터링을 수행한다.

## 기존 로컬 글

기존 localStorage 데이터는 삭제·수정하지 않는다. Firebase 연결 이후에는 자동 시드·샘플 생성·로컬 글 자동 업로드를 하지 않는다. 이전 여부가 정해지지 않아 데이터 이전은 이번 변경에 포함하지 않았다. 기존 글은 원래 접속 주소와 브라우저의 `haro-notices-v2`를 백업한 뒤 별도 일회성 이전으로 처리한다.

## 검증

- `node --test tests/notice-firebase.test.cjs tests/notice-data.test.js tests/notice-paths.test.cjs`
- `node tests/notice-firebase-browser.cjs`: 실제 Firebase에 식별 가능한 임시 글 생성·수정·조회·삭제. 서버 데이터에 쓰는 검사이므로 개발 프로젝트에서 실행한다. 별도 Chrome 프로필을 사용한다.
- 브라우저 검증은 1920/1024/768/390px 목록·작성 폼 가로 넘침, 상세 연결, Base64 보존, 저장 실패 시 입력 보존을 확인한다.
- 기존 `notice-data.test.js`는 보존된 로컬 어댑터를 검사한다. 실제 브라우저 저장소는 Firebase 어댑터다. 이전 localStorage 기반 브라우저 테스트들은 Firebase 배포 검증용이 아니다.

참고: https://firebase.google.com/docs/web/setup / https://firebase.google.com/docs/firestore/quotas
