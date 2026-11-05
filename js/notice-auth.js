(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HaroNoticeAuth = api.createAuth(() => root.sessionStorage);
})(globalThis, function () {
  'use strict';
  function createAuth(getSession) {
    const ADMIN_KEY = 'haro-notice-test-admin-v1';
    // TODO: Firebase 교체 — Firebase Auth의 로그인 사용자와 관리자 custom claim을 조회한다.
    // 프론트 체크는 1차 방어일 뿐이다. Firestore/Storage 보안 규칙에서 권한을 다시 검증해야 한다.
    async function isAdmin() { return getSession().getItem(ADMIN_KEY) === 'enabled'; }
    async function getCurrentUserName() { return (await isAdmin()) ? '관리자' : '방문자'; }
    async function requireAdmin() {
      if (!(await isAdmin())) throw new Error('관리자만 글쓰기·수정·삭제를 할 수 있습니다. 목록 하단의 관리자 테스트 모드를 확인해 주세요.');
    }
    // 배포 전 제거: 누구나 전환할 수 있는 개발 전용 관리자 상태이며 실제 인증이 아니다.
    async function devSetAdmin(enabled) {
      if (enabled) getSession().setItem(ADMIN_KEY, 'enabled');
      else getSession().removeItem(ADMIN_KEY);
    }
    return { isAdmin, getCurrentUserName, requireAdmin, devSetAdmin };
  }
  return { createAuth };
});
