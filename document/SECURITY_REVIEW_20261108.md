# 인증·개인정보 권한 재검증 — 2026-11-08

현재 로컬 후보 SHA256: `9b5948a06c5f36d2acb18a33f013ba875f5118c7a324b3680924159436d8ddec`. 운영 게시·데이터 수정·GitHub Push·React 배포는 하지 않았다.

## 최소 수정과 남는 노출

로그인은 Auth를 직접 사용하므로 usernames/emails 공개 조회에 의존하지 않는다. 현재 가입·중복 확인은 인증 전 정확한 키 조회를 사용하므로 인증 필수로 바꾸면 가입이 깨진다. 정상 키 형식과 uid만 가진 기존 예약문서 또는 미존재 문서에만 get을 허용하도록 로컬 규칙을 좁혔다. list/update/delete 금지는 유지했다. 추가 개인정보 필드가 있는 예약문서는 전체 조회를 차단한다.

유효한 키를 추측하면 여전히 가입 여부와 UID가 노출된다. 서버 중복확인 API·요청 제한·이메일 소유 확인은 별도 개선 과제다. 운영 공개 기간에 오염된 예약문서가 있다면 새 후보 적용 후 중복 확인이 거부될 수 있으므로 게시 전 읽기 전용 구조 감사가 필요하다. 데이터를 자동 정리하지 않는다.

이전 후보는 `firebase/backups/20261108/reservation-before.rules`에 보존했다. 앱 코드와 기존 NOTICE/users/admins 규칙 블록은 변경하지 않았다. 세부 분석과 관리자 감사 절차는 [AUTH_PRIVACY_REVIEW.md](AUTH_PRIVACY_REVIEW.md)를 따른다.

## 실제 실행 결과

- Auth·Firestore Emulator **30/30 통과**: NOTICE6, Q&A7, 보안14, 인증/예약3. 기존JS·React 실제 서비스 코드 각각으로 Auth 가입, 3문서 원자 저장, role:user, 가입 후 로그아웃, 중복ID/이메일 거절, 틀린 비밀번호 거절, ID 정규화 로그인, 프로필 읽기, role승격 차단을 확인했다.
- Q&A 질문 생성·수정·3문서 원자 삭제, 본인/타인/관리자 읽기, 관리자 답변 작성·수정·내용 삭제, 일반회원 답변 차단을 확인했다. 비공개 공개목록 제목/작성자 마스킹, 본문·답변 필드 배제와 실제 제목 삽입 거절도 통과했다.
- NOTICE 공개 읽기·회원 작성·작성자 관리·관리자 타인 글 관리·작성자 불변 필드를 검증했다. 기존 기능 회귀 **36/36 통과**.
- VM 객체 realm 문제는 테스트 하네스의 트랜잭션 JSON 입력 정규화로 수정 후 전체 재실행했다. 실제 SDK와 규칙을 우회하지 않았다. 로그: `test-results/security/reservation-review-run.log`, `emulator-tests.log`.

## 최신 운영 읽기 결과 — 01:34:33 KST

프로젝트 haro-web-project/(default), 새 Edge 컨텍스트 signedIn:false로 검사했다. NOTICE7개, Q&A공개목록2개와 공개 상세 조회에 성공했다. 비공개 목록 마스킹은 true였다.

비공개 본문·답변은 모두 SDK permission-denied, REST **HTTP403**, contentFieldPresent:false였다. Authorization·Firebase ID Token·서비스 계정 없이 credentials:omit을 사용했다. 이전01:22의200 기록과 달리 이번 실행에서는 실제 차단을 확인했다. 반영 시점이나 원인은 단정하지 않는다. 새 로컬 예약 조회 제한 후보가 운영 게시됐다는 뜻도 아니다.

비회원 users/admins 조회도 permission-denied였다. 합성 미사용 ID/이메일 중복 조회는 정상이다. dev5173/react.html과 preview4173/에서 React 렌더링·공개 목록 표시도 확인했다. 원문·UID·실제 문서ID는 보고서에 저장하지 않았다. 증거: `test-results/security/privacy-review-live.json`, `privacy-review-live.log`.

추가 독립 Node REST는 네트워크 fetch failed로 미완료다. 이를403 검증에 포함하지 않는다. 위403은 브라우저 내 운영 REST와 SDK 실행 결과다. 독립 요청 미완료 기록: `privacy-review-rest.json`.

## 미검증 및 게시 전 확인

- 운영 관리자 적법성 감사는 미실행이다. 신뢰된 Console/IAM 운영자가 users.role:admin 및 admins.enabled:true의 UID 합집합을 읽기 전용 조회하고 Auth 계정·외부 승인 명단과 대조해야 한다. 공개 기간의 이름·createdAt·관리자 표시 자체는 승인 증거가 아니다. 권한 회수나 계정 수정은 대상·백업·별도 승인이 필요하다.
- 운영 오염 예약문서 구조, 실제 계정 로그인·세션 유지·가입·쓰기, 작성자/타인/관리자 운영 접근, 신규 후보 게시 후 동작은 미검증이다. Emulator 통과를 운영 쓰기 검증으로 보고하지 않는다.
- 현재 Console 전체 규칙을 백업·비교하고 새 후보 게시 승인을 받은 뒤 적용해야 한다. 이번 작업에서는 운영 데이터·계정·규칙을 변경하지 않았다.
