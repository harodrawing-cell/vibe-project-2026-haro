(() => {
  'use strict';
  const header = document.querySelector('.site-header__inner');
  if (!header || !window.HaroAccount) return;
  const loginUrl = new URL('../../pages/notice/login.html', document.currentScript.src);
  const panel = document.createElement('div');
  panel.className = 'account-header';
  panel.innerHTML = '<span class="account-header__welcome" role="status"></span><button class="account-header__action" type="button">로그인</button>';
  const welcome = panel.querySelector('span'), button = panel.querySelector('button');
  let signedIn = false;
  header.append(panel);
  HaroAccount.subscribe(user => {
    welcome.textContent = user ? `${user.name}님 환영합니다` : '';
    signedIn = !!user;
    button.textContent = signedIn ? '로그아웃' : '로그인';
    document.documentElement.dataset.signedIn = String(!!user);
  }, error => { panel.title = error.message; });
  button.addEventListener('click', async () => {
    if (!signedIn) {
      location.href = loginUrl.href;
      return;
    }
    button.disabled = true;
    try { await HaroAccount.logout(); location.reload(); }
    catch (error) { welcome.textContent = error.message; button.disabled = false; }
  });
})();
