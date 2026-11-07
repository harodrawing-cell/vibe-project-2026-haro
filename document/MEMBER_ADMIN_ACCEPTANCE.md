# 실제 회원·관리자 운영 검증표

2026-11-08 작성. 운영자가 직접 실행할 절차이며, 아래 운영 로그인·가입·쓰기 검증은 아직 실행하지 않았다. 계정과 기존 게시글을 임의 변경·삭제하지 않는다.

## 준비

- 앱 주소: 개발 서버 `http://127.0.0.1:5173/react.html` 또는 빌드 미리보기 `http://127.0.0.1:4173/`. 서버가 실행 중인지 확인한다. 운영 사이트를 배포할 필요는 없다.
- 브라우저 프로필을 작성자 A, 다른 일반회원 B, 승인 관리자 M, 비로그인 G로 분리한다. 같은 프로필의 다른 탭은 로그인 상태를 공유하므로 구분용으로 사용하지 않는다.
- A/B는 사용 허가를 받은 회원, M은 관리자 승인 명단과 실제 UID를 대조한 계정으로 한다. 비밀번호·ID token을 채팅이나 작업 이력에 남기지 않는다.
- 이번 실행의 표시는 예를 들어 `HARO-QA-20261108-01`로 정한다. 공개 질문 제목은 `[TEST HARO-QA-20261108-01] 공개`, 비공개 질문 제목은 `[TEST HARO-QA-20261108-01] 비공개`, 본문·답변은 개인정보 없는 합성 문장만 사용한다. 비공개 제목은 공개 목록에서 가려지는 것이 정상이다.
- 작성한 테스트 문서 ID와 전용 계정 UID는 저장소 밖 제한된 테스트 대장에 기록한다. 이름/작성일/TEST 접두사만으로 삭제 대상을 선정하지 않는다.

## 1. 기존 로그인과 신규 가입

1. A로 기존 아이디·비밀번호 로그인. 본인 표시가 맞는지 확인하고 새로고침해 세션 유지와 프로필 로드를 확인한다.
2. 로그아웃 후 새 세션에서 틀린 비밀번호가 거절되는지 확인한다. 올바른 비밀번호로 다시 로그인한다. 실패 시 반복 시도하지 말고 오류 코드와 시각만 기록한다.
3. 가입은 별도로 허용한 신규 테스트 계정으로만 수행한다. 미사용 ID와 사용자가 관리하는 전용 이메일을 사용한다. 아이디 중복 확인→가입→완료 후 로그아웃→새 계정 로그인 순으로 확인한다.
4. 동일 ID 및 동일 이메일 중복 안내를 각각 확인한다. 정상이라면 생성 전 거절되어야 한다. UID 증가나 계정 추가가 발생하면 중단하고 부분 생성 여부를 점검한다.
5. 허가된 Console 운영자가 새 Auth UID와 users/{uid}, usernames/{id}, emails/{email}의 uid 일치, role:user를 확인한다. 예약문서는 uid 단일 필드인지 확인한다. Auth만 있고 프로필/예약이 누락됐다면 재가입·수동 삭제로 덮지 말고 오류를 기록한다.

로그인은 실제 이메일이 아니라 사이트 아이디로 한다. 회원가입은 실제 계정·문서를 생성하므로 읽기 전용 검증과 구분한다. 기존 계정의 비밀번호나 role을 시험용으로 바꾸지 않는다.

## 2. 작성자 A의 Q&A

1. 합성 공개 질문과 비공개 질문을 각각 작성한다. 저장 후 새로고침해 상세와 목록이 유지되는지 확인한다.
2. 비공개 질문은 A가 실제 제목·본문을 읽을 수 있어야 한다. G/B 목록에는 `비공개 질문입니다`와 `비공개`가 표시되고 본문/답변은 없어야 한다.
3. A가 자기 테스트 질문의 제목·본문을 수정하고 새로고침해 저장을 확인한다. 작성자 UID와 최초 작성일은 유지되어야 한다.
4. 공개 테스트 질문을 비공개로 바꿔 목록 마스킹과 G/B 서버 접근 거절을 확인한다. 이미 내려받은 내용이 다른 브라우저 캐시에서 사라진다고 기대하지 않는다.
5. 삭제는 관리자 답변 검증을 마친 뒤 아래 정리 단계에서 A가 수행한다. A의 기존 실제 질문은 사용하지 않는다.

## 3. 다른 회원 B와 비로그인 G의 차단

1. A의 비공개 상세 주소를 B/G의 새 세션에서 직접 연다. 실제 제목·본문·답변이 표시되지 않고 접근 거절되어야 한다. 버튼 숨김만으로 통과 처리하지 않는다.
2. 서버 검증이 필요하면 B 프로필의 DevTools Console에서 아래 **읽기 전용** 코드를 실행한다. 로컬 React 주소에서만 사용하고 ID는 위 전용 비공개 테스트 문서의 ID로 바꾼다. 내용이나 토큰은 출력하지 않는다.

```javascript
const service = (await import('/src/services/firebase.js')).default;
const { sdk, db } = await service.getClient();
for (const collection of ['qnaDetails', 'qnaAnswers']) {
  try {
    const snapshot = await sdk.getDocFromServer(
      sdk.doc(db, collection, '전용_비공개_테스트_문서_ID'),
    );
    console.log(collection, '예상과 다른 읽기 성공', snapshot.exists());
  } catch (error) {
    console.log(collection, error.code); // B/G: permission-denied 예상
  }
}
```

같은 읽기를 A/M 세션에서 실행하면 존재하는 두 문서 조회에 성공해야 한다. 위 코드는 개발 모듈 경로를 사용하므로 5173/react.html에서 실행한다. G의 인증 없는 REST 검사는 [최신 읽기 검증](LATEST_PUBLISH_VERIFICATION.md)의 방법을 따른다.

B의 A 질문 수정·삭제와 일반 회원의 관리자 답변 저장 거절은 Emulator에서 통과했다. 운영 음성 쓰기는 규칙 결함이 있으면 실제 저장될 수 있으므로 별도 합의된 테스트 문서에만 수행한다. 운영에서 실행하지 않았다면 Emulator 통과/운영 미실행으로 기록한다.

## 4. 관리자 M의 답변과 상태

1. 승인 관리자 M이 A의 비공개 테스트 질문을 읽을 수 있는지 확인한다. 관리자 UI 표시만으로 서버 권한을 통과 처리하지 않는다.
2. 비어 있던 답변에 합성 답변을 저장한다. 새로고침 후 답변 유지, 공개 목록의 답변완료 표시, Console qnaList/{id}.status == answered를 확인한다. 답변과 목록 상태는 함께 저장되어야 한다.
3. A는 답변을 읽을 수 있어야 하며 B/G는 여전히 비공개 질문·답변을 읽을 수 없어야 한다.
4. M이 자신이 작성한 답변을 수정하고 새로고침한다. 일반 회원이 관리자 답변을 편집할 수 없어야 한다.
5. 답변 삭제 기능을 실행하면 답변 내용은 빈 값으로 보존되고 목록 status는 waiting으로 바뀌어야 한다. qnaAnswers 문서 자체 삭제와 다르다. 다시 답변을 저장해 answered 복귀도 확인할 수 있다.
6. 현 구현상 다른 관리자가 작성한 비어 있지 않은 답변 수정은 제한되며 답변 삭제는 관리자에게 허용된다. 관리자는 질문 작성자가 아니면 질문 자체 수정·삭제 권한이 없다. 이를 정책 오류와 혼동하지 않는다.

답변 저장이 실패하면 users 프로필/name 유무와 두 관리자 권한 경로, 새 서버 응답을 확인한다. 문제 해결을 위해 role을 임의 승격하거나 전체 허용 규칙으로 되돌리지 않는다.

## 5. 안전한 정리

1. 정리는 검사 완료 후 테스트 대장의 **정확한 문서 ID**와 A 소유 여부를 재확인하고, 합의된 테스트 질문만 A의 앱 삭제 기능으로 수행한다. 앱은 qnaList/qnaDetails/qnaAnswers를 원자적으로 삭제한다.
2. Console의 읽기 전용 확인으로 같은 ID 세 문서가 모두 사라졌는지 확인한다. 컬렉션 전체 삭제, 접두사 일괄 삭제, 다른 회원 문서 삭제를 하지 않는다. permission-denied와 문서 부재는 서로 구분한다.
3. 실패·불일치가 있으면 대장에 남기고 중단한다. 고아 문서나 누락 예약을 임의 수동 수정하지 않는다.
4. 신규 테스트 회원은 기본적으로 유지한다. 계정 정리가 필요하면 정확한 UID, Auth 및 users/usernames/emails 매핑, 연결 게시글, 백업·개인정보 보존 정책을 확인하고 **별도 승인**을 받는다. Auth 계정 삭제만으로 Firestore 데이터가 자동 정리된다고 가정하지 않는다.
5. 테스트 후 각 프로필을 로그아웃하고 토큰이 들어간 Network 내보내기/HAR 파일을 공유하지 않는다.

## 6. 결과 기록과 완료 기준

각 항목을 `실행 시각 / A·B·M·G / 테스트 대장 참조 / 기대 결과 / 실제 결과 / 서버 오류 코드 / 통과·실패·미실행`으로 기록한다. 비밀번호·토큰·실제 게시글 내용을 첨부하지 않는다.

**완료된 기존 증거:** Emulator30/30, 회귀36/36. 2026-11-08 01:51:00 KST 운영 읽기에서 비공개 본문·답변403, 목록 마스킹, NOTICE7/Q&A2 조회 및 합성 가입 전 조회 정상.

**아직 미완료:** 실제 회원 로그인·세션 유지·가입, 운영 A/B/M 권한 및 질문 CRUD·관리자 답변/상태 변경, 테스트 정리 확인, 관리자 정당성/예약문서 오염 감사, Console 원문과 로컬 후보 비교. 이번 문서 작성으로 이 항목들을 통과 처리하지 않는다.

운영 기능 결과가 채워지고 실패 원인이 해결되어야 운영 보안 전체 완료를 판단할 수 있다. 계정 존재·UID 노출 과제 AUTH-PRIVACY-01 및 기존 디자인/실제 iPhone 검증은 별도로 남는다. GitHub Push·React 배포는 하지 않는다.


## 2026-11-08 Member A real-browser acceptance: PASS (user-reported)

User confirmed all five checks passed: A login; session retained after reload; private Q&A creation and Firebase save; owner private-detail read; public list title masked. These are completed user-executed production checks, not agent-observed automated results. See [result and next steps](MEMBER_A_TEST_RESULT.md). Exact execution time and test document ID were not supplied. B private access denial and M answer create/edit/remove with answered/waiting transitions remain pending. Other untested items remain pending. Only the user-created test question is in scope for eventual separately agreed cleanup; no data/account/rule changes, deletions, push or deployment were performed by the agent.


## 2026-11-08 Member B private-question access: PASS (user-reported)

User logged in as member B and confirmed the body of member A private Q&A question could not be viewed. Mark this specific check as passed by actual user browser testing, not agent-observed automation. See [B test result](MEMBER_B_TEST_RESULT.md). Exact execution time/document ID/server status were not supplied. Answer access and post-answer recheck are not inferred. Pending: A question edit/delete; M answer create/edit/remove and answered/waiting transitions. Complete M tests before deleting only the exact A-owned user-created test question. No production data/account/rule modifications or deletions, GitHub push or React deployment by the agent.
