# HARO 묻고 답하기 Q&A

## 화면과 사용법

- 모든 페이지의 HEADER에서 NOTICE 오른쪽에 Q&A 메뉴를 추가했다. 기존 헤더·장바구니 배지·FOOTER·NOTICE 배너를 유지한다.
- 목록: `pages/notice/qna.html`. 질문 유형 5개와 전체 탭, 공개 제목 검색, 페이지당 7개, 답변대기/답변완료 표시.
- 작성: `qna-write.html`. 기존 계정으로 로그인해야 하며 유형·제목·본문·공개 여부를 입력한다. 기본 공개다. 비로그인 상태에서는 로그인 후 작성 화면으로 복귀한다.
- 상세: `qna-detail.html?id=...`. 질문 아래 관리자 답변을 표시한다. 작성자만 질문 수정·삭제, 관리자만 답변 등록·삭제를 할 수 있다. 기존 답변 수정은 그 답변을 작성한 관리자에게 허용한다.
- 수정: `qna-edit.html?id=...`. 기존 ID·최초 작성일·작성자 UID와 답변을 유지한다. 관리자는 타인의 질문을 수정하거나 삭제할 수 없다. NOTICE의 관리자 수정·삭제 권한과 의도적으로 다르다.
- 작성·수정 취소와 저장 실패 시 입력 보존, 삭제 확인 및 요청 중복 방지를 지원한다. 질문 삭제는 관련 3개 문서를 함께 정리한다.
- Q&A는 별도 첨부파일 업로드를 제공하지 않는다. 제목·본문·답변을 텍스트로 렌더링하므로 외부 파일 URL로 비공개 콘텐츠가 노출되는 경로를 추가하지 않았다.

## 기존 시스템 재사용

Firebase 프로젝트·Authentication·Firestore `(default)`와 기존 `HaroAccount`, `HaroNoticeFirebase.getClient()`를 사용한다. 관리자 판별은 보호된 `users/{UID}.role == "admin"` 또는 기존 `admins/{UID}.enabled == true`를 사용한다. Cloud Functions·Blaze·Storage·새 인증 방식은 추가하지 않는다. 기존 NOTICE·회원·장바구니 데이터는 변경하지 않는다.

새 폴더를 만들지 않고 페이지는 `pages/notice/`, JS는 `js/services/qna-common.js`, `qna-repository.js`, `qna-page.js`, CSS는 `css/qna.css`에 둔다. NOTICE CSS와 공통 헤더 CSS를 재사용한다. `account-page.js`에는 허용된 로컬 목적지 `qna-write.html`로만 복귀하는 처리를 추가했으며 임의 URL 리디렉션은 허용하지 않는다.

## 공개 목록과 보호 데이터

질문 하나당 동일 ID의 문서 3개를 사용한다.

| 컬렉션 | 저장 내용 | 읽기 |
|---|---|---|
| `qnaList` | 유형, 공개용 제목·작성자, 작성자 UID, 공개 여부, 날짜, 답변 상태 | 누구나 |
| `qnaDetails` | 실제 제목·본문·작성자·UID·공개 여부·날짜 | 공개는 누구나, 비공개는 작성자/관리자 |
| `qnaAnswers` | 답변 본문·관리자·UID·날짜 | 질문과 동일 |

비공개 목록에는 실제 제목 대신 `비공개 질문입니다`, 작성자 이름 대신 `비공개`만 저장한다. 본문·답변·실제 비공개 제목 필드는 목록에 저장하지 않는다. 작성자 UID는 공개 메타데이터에 포함되지만 이 UID를 아는 것만으로 보호 문서를 읽거나 권한을 얻을 수 없다. 본문·답변 컬렉션 전체 목록 조회는 허용하지 않고 ID별 조회만 허용한다.

`qnaAnswers`는 질문 생성 시 빈 답변 문서를 함께 만든다. 질문당 현재 답변 하나를 관리한다. 답변 삭제는 빈 답변으로 되돌려 상태를 답변대기로 바꾼다. 질문 삭제만 3개 문서를 모두 삭제한다.

질문 등록·공개 여부 변경·질문 삭제·답변과 목록 상태 변경을 원자적 쓰기/트랜잭션으로 처리한다. 규칙은 `getAfter()`로 문서 간 일관성을 검사한다. 비공개 전환 시 공개 목록을 가리지 않는 요청, 관리자가 아닌 사용자의 답변/상태 위조, 질문 일부만 삭제해 고아 데이터를 남기는 요청은 거부된다. 동시 공개 여부 변경으로 규칙 검사 충돌이 생기면 동일한 규칙을 통과하도록 새 데이터를 읽어 최대 두 번 재시도하며, 무검사 쓰기로 대체하지 않는다.

## 실제 Firebase 적용 전 필수

1. Firebase 콘솔 → Firestore Database → 규칙에서 프로젝트의 **현재 `firebase/firestore.rules` 전체**를 확인해 게시한다. 기존 NOTICE·회원·관리자 규칙은 유지하고 Q&A 규칙을 추가한 파일이다. 콘솔에 코드 외 별도 규칙이 있다면 그 규칙도 보존해 병합한다.
2. `firebase/firestore.indexes.json`에는 기존 설정을 보존하고 Q&A 본문/답변 색인 면제를 추가했다. 콘솔에서 동일한 단일 필드 색인 면제를 적용하거나 Firebase CLI로 색인만 배포할 수 있다. 목록은 공개 메타데이터를 읽고 화면에서 유형/검색/정렬/7개 페이지를 처리하므로 복합 색인은 필요 없다.
3. 기존 회원 A/B와 관리자 테스트 계정으로 실제 호스팅 환경의 최종 인증·권한을 확인한다. 운영 글을 쓰거나 삭제하지 말고 식별 가능한 테스트 질문만 사용한다.

**이번 작업에서는 서버 규칙/색인 게시와 운영 데이터 변경을 하지 않았다.** 새 규칙을 게시하기 전에는 실제 Q&A 기능이 접근 거부될 수 있다. Spark 무료 할당량 안에서 사용하며, 큰 게시판에서는 목록 전체 읽기와 실시간 구독의 읽기 비용을 고려한 서버 페이지네이션이 필요하다.

## 검증과 범위

- 일반 회귀: `node --test tests/qna.test.cjs tests/account.test.cjs tests/notice-firebase.test.cjs tests/notice-data.test.js tests/notice-paths.test.cjs tests/shop.test.cjs tests/story-adapter.test.js` — 38개 통과.
- 실제 로컬 규칙: `tests/notice-rules.test.cjs` + `tests/qna-rules.test.cjs` — 12개 통과. 방문자/회원 A/B/관리자, 비공개 직접 API 접근 차단, 데이터 누출·UID 위조 차단, 답변 권한, 원자적 상태 변경·전체 삭제, 동시 수정, 기존 NOTICE 규칙을 확인했다.
- UI: `tests/qna-browser.cjs` — 실제 Firebase 웹 SDK를 로컬 Firestore 에뮬레이터에 연결했다. UID는 테스트용 토큰과 계정 대역을 사용하며 실제 Authentication 계정을 생성하지 않는다. 검색/필터/7개 페이지/비공개 메시지/로그인 복귀/질문 CRUD/답변 CRUD/실시간 상태를 검증했다.
- 화면: 1920/1025/1024/769/768/390/320px에서 목록·상세·폼 가로 넘침 및 헤더 겹침 없음. 1920/390px 스크린샷을 직접 확인했다. 기존 로그인과 NOTICE 브라우저 회귀 검사도 통과했다.
- 에뮬레이터는 OS 임시 폴더의 Firebase CLI 14.12.0, rules-unit-testing 4.0.1, Firebase 11.10.0, JRE 21을 재사용했다. 프로젝트 운영 의존성을 추가하지 않았다. 테스트 도구 경로를 `HARO_RULES_MODULES`, 로컬 주소를 `FIRESTORE_EMULATOR_HOST=127.0.0.1:8089`로 전달한다. demo 프로젝트만 사용한다.
- 실제 서버 설정·실제 Authentication 계정 동작·실기기·Chrome 외 브라우저는 미검증이다. 참고 사이트는 도구에서 열리지 않아 기존 HARO NOTICE 디자인을 기준으로 했다.

## 관리자 버튼이 보이지 않을 때 (2026-11-06)

로그인 UID와 같은 users 문서의 role 문자열이 admin이면 관리자다. 별도 admins 문서를 추가할 필요는 없다. 기존 admins/{UID}.enabled:true 설정도 호환된다. 최신 account-service.js는 서버에서 프로필을 다시 읽고 모든 페이지가 갱신된 스크립트 버전을 사용한다. Firebase 콘솔에 최신 firestore.rules를 게시한 뒤 새로고침한다. 회원 프로필은 일반 가입 시 role:user로만 생성할 수 있고 일반 클라이언트 수정은 계속 차단된다. 관리자 권한을 해제할 때는 role을 user로 변경하고 기존 admins 문서의 enabled도 해제해야 한다.
