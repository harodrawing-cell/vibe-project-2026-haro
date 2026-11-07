# Q&A 운영 보안 규칙 변경안

> Latest 2026-11-08 01:34:33 KST: private body/answer REST403 and SDK denied; public metadata masked. Earlier200 observations are historical. Local reservation candidate not published. See [review](SECURITY_REVIEW_20261108.md).

> 최신 운영 확인(2026-11-08 01:22 KST): 사용자가 게시 완료를 알렸으나 실제 무인증 SDK/REST에서는 비공개 본문·답변이 계속HTTP200 및content필드로 반환됐다. **운영 보안 검증 실패/배포 보류**다. 아래 미게시 문구는 후보 준비 당시 상태이며 최신 결과는 REACT_MIGRATION.md의 게시 후 검증 절을 따른다. 실제 Console 원문·대상·게시 상태를 다시 확인해야 한다.

작성일: 2026-11-08(KST). **로컬 수정 및 Emulator 검증 완료, 운영 미게시.**

Firebase Console에 게시할 전체 후보 코드는 [firebase/firestore.rules](../firebase/firestore.rules)이다. 이 파일은 NOTICE/회원/Q&A/기본 차단을 모두 포함한 전체 규칙이며 일부 발췌가 아니다. 아직 운영 문제가 해결됐다는 뜻은 아니다.

최신 예약 컬렉션 최소화 검토 후 후보 SHA-256: `9b5948a06c5f36d2acb18a33f013ba875f5118c7a324b3680924159436d8ddec`. 이전 c7098adb 후보는 reservation-before.rules에 백업했다. 최신 Auth/Firestore Emulator30개와 기능 회귀36개가 통과했으며 상세 분석·관리자 감사 절차·남는 UID/존재 여부 노출은 [AUTH_PRIVACY_REVIEW.md](AUTH_PRIVACY_REVIEW.md)를 따른다. 아래27개 결과는 이전 단계 검증 기록이다.

## 확인한 원인과 인증 유형

사용자가 Console에서 **2026-12-06까지 모든 Firestore 문서의 읽기·쓰기를 허용**하는 운영 정책을 확인했다. 프로젝트는 haro-web-project, 데이터베이스는(default)다. 기존 로컬 규칙은 Q&A 비공개 접근을 제한하고 있었지만 서버에 적용된 전체 허용 정책과 달랐다.

실제 무인증 REST GET은 비공개 qnaDetails.isPublic:false 문서에 HTTP200을 반환했고 실제 title(9자)/content(38자) 필드가 있었다. 같은 질문의 qnaAnswers에도 실제 content(39자)가 포함된 HTTP200 응답이 왔다. 내용·작성자·문서ID는 기록하지 않았다. 요청에는 Authorization/Firebase ID Token/OAuth 토큰/서비스 계정이 없었고 credentials:omit였다. 따라서 서비스 계정으로 규칙을 우회한 테스트가 아니다. 쓰기 허용은 사용자가 Console에서 확인했으며 운영 데이터에 직접 쓰기를 시도하지 않았다.

REST의 인증 방식에 따라 규칙 또는 IAM 적용 방식이 달라지므로 이 구분을 유지한다. [공식 REST 인증 안내](https://firebase.google.com/docs/firestore/use-rest-api)

전체 허용 match가 남아 있으면 다른 match에 제한을 추가하거나 마지막에 false를 써도 차단되지 않는다. 겹치는 규칙 중 하나가 허용하면 요청이 허용된다. [공식 규칙 구조](https://firebase.google.com/docs/firestore/security/rules-structure)

## 백업 상태

- 로컬 수정 전 전체 원본: `firebase/backups/20261108/local-before.rules`.
- 원본 SHA-256: `e70b9f36741c6ec13d22a4f760b5930f554bb4ba038cd1fc5f38feb526e6ecfc`.
- 실제 Console 원문 백업: **미확보**. 관리 API는 비인증 요청에403/PERMISSION_DENIED를 반환했다. 사용자에게서는 정책 설명을 받았으며 전체 코드 문자열은 받지 않았다. 원문을 임의로 재구성해 운영 백업이라고 부르지 않는다.
- 게시 전 Console의 현재 전체 코드를 별도 `deployed-before.rules`로 복사하고 프로젝트/DB/확인일을 기록해야 한다. 이후 전체 차이를 검토하고 승인받는다. 로컬 원본 백업은 운영 원문과 구분해 보존한다.

## 변경 전후

운영 변경 전(사용자 확인): 모든 경로에 대해2026-12-06까지 read/write 허용. 정확한 코드가 아닌 정책 설명이다.

기존 로컬 Q&A 읽기:

```text
qnaReadable(d) = d.isPublic || 본인 || 관리자
```

후보 코드:

```text
qnaReadable(id,d) = (상세.isPublic == true && 공개목록문서존재 && 목록.isPublic == true)
                   || 로그인UID == 상세.authorUid || 보호된관리자
```

목록과 상세의 공개 여부가 수동 변경/레거시 데이터로 불일치하면 일반 공개 읽기를 차단한다. 본인과 관리자는 확인할 수 있다. qnaDetails/qnaAnswers는 문서별 get만 허용하며 컬렉션 list는 명시적으로 금지했다. 마지막 wildcard는 read/write:false이며 후보에는 날짜 기반 전체 허용이 없다. 이 false는 위의 다른 true를 취소하는 기능이 아니다.

NOTICE 및 회원/관리자 규칙 블록은 로컬 수정 전과 동일함을 자동 비교했다. firebase.json도 기존 규칙 경로 그대로다. React/기존 HTML·CSS·JS·상품 JSON·이미지·localStorage 형식은 변경하지 않았다.

## 최종 권한표

| 대상 | 읽기 | 변경 |
|---|---|---|
| notices | 누구나 | 로그인 회원 본인 UID로 생성, 작성자/관리자만 수정·삭제, 작성자/UID/최초 날짜 불변 |
| qnaList | 누구나, 비공개는 마스킹된 제목/작성자와 메타만 | 상세/답변과 원자적 일치 강제, 임의 내용 필드 삽입 금지 |
| 공개 qnaDetails/qnaAnswers | 목록과 상세가 모두 공개인 경우 누구나 | 질문 본인만 수정·삭제, 답변은 관리자만 |
| 비공개 qnaDetails/qnaAnswers | 작성자/관리자만 | 질문 본인만 수정·삭제, 답변은 관리자만 |
| users/{uid} | 로그인한 본인만 get, 목록 금지 | 신규 일반회원 프로필 생성만. role:user 강제, 이후 클라이언트 수정/삭제 금지 |
| usernames/emails | 중복 확인에 필요한 정확한 키 get만, 목록 금지 | 가입3문서 트랜잭션의 자기 UID 예약만, 수정/삭제 금지 |
| admins/{uid} | 로그인한 본인만 get | 클라이언트 생성/수정/삭제/목록 모두 금지 |
| 그 밖의 경로/하위 컬렉션 | 기본 거부 | 기본 거부 |

관리자는 보호된 users.role:admin 또는 admins.enabled:true로 확인한다. 회원이 role을 올리거나 admins 문서를 생성할 수 없다. 일반 가입자는 질문과 함께 **빈 답변 자리 문서**를 원자적으로 생성할 수 있으나 답변 내용 작성 권한은 없다. 답변 삭제는 기존 서비스처럼 관리자가 내용을 비우고 waiting 상태로 바꾸는 방식이다. 질문 작성자가 질문 자체를 삭제하면 관련3개 문서를 함께 제거한다. 관리자도 타인의 질문을 수정·삭제할 수 없고 기존 답변 수정은 해당 관리자 작성자에게만 허용하는 기존 정책을 유지했다.

## 테스트 결과

실제 Firebase Emulator, 로컬127.0.0.1:8089, demo-haro-security/demo-haro-qna/demo-haro-notice만 사용. firebase-tools14.12.0, rules-unit-testing4.0.1, 테스트용 Firebase11.10.0, 임시 Temurin JRE21.0.13. 앱 SDK12.6.0과 운영 계정은 그대로다. 테스트 도구는 OS 임시 폴더에 격리했으며 전역 설치를 하지 않았다.

**Emulator27개 통과:** 기존 NOTICE6개 + Q&A7개 + 이번 보안14개.

| 필수 시나리오 | 결과 |
|---|---|
| 1 비로그인 → 공개 질문/답변 | 허용 |
| 2 비로그인 → 비공개 질문/답변 | 거부 |
| 3 다른 회원 → 비공개 질문/답변 | 거부 |
| 4 작성자 → 본인 비공개 질문/답변 | 허용 |
| 5 관리자(role/admins 양쪽) → 비공개 질문/답변 | 허용 |
| 6 비로그인 → 질문 생성 | 거부 |
| 7 회원 → 본인 질문 생성/수정/원자적 삭제 | 허용 |
| 8 다른 회원 → 질문 수정/삭제 | 거부 |
| 9 일반 회원 → 답변 작성/상태 위조 | 거부 |
| 10 관리자 → 답변 작성/수정/내용 삭제 | 허용 |

추가: UID/role/admins 위조, 비공개 목록 제목/본문 누출, 목록·상세 공개 플래그 불일치, 보호 컬렉션 전체 조회, 알 수 없는 경로 쓰기 차단을 확인했다.

**Emulator REST:** Authorization 없는 공개 문서GET은200. Authorization 없는 비공개 질문·답변과 타인 토큰 요청은403/PERMISSION_DENIED이며 fields가 없다. 본인/관리자 REST는200. 인증 REST에는 Emulator 전용 unsigned 사용자 토큰만 사용했으며 서비스 계정·특수한 `Bearer owner` 규칙 우회는 쓰지 않았다. withSecurityRulesDisabled는 로컬 테스트 자료 준비에만 사용했다.

회귀36개(인증/NOTICE/Q&A/상품/STORY/React 서비스)와 npm run build 통과. 브라우저 검사는 test-results/react/report.json을 따른다. 운영 적용 후 REST403은 아직 검증할 수 없다. 아직 게시하지 않았기 때문이다.

## 반복 실행

이미 준비된 임시 도구를 사용한다:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-security.ps1
```

새 환경에서는 별도 임시 디렉터리에 firebase-tools14.12.0, @firebase/rules-unit-testing4.0.1, firebase11.10.0을 설치하고 그 디렉터리의 java 아래에 JRE21을 풀어 `-ToolsPath 경로`로 지정한다. config/cache/PATH 변경은 실행 프로세스 안에서만 사용한다. Firebase 운영 프로젝트를 지정해 테스트하지 않는다. 공식 테스트 방식은 [Rules 단위 테스트](https://firebase.google.com/docs/rules/unit-tests)를 따른다.

증거: `test-results/security/emulator-tests.log`, `test-results/security/live-before.json`. 운영 REST 감사는 읽기만 하지만 호출마다 실제 읽기 비용이 생길 수 있으므로 게시 후 필요한 재검증 때만 수행한다.

## 승인 후 Console 적용 절차 — 아직 실행하지 않음

1. Firebase Console에서 프로젝트 **haro-web-project**, Firestore **(default)**의 Rules 탭을 확인한다.
2. 현재 전체 규칙 원문을 별도 파일로 백업한다. 후보와 NOTICE/회원/기타 실제 서비스 컬렉션을 대조한다. 로컬에 없는 서비스가 있으면 정책을 먼저 검토한다.
3. 사용자에게 전체 후보/백업/테스트 결과를 보고하고 **운영 규칙 게시 승인**을 받는다.
4. 승인 후 Rules 편집기 내용을 [firebase/firestore.rules](../firebase/firestore.rules) **전체로 교체**한다. 기존 날짜 기반 전체 allow는 남기지 않는다. 제한만 추가하는 방식은 사용하지 않는다.
5. Console에서 규칙 오류를 확인한 뒤 Publish한다. Rules만 게시하며 Authentication 설정·데이터 문서·인덱스·React hosting·GitHub를 변경하지 않는다.
6. 반영 후 별도 비로그인 세션의 무인증 REST로 비공개 본문/답변이403이며 실제 fields를 반환하지 않는지 확인한다. 공개 목록/공개 글은200이어야 한다. 배포 전 새 세션으로 재검사한다.
7. 전용 검증 계정으로 본인/타인/관리자의 실서버 읽기·쓰기와 로그인/가입을 확인한다. 운영 데이터 보존을 위해 테스트 데이터 생성·삭제 범위는 별도 승인받는다.

현재는 관리 인증과 운영 원문 백업이 없고 게시 승인도 없으므로 CLI/Console에 게시하지 않았다. 로컬 테스트 통과만으로 실서버 보안 문제 해결을 선언하지 않는다. **React 사이트 배포는 운영 규칙 적용·실서버 권한 재검증 이후에도 별도 승인 대상**이다.

문제가 생겨도 전체 허용 테스트 규칙으로 자동 롤백하지 않는다. 서비스별 거부 원인을 확인해 최소 수정하고 다시 검증한다. 전체 허용 원문은 이력·비교 자료이며 안전한 복원본이 아니다.

## Console 게시 직후 읽기 전용 점검

게시 완료 후 개발/preview 서버가 실행 중인 상태에서 다음을 실행한다. 이 명령은 기존 계정/게시글을 생성·수정·삭제하지 않으며, Firebase 관리 권한도 쓰지 않는다.

```powershell
node tests/react-final-readonly.cjs
```

`test-results/react-final/readonly-report.json`에서 다음을 확인한다:

- `firebase.qna.value.privateDetail.unauthenticatedREST.value.httpStatus`: **403**.
- `firebase.qna.value.privateAnswer.unauthenticatedREST.value.httpStatus`: **403**.
- 두 응답의 `contentFieldPresent`: **false**. 401/404만 확인한 결과를 비공개 규칙 검증 성공으로 간주하지 않는다.
- 실제 NOTICE/Q&A 목록 화면은 정상 로딩되고, 공개 Q&A 상세는 계속 읽힌다.
- `releaseDecision`이 blocked이거나 private REST가200이면 보안 해결 완료로 처리하지 않는다. 게시 대상 프로젝트/DB/규칙 내용·반영 상태를 확인한다.

작성자/타인/관리자 읽기는 허가된 기존 검증 계정으로 별도 확인한다. 회원가입 및 글쓰기·수정·삭제는 운영 데이터 변경이므로 이번 데이터 보존 범위에서는 운영에 실행하지 않고 Emulator 검증 결과와 구분한다. 로그인은 Authentication과 Firestore 프로필 읽기를 함께 확인해야 한다. 신규 운영 계정 생성이나 기존 글 변경은 별도 허용 범위를 정하기 전 수행하지 않는다.
