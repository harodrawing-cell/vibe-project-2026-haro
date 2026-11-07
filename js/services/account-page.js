(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  // Only a fixed local destination is accepted; never redirect to arbitrary query URLs.
  const returnToQna = new URLSearchParams(location.search).get('next') === 'qna-write.html';
  if (returnToQna) document.querySelectorAll('a[href="./signup.html"], a[href="./login.html"]').forEach(link => { link.href += '?next=qna-write.html'; });
  const message = (text, error = false) => {
    $('account-message').textContent = text;
    $('account-message').dataset.error = String(error);
    $('account-message').focus();
  };
  let checkedId = '';
  let signupProfileSaved = false;
  function showSignupSuccess() {
    $('account-message').textContent = '';
    document.querySelector('.account-signup').hidden = true;
    $('signup-signout-retry').hidden = true;
    $('signup-success').hidden = false;
    $('signup-success-title').focus();
  }
  $('signup-signout-retry')?.addEventListener('click', async () => {
    $('signup-signout-retry').disabled = true;
    try {
      await HaroAccount.logout();
      $('signup-signout-retry').hidden = true;
      if (signupProfileSaved) showSignupSuccess();
      else message('로그아웃되었습니다. 회원 정보 저장 여부는 관리자에게 확인해 주세요.', true);
    } catch (error) { message(error.message, true); }
    finally { $('signup-signout-retry').disabled = false; }
  });
  let loginFailures = 0;
  const credentialErrors = new Set(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found']);
  $('password-recovery-toggle')?.addEventListener('click', () => {
    $('password-recovery').hidden = false;
    $('password-recovery-toggle').setAttribute('aria-expanded', 'true');
    $('password-recovery').focus();
  });
  $('signup-username')?.addEventListener('input', () => { checkedId = ''; $('signup-id-status').textContent = ''; });
  $('check-username')?.addEventListener('click', async () => {
    $('check-username').disabled = true;
    try {
      const id = HaroAccount.normalizeId($('signup-username').value);
      const available = await HaroAccount.checkId(id);
      // Discard stale results if the input changed during the request.
      if (id !== $('signup-username').value.trim().toLowerCase()) return;
      checkedId = available ? id : '';
      $('signup-id-status').textContent = available ? '사용할 수 있는 아이디입니다.' : '이미 사용 중이거나 사용할 수 없는 아이디입니다.';
    } catch (error) { message(error.message, true); }
    finally { $('check-username').disabled = false; }
  });
  async function submit(form, operation) {
    const controls = [...form.querySelectorAll('input, button')];
    form.setAttribute('aria-busy', 'true');
    controls.forEach(control => { control.disabled = true; });
    try { await operation(); }
    catch (error) {
      if (error.code === 'account/signup-signout-failed') {
        signupProfileSaved = error.profileSaved === true;
        $('signup-signout-retry').hidden = false;
      }
      message(error.message, true);
    }
    finally { controls.forEach(control => { control.disabled = false; }); form.setAttribute('aria-busy', 'false'); }
  }
  $('login-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const username = $('login-username').value, password = $('login-password').value;
    void submit($('login-form'), async () => {
      try {
        await HaroAccount.login(username, password);
        loginFailures = 0;
        $('login-help').hidden = true;
      } catch (error) {
        if (credentialErrors.has(error.code)) {
          loginFailures += 1;
          $('login-help').hidden = loginFailures < 2;
          throw new Error(loginFailures < 2
            ? '아이디 또는 비밀번호가 올바르지 않습니다.'
            : '아이디 또는 비밀번호를 다시 확인해 주세요. 아직 회원가입을 하지 않으셨다면 회원가입을 진행해 주세요.');
        }
        throw error;
      }
      location.href = returnToQna ? './qna-write.html' : './notice-list.html';
    });
  });
  $('signup-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const input = { name: $('signup-name').value.trim(), username: $('signup-username').value.trim().toLowerCase(), password: $('signup-password').value, email: $('signup-email').value.trim() };
    if (checkedId !== input.username) { message('아이디 중복 확인을 먼저 진행해 주세요.', true); return; }
    void submit($('signup-form'), async () => {
      await HaroAccount.register(input);
      $('signup-form').reset();
      checkedId = '';
      $('signup-id-status').textContent = '';
      showSignupSuccess();
    });
  });
  document.body.dataset.ready = 'true';
})();
