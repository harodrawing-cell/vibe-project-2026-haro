# 최신 규칙 게시 후 운영 읽기 검증

실행 시각: 2026-11-08 01:51:00 KST(보고서 시작 시각). 사용자 최신 게시 완료 알림 후 실제 haro-web-project/(default)를 새 Edge 브라우저 컨텍스트에서 검사했다.

| 항목 | 실제 결과 |
|---|---|
| Auth 초기 상태 | signedIn:false, 초기화 성공. 실제 로그인 성공 검증과 다름 |
| NOTICE 공개 목록 | 서버 조회 성공, 7개 |
| Q&A 공개 목록·공개 상세 | 목록2개, 공개 상세 존재 확인 |
| 비공개 Q&A 공개 목록 | privateMetadataMasked:true |
| 비공개 본문 | SDK permission-denied, 비로그인 REST HTTP403, contentFieldPresent:false |
| 비공개 답변 | SDK permission-denied, 비로그인 REST HTTP403, contentFieldPresent:false |
| React 비공개 상세 서비스 | 작성자·관리자 전용 오류로 접근 거절 |
| 비로그인 프로필·관리자 문서 | 검사한 문서 경로의 서버 읽기 permission-denied. 관리자 전체 감사와 다름 |
| 가입 전 조회 | 합성 미사용 ID·이메일 정확한 키 확인 정상. 기존 예약문서 전체 호환성·실제 가입 성공과 다름 |
| 개발·빌드 화면 | 5173/react.html 및4173/ React 렌더링, NOTICE/Q&A 목록 표시 정상 |

REST 요청에는 Authorization·Firebase ID Token·서비스 계정 없이 credentials:omit을 사용했다. 쓰기·가입·로그인 엔드포인트 차단 가드를 유지했고 mutation 시도 기록은 빈 배열이다. 운영 문서·회원·규칙 변경은 하지 않았다.

## 미검증

- 실계정 로그인·세션 유지: 검증 계정 자격 증명/허가된 세션이 없어 실행하지 않았다. 비밀번호나 토큰을 저장소·채팅에 공유하지 않는다. 운영자가 [수동 점검 절차](PRODUCTION_SECURITY_CHECKLIST.md)의 분리된 세션에서 수행할 수 있다.
- 실제 회원가입·Q&A 작성/수정/삭제·관리자 답변: 운영 데이터 변경을 수반하므로 이번 읽기 전용 범위에서 제외했다.
- 인증된 작성자·다른 회원·관리자 간 서버 접근과 관리자 승인 명단의 정당성은 미확인이다. 비로그인 admins 읽기 차단만으로 이를 통과 처리하지 않는다.
- Console 게시 원문은 직접 확보하지 않았으므로 로컬 전체 규칙과 바이트/의미 일치를 확인한 것은 아니다. 게시 사실은 사용자 알림을 근거로 하고 현재 서버의 관측 동작을 기록했다.
- 기존 예약문서 오염 유무, UID/존재 여부 잔여 노출 개선 과제 AUTH-PRIVACY-01은 남는다.

이전 Emulator30개·회귀36개 통과는 별도의 로컬 증거이며 이번 작업에서 재실행하지 않았다. 관측된 비로그인 비공개 접근 차단은 통과했으나 운영 보안 전체 검증 완료나 배포 승인으로 판정하지 않는다. GitHub Push·React 배포는 하지 않았다.

증거: `test-results/security/latest-publish-readonly.json`, `latest-publish-readonly.log`. 실행: `node tests/react-final-readonly.cjs`. 보고서에는 개인 본문·UID·문서ID를 기록하지 않았다.
