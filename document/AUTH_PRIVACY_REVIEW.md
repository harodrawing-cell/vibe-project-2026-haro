# 인증 예약 컬렉션과 관리자 권한 점검

검토일: 2026-11-08(KST). 로컬 후보만 수정했으며 운영 규칙·계정·문서 변경, 삭제, Push, React 배포는 하지 않았다.

## 공개 get이 필요한 범위

기존 js/services/account-service.js와 React src/services/account.js 모두 확인했다.

| 동작 | usernames/emails 읽기 | 결론 |
|---|---|---|
| 로그인 | 아이디를 username@members.haro.invalid로 변환해 Firebase Auth에 직접 인증한다. 이후 자기 users 프로필과 필요 시 자기 admins를 읽는다 | 두 예약 컬렉션의 공개 get은 로그인에 필요하지 않음 |
| 아이디 중복 확인 | 비로그인 checkId가 usernames/{정규화아이디}의 존재를 읽음 | 현재 UI/구조를 유지하려면 정확한 키의 비로그인 읽기 필요 |
| 가입 전 확인 | Auth 생성 전 usernames와 emails의 존재를 읽음 | 단순히 로그인 조건을 붙이면 현재 가입 실패 |
| 가입 트랜잭션 | Auth 생성 후 두 예약문서를 다시 읽고 users/예약2개를 원자적으로 생성 | 이 시점은 인증 상태이나 현재 구현은 문서 읽기 권한 필요 |

따라서 **무조건적인 allow get:true 자체는 필수가 아니지만, 현재 가입 구현에는 제한된 비로그인 get 경로가 필요**하다. 기능을 유지하면서 공개 접근을 완전히 없앴다고 주장하지 않는다.

## 최소 수정 적용

firebase/firestore.rules의 두 예약 컬렉션만 다음과 같이 강화했다.

- usernames: 기존 가입/정규화와 같은 소문자·숫자·밑줄4~20자 키만 조회 허용.
- emails: 기존 저장과 같은 소문자·유효 형식·254자 이하 키만 조회 허용.
- 없는 유효 키는 읽어서 exists:false 확인 가능.
- 존재하는 예약문서는 **uid 문자열 한 필드만 있을 때** 읽기 허용. 예전 공개 기간에 이름·이메일·개인 메모 등을 추가한 문서는 전체 읽기를 거부한다.
- collection list/query와 클라이언트 update/delete 금지는 그대로. users/admins/NOTICE/Q&A 권한, 앱 코드와 데이터 형식은 유지한다.
- 수정 전 후보는 firebase/backups/20261108/reservation-before.rules에 보존했다. 그 이전 원본 local-before.rules도 유지한다.

Firestore 규칙은 문서 일부 필드만 숨겨서 반환하지 못한다. 따라서 추가 필드가 있는 문서의 uid만 골라 주는 것이 아니라 문서 읽기 전체를 거부하도록 구현했다. [Firebase 공식 문서](https://firebase.google.com/docs/firestore/security/rules-fields)

**남는 노출:** 유효한 아이디/이메일을 추측하면 가입 여부와 해당 uid를 알아낼 수 있다. list 거부·형식 제한·필드 검사는 대량 추측이나 이 UID 매핑 노출을 없애지 않는다. 회원 디렉터리 또는 개인정보 보호가 완성됐다는 의미가 아니다. 특히 이메일 존재 여부는 공개 식별 정보가 될 수 있다.

**운영 전 확인:** 기존 예약문서가 uid 외 필드를 가지고 있으면 새 규칙에서 해당 중복 확인/가입이 permission-denied가 될 수 있다. 허가된 관리자가 읽기 전용으로 구조를 점검하고, 발견 시 별도 처리 범위를 승인받아야 한다. 자동으로 문서를 삭제하거나 필드를 정리하지 않는다. 기존 로그인은 이 예약문서를 읽지 않는다.

## 더 강한 개선안 — 이번에는 미적용

가장 강한 방향은 예약 컬렉션을 비공개로 만들고 신뢰할 수 있는 서버의 중복 확인/예약 API로 바꾸는 것이다. 응답은 UID나 문서 전체 대신 필요한 최소 결과만 제공하고, App Check/요청 제한/반복 시도 탐지 등을 설계한다. 이메일은 공개 사전 중복 확인을 없애거나 일반화한 실패 안내와 실제 이메일 소유 확인 흐름을 검토한다. 사용자에게 중복 여부를 알려주는 기능 자체가 존재 여부 oracle이므로 서버 API만 두었다고 추측 위험이 사라지지 않는다.

이 방식은 현재 Spark/클라이언트 직접 가입 구조의 범위를 넘는다. 신뢰 서버의 호스팅·비용·장애 처리·가입 원자성·Auth 생성 롤백을 함께 결정해야 한다. 이번 작업에서 Cloud Functions/요금제/인증 방식을 바꾸지 않았다.

`request.auth != null`만 붙이면 비로그인 가입을 깨뜨리면서도 로그인한 공격자의 추측 조회는 남는다. 이메일 키 해시화만으로도 추측 가능한 이메일 사전을 막지 못하며, 기존 데이터 이동도 필요하므로 단독 보안책으로 적용하지 않는다.

## 공개 기간에 만들어진 관리자 권한을 점검하는 안전한 방법

현재 관리자는 **users/{uid}.role == admin OR admins/{uid}.enabled == true**다. 두 경로 중 하나만 남아도 관리자다. 새 규칙은 앞으로의 클라이언트 승격을 막지만 과거 전체 허용 기간에 저장된 role/enabled의 정당성을 증명하거나 취소하지 않는다. 앱에서 관리자라고 표시되는 것 자체를 승인 근거로 삼으면 안 된다.

1. 앱의 role이 아닌, 신뢰하는 Google 계정의 Firebase Console/IAM 권한으로 대상 프로젝트와(default)를 확인한다. 이 단계에서는 조회·백업만 한다.
2. users의 role:admin 문서와 admins의 enabled:true 문서를 **둘 다** 확인하고 UID의 합집합을 만든다. role이 없거나 user인 계정도 admins:true이면 포함한다. 비정상 role/필드 형식, 예약문서의 추가 필드도 점검한다.
3. 로컬의 제한된 감사 기록에 UID, 관리자 근거, 실제 Auth 사용자 존재/disabled 상태, 승인 근거, 점검자/확인일을 기록한다. 이메일 등 개인 정보는 필요한 최소만 보관하고 저장소나 채팅에 전체 회원 자료·인증 토큰·서비스 계정 키를 올리지 않는다.
4. Authentication의 UID와 대조하고, 별도로 확보한 **신뢰할 수 있는 관리자 승인 명단/업무 기록**과 교차 검증한다. 공개 기간의 users 문서 이름·아이디·createdAt/updatedAt은 공격자가 썼을 수 있어 단독 증거로 쓰지 않는다. 감사 로그가 남아 있다면 함께 확인하되 로그 존재를 가정하지 않는다.
5. `승인됨 / 소유자 확인 필요 / 승인 근거 없음 / Auth 사용자 없음`으로 구분한다. 승인되지 않았다는 이유만으로 이번 작업에서 계정·문서를 삭제하거나 role을 내리지 않는다.
6. 변경이 필요하면 대상 UID·근거·양쪽 권한 경로·백업·복원 계획을 제시하고 별도 승인을 받는다. 승인된 정리 단계에서는 users.role과 admins.enabled 양쪽을 다 검토해야 한다. 필요하면 해당 계정의 세션 회수도 검토하되 실제 실행은 별도 권한 변경이다.
7. 조치 후 각 승인 관리자와 일반 회원을 분리해 Emulator 및 허가된 기존 검증 계정으로 재검사한다. 임의로 모든 관리자 접근을 끊어 복구 경로를 잃지 않도록 한다.

현재 관리 인증/신뢰 승인 명단이 없으므로 **실제 운영 admins/users의 정당성 점검은 미실행**이다. 일반 앱 SDK로 회원 전체를 읽거나 공개 정책을 다시 열어 감사하지 않는다. 운영 전 승인 명단 대조가 남아 있다.

## 실제 실행한 검증

Auth9099와 Firestore8089 Emulator를 함께 실행했다. demo-haro-account-live 등 demo 프로젝트만 썼으며 운영 계정을 생성·수정·삭제하지 않았다. 원본 JS와 React 서비스의 실제 코드를 각각 불러와 SDK 호출을 로컬 Emulator에 연결했다.

**전체 보안/통합30개 통과:** 기존 NOTICE6 + Q&A7 + 보안14 + 신규 인증/예약검사3.

- 기존 JS/React 각각: 비로그인 ID 미사용 확인 → 실제 Auth Emulator 가입 → Firestore users/예약3문서 원자 저장 → role:user 확인 → 가입 후 로그아웃 → 중복ID/이메일 거부 → 틀린 비밀번호 거부 → 대문자ID 정규화 후 올바른 비밀번호 로그인 → 자기 프로필 읽기 → role승격 거부 → 로그아웃 확인.
- 기존/새 유효 예약키 읽기 허용, 목록·잘못된 형식 키·추가 개인정보 필드가 있는 예약문서 읽기 거부 확인.
- Q&A 질문 생성·수정·3문서 전체삭제, 관리자 답변 작성·수정·내용삭제, 비공개 본문/답변 권한, UID/권한/상태 위조 차단 재통과.
- 공개 목록의 비공개 제목/작성자 마스킹과 content/answer 필드 제외, 실제 제목 삽입 거부 재통과.
- NOTICE 방문자 읽기/쓰기거부, 작성자 자기 글 관리·불변필드, 타인UID·동일이름 거부, 관리자 타인·레거시 글 관리 재통과.
- 기존 기능 회귀36개도 재통과했다. 실제 계정 생성은 Emulator에서만 수행했다.

테스트 하네스의 VM 객체를 SDK가 다른 realm 객체로 거부한 초기 실패를 발견했다. 하네스의 트랜잭션 입력 JSON만 정규화하여 실제 Emulator SDK에 넘기도록 수정했고 앱 코드를 바꾸지 않았다. 권한 검사를 우회하거나 대역 인증 성공으로 바꾼 것이 아니다.

근거: tests/account-emulator.test.cjs, tests/qna-security.test.cjs, tests/qna-rules.test.cjs, tests/notice-rules.test.cjs 및 test-results/security/reservation-review-run.log. 실행 명령은 scripts/test-security.ps1이며 테스트 후 두 Emulator를 종료한다. [Auth Emulator 공식 연결 방식](https://firebase.google.com/docs/emulator-suite/connect_auth)

## 미검증과 운영 적용

운영 가입·로그인 성공·신규 예약 규칙 적용 후 동작은 Emulator 결과와 구별한다. 로컬 후보만 바꿨으며 운영 규칙 게시는 하지 않았다. 운영 데이터 구조 및 관리자 정당성 감사, 후보 게시 승인, 게시 후 서버 직접 API 검증이 필요하다. 이전 운영 REST 실패 이력은 별도 실제 읽기 결과가 없는 한 해결됐다고 취급하지 않는다.


## 2026-11-08 Account privacy and permission review

See [full review](SECURITY_REVIEW_20261108.md). Auth/Firestore Emulator: 30/30 passed; regression: 36/36 passed. Production read-only check at 01:34:33 KST: private Q&A body and answer SDK denied, REST403, no content fields; public NOTICE7 and Q&A2 readable, private metadata masked. This supersedes earlier200 observations. New reservation read restrictions are local only; production administrator legitimacy audit, real account login and writes remain unverified. No production data/rules changes, push or deployment.


## 2026-11-08 Production administrator audit and release checklist

Prepared [operator checklist](PRODUCTION_SECURITY_CHECKLIST.md): read-only audit of both administrator sources, approved remediation and backup, Console-versus-local full-text comparison, postpublish G/A/B/M account test matrix, and residual privacy backlog AUTH-PRIVACY-01. Exact production rules equality and administrator legitimacy remain unverified. Previous Emulator30/regression36 and production private REST403 results are historical evidence, not newly rerun or full production acceptance. No account/data/rule mutations, push or deployment.
