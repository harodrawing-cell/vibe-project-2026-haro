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
    catch (error) { message(error.message, true); }
    finally { controls.forEach(control => { control.disabled = false; }); form.setAttribute('aria-busy', 'false'); }
  }
  $('login-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const username = $('login-username').value, password = $('login-password').value;
    void submit($('login-form'), async () => {
      await HaroAccount.login(username, password);
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
      message('회원가입이 완료되었습니다. 로그인해 주세요.');
      const loginLink = document.createElement('a');
      loginLink.href = './login.html' + (returnToQna ? '?next=qna-write.html' : '');
      loginLink.textContent = '로그인 화면으로 이동';
      $('account-message').append(' ', loginLink);
    });
  });
  document.body.dataset.ready = 'true';
})();
