import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BoardLayout from '../layouts/BoardLayout';
import Message from '../components/Message';
import { useAuth } from '../contexts/AuthContext';
export default function AccountPage({ signup = false }) {
  const { account } = useAuth(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const next =
    params.get('next') === 'qna-write.html'
      ? '/qna/write'
      : params.get('next') === 'notice-write.html'
        ? '/notice/write'
        : '/notice';
  const query =
    params.get('next') && next !== '/notice'
      ? `?next=${encodeURIComponent(params.get('next'))}`
      : '';
  const [values, setValues] = useState({
      name: '',
      username: '',
      password: '',
      email: '',
    }),
    [checkedId, setCheckedId] = useState(''),
    [idStatus, setIdStatus] = useState(''),
    [checking, setChecking] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [failures, setFailures] = useState(0),
    [recovery, setRecovery] = useState(false),
    [success, setSuccess] = useState(false),
    [retry, setRetry] = useState(false),
    [profileSaved, setProfileSaved] = useState(false);
  const currentId = useRef(''),
    lock = useRef(false),
    successTitle = useRef(null);
  useEffect(() => {
    if (success) successTitle.current?.focus();
  }, [success]);
  function update(key, value) {
    setValues((old) => ({ ...old, [key]: value }));
    if (key === 'username') {
      currentId.current = value.trim().toLowerCase();
      setCheckedId('');
      setIdStatus('');
    }
  }
  async function checkId() {
    setChecking(true);
    setError(false);
    try {
      const id = account.normalizeId(values.username);
      const available = await account.checkId(id);
      if (id !== currentId.current) return;
      setCheckedId(available ? id : '');
      setIdStatus(
        available
          ? '사용할 수 있는 아이디입니다.'
          : '이미 사용 중이거나 사용할 수 없는 아이디입니다.',
      );
    } catch (e) {
      setMessage(e.message);
      setError(true);
    } finally {
      setChecking(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    if (signup && checkedId !== values.username.trim().toLowerCase()) {
      setMessage('아이디 중복 확인을 먼저 진행해 주세요.');
      setError(true);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      if (signup) {
        await account.register(values);
        setValues({ name: '', username: '', password: '', email: '' });
        setSuccess(true);
        setMessage('');
      } else {
        try {
          await account.login(values.username, values.password);
          setFailures(0);
        } catch (e) {
          if (
            [
              'auth/invalid-credential',
              'auth/wrong-password',
              'auth/user-not-found',
            ].includes(e.code)
          ) {
            const count = failures + 1;
            setFailures(count);
            throw new Error(
              count < 2
                ? '아이디 또는 비밀번호가 올바르지 않습니다.'
                : '아이디 또는 비밀번호를 다시 확인해 주세요. 아직 회원가입을 하지 않으셨다면 회원가입을 진행해 주세요.',
            );
          }
          throw e;
        }
        navigate(next);
      }
    } catch (e) {
      if (e.code === 'account/signup-signout-failed') {
        setRetry(true);
        setProfileSaved(e.profileSaved === true);
      }
      setMessage(e.message);
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <BoardLayout account={signup ? 'SIGN UP' : 'LOGIN'}>
      <Message error={error}>{message}</Message>
      {success ? (
        <section className="account-success" id="signup-success">
          <h2 ref={successTitle} tabIndex={-1} id="signup-success-title">
            회원가입이 완료되었습니다!
          </h2>
          <p>하로와 함께해 주셔서 감사합니다.</p>
          <Link
            className="notice-button notice-button--primary account-success__login"
            to={`/login${query}`}
          >
            로그인하러 가기
          </Link>
        </section>
      ) : (
        <>
          {!signup && failures >= 2 && (
            <div className="account-help">
              <div className="account-help__actions">
                <button
                  className="notice-button"
                  type="button"
                  aria-expanded={recovery}
                  onClick={() => setRecovery(true)}
                >
                  비밀번호 찾기
                </button>
                <Link className="notice-button" to={`/signup${query}`}>
                  회원가입
                </Link>
              </div>
              {recovery && (
                <div className="account-recovery" tabIndex={-1}>
                  <p>
                    가입 시 사용한 이메일로{' '}
                    <a href="mailto:harodrowing@gmail.com">
                      harodrowing@gmail.com
                    </a>
                    에 아이디와 비밀번호 복구 요청을 보내 주세요.
                  </p>
                  <p>
                    비밀번호는 보내지 마세요. 관리자 확인 후 복구를 안내해
                    드립니다.
                  </p>
                </div>
              )}
            </div>
          )}
          <section className={signup ? 'account-signup' : undefined}>
            <h2>{signup ? '회원가입' : '로그인'}</h2>
            <form
              id={signup ? 'signup-form' : 'login-form'}
              onSubmit={submit}
              aria-busy={busy}
            >
              <fieldset className="product-form-fieldset" disabled={busy}>
                {signup && (
                  <div className="notice-field">
                    <label htmlFor="signup-name">이름</label>
                    <input
                      id="signup-name"
                      value={values.name}
                      onChange={(e) => update('name', e.target.value)}
                      autoComplete="name"
                      minLength={2}
                      maxLength={30}
                      required
                    />
                  </div>
                )}
                <div className="notice-field">
                  <label htmlFor="account-username">아이디</label>
                  <div className={signup ? 'account-id-row' : undefined}>
                    <input
                      id="account-username"
                      value={values.username}
                      onChange={(e) => update('username', e.target.value)}
                      autoComplete="username"
                      minLength={4}
                      maxLength={20}
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                    />
                    {signup && (
                      <button
                        className="notice-button"
                        type="button"
                        disabled={checking}
                        onClick={checkId}
                      >
                        중복 확인
                      </button>
                    )}
                  </div>
                  {signup && (
                    <p className="notice-hint" role="status">
                      {idStatus ||
                        '영문 소문자·숫자·밑줄 4~20자로 입력해 주세요.'}
                    </p>
                  )}
                </div>
                <div className="notice-field">
                  <label htmlFor="account-password">비밀번호</label>
                  <input
                    id="account-password"
                    type="password"
                    value={values.password}
                    onChange={(e) => update('password', e.target.value)}
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    minLength={6}
                    maxLength={128}
                    required
                  />
                </div>
                {signup && (
                  <div className="notice-field">
                    <label htmlFor="signup-email">이메일</label>
                    <input
                      id="signup-email"
                      type="email"
                      value={values.email}
                      onChange={(e) => update('email', e.target.value)}
                      autoComplete="email"
                      maxLength={254}
                      required
                    />
                    <p className="notice-hint">
                      현재 이메일 인증과 자동 비밀번호 재설정은 제공하지
                      않습니다.
                    </p>
                  </div>
                )}
                <button
                  className="notice-button notice-button--primary account-submit"
                  type="submit"
                  disabled={checking}
                >
                  {busy ? '처리 중…' : signup ? '회원가입' : '로그인'}
                </button>
              </fieldset>
            </form>
            <p className="notice-hint account-signup-prompt">
              {signup ? '이미 회원이신가요? ' : '아직 회원이 아니신가요? '}
              <Link to={`${signup ? '/login' : '/signup'}${query}`}>
                {signup ? '로그인하기' : '회원가입하기'}
              </Link>
            </p>
          </section>
          {retry && (
            <button
              className="notice-button"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await account.logout();
                  setRetry(false);
                  if (profileSaved) {
                    setSuccess(true);
                    setMessage('');
                  } else
                    setMessage(
                      '로그아웃되었습니다. 회원 정보 저장 여부는 관리자에게 확인해 주세요.',
                    );
                } catch (e) {
                  setMessage(e.message);
                  setError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              로그아웃 다시 시도
            </button>
          )}
        </>
      )}
    </BoardLayout>
  );
}
