# Firebase Spark 무료 회원가입·로그인

## 현재 방식

- 프로젝트 haro-web-project의 Authentication(이메일/비밀번호)와 Firestore (default)만 사용한다. Cloud Functions·Blaze·결제 계정·Storage는 필요 없다. 무료 할당량 내에서 사용한다.
- 기존 로그인·회원가입 화면과 아이디 로그인을 유지한다. js/services/account-service.js가 웹 SDK로 직접 처리한다.
- 인증 전용 주소는 `아이디@members.haro.invalid` 형식이다. 입력한 실제 이메일은 Firestore 회원 정보에 저장하며 Auth 콘솔에는 내부 주소가 표시된다. 내부 주소로 메일을 수신할 수 없어 이메일 인증·비밀번호 재설정 메일은 제공하지 않는다. 비밀번호는 Authentication만 관리한다.
- users/{uid}에 이름·아이디·실제 이메일·role·생성일을 저장한다. 일반 가입의 role은 문자열 user로 고정한다. usernames/{아이디}와 emails/{소문자 실제 이메일}에는 UID를 저장한다. 세 문서를 한 트랜잭션으로 생성해 중복을 방지한다. 회원 목록 조회는 금지하며 중복 확인용 특정 키 get만 공개 허용한다.
- admins/{uid}의 enabled:true가 관리자 권한의 근거다. 클라이언트 쓰기는 금지한다. 프로필의 admin 필드나 브라우저 상태로 관리자 권한을 얻을 수 없다.
- 네트워크 실패로 가입 커밋 결과가 불명확하면 Auth 계정을 자동 삭제하지 않는다. 미완료 가입으로 ID만 점유된 경우 Auth/Firestore를 콘솔에서 확인해야 한다.

## 무료 설정 순서 (필수)

1. Firebase 콘솔 → Authentication → 로그인 방법 → 이메일/비밀번호 활성화. Spark 요금제 유지.
2. Firestore → 규칙에서 `firebase/firestore.rules`를 검토해 게시한다. 다른 기능의 기존 규칙이 있다면 보존해 병합한다. 파일 저장만으로 서버에는 반영되지 않는다. 이전 공개 테스트 규칙을 사용하면 관리자 권한/회원 중복 보호가 적용되지 않는다.
3. 일반 가입을 시작하기 전에 관리자 계정을 수동 생성한다. Authentication → 사용자 추가: 인증 이메일 `admin@members.haro.invalid`, 비밀번호는 사용자가 지정한 6자리 값. Auth UID를 복사한다. 입력한 실제 관리자 이메일과 내부 인증 이메일을 구분한다.
4. Firestore 콘솔에서 아래 문서를 생성한다.
   - `users/{UID}`: name = 관리자, username = admin, email = admin.com@company.co.kr, role = admin (문자열), createdAt = 현재 ISO 날짜 문자열.
   - `usernames/admin`: uid = 위 UID.
   - `emails/admin.com@company.co.kr`: uid = 위 UID.
   - `admins/{UID}`: enabled = true (불리언).
5. 웹에서는 아이디 `admin`과 지정한 비밀번호로 로그인한다. 일반 회원은 가입 폼으로 생성한다. admin 아이디와 관리자 실제 이메일은 일반 가입에서 차단한다. 로그인 후 상단에는 환영 문구와 로그아웃 버튼을 표시한다.
6. 필요한 인증 흐름에서 승인 도메인을 요청하면 실제 호스트/로컬 주소를 콘솔에서 등록한다. HTTP 미리보기로 테스트한다.

관리자 생성과 서버 규칙 게시는 코드 수정만으로 완료되지 않는다. 콘솔에서 처리할 수 있어 배포용 비공개 키나 CLI 로그인이 필요 없다. 비공개 키를 채팅에 공유하지 않는다.

## 파일과 검증

- firebase.json에는 Firestore 설정만 유지하고 functions 배포 대상을 제거했다.
- api/의 이전 서버 함수와 register-admin.cjs는 과거 구현 자료로 보존한다. 현재 무료 방식에서는 사용하거나 배포하지 않는다. 이전 관리자 등록 스크립트는 현재 내부 주소/권한 방식과 다르므로 실행하지 않는다.
- NOTICE 글·이미지·WebP/Base64 및 JSON 950,000바이트 제한은 유지한다. 로컬 글 자동 업로드 없음.
- tests/account.test.cjs의 무료 클라이언트 검증과 기존 회귀 검사를 실행한다. 이전 server 관련 검사는 보존된 api/ 코드 검사다.
- tests/account-browser.cjs는 실제 비로그인 SDK 초기화 후 계정 대역으로 UI를 검증한다. 실제 Firebase 인증 성공이나 보안 규칙 검증을 의미하지 않는다.
- 실제 회원가입·관리자 계정 생성·서버 권한 차단 검증은 콘솔 설정 후 필요하다.

공식 무료 요금제: https://firebase.google.com/pricing

## 글쓰기 권한 변경 (2026-11-06)

일반 회원도 로그인하면 글쓰기가 가능하다. 수정·삭제는 작성자 UID가 일치하는 회원 또는 관리자만 허용한다. 신규 글에 authorUid를 저장하고 Firebase 규칙에서 인증 UID와 프로필의 작성자 이름을 검사한다. 이 변경을 서버에서 사용하려면 firebase/firestore.rules를 콘솔에서 다시 게시해야 한다. 기존 authorUid 없는 글도 관리자 수정은 가능하다. 로그아웃 버튼은 환영 문구 옆에 표시하며 누르면 세션을 종료하고 화면을 갱신한다.

회원 프로필 필드는 createdAt/email/name/role/username의 문자열 5개다. 일반 가입은 role:user, 관리자 수동 프로필은 role:admin을 사용한다. role 필드 자체는 권한 근거가 아니며 관리자 권한은 기존 보호된 admins/{uid}.enabled 문서로 확인한다. 기존 회원 문서를 자동 변경하지 않는다.

## 작성자·관리자 수정/삭제 권한

- 작성자 확인은 authorUid와 인증 UID만 비교한다. 이름·닉네임·role 입력으로 소유권을 판단하지 않는다.
- 새 글의 authorUid/author는 로그인 사용자에서 저장하고, 수정 시 authorUid·author·createdAt은 변경할 수 없다. 다른 회원 글은 관리자만 관리한다.
- authorUid가 없는 이전 글은 관리자만 수정·삭제한다. 작성자 이름으로 자동 매핑하지 않는다. 소유권 복구가 필요한 경우 원본 백업 후 신뢰할 수 있는 작성 기록과 Authentication UID를 수동 대조하고, 콘솔에서 해당 글의 authorUid만 명시적으로 부여한다. 추측 기반 일괄 이전은 하지 않는다.
- firebase/firestore.rules를 Firebase 콘솔에 다시 게시해야 운영 DB에도 새 권한이 적용된다. 이번 작업은 로컬 규칙만 변경하고 실제 서버 규칙이나 게시글은 수정하지 않았다.
- node tests/notice-permissions-browser.cjs: 임시 브라우저 저장소의 테스트 글로 UI·권한·수정·삭제·반응형 검사.
- tests/notice-rules.test.cjs: 로컬 Firestore 에뮬레이터에서만 실행하는 실제 규칙 검사. HARO_RULES_MODULES에 firebase와 @firebase/rules-unit-testing이 설치된 경로를 지정하고 FIRESTORE_EMULATOR_HOST=127.0.0.1:포트를 설정한다. 프로젝트 ID는 demo-haro-notice로 고정되어 운영 DB에서 실행하지 않는다. 테스트 도구와 Java는 OS 임시 폴더에만 설치했다.
