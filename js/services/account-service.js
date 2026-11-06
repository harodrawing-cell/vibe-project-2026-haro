(() => {
  'use strict';
  let connection;
  let registering = false;
  const loginEmail = username => `${username}@members.haro.invalid`;
  const messages = {
    'auth/invalid-credential': '아이디 또는 비밀번호가 올바르지 않습니다.',
    'auth/user-disabled': '사용이 중지된 계정입니다.',
    'auth/too-many-requests': '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
    'auth/operation-not-allowed': 'Firebase에서 이메일/비밀번호 로그인을 활성화해 주세요.',
    'auth/email-already-in-use': '이미 사용 중인 아이디입니다.',
    'auth/weak-password': '비밀번호는 6자 이상 입력해 주세요.',
    'auth/configuration-not-found': 'Firebase Authentication에서 이메일/비밀번호 로그인을 활성화해 주세요.',
    'permission-denied': 'Firestore 회원가입 보안 규칙을 먼저 게시해 주세요.',
    'unavailable': '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    'resource-exhausted': '무료 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
  };
  async function connect() {
    if (!connection) connection = Promise.all([
      HaroNoticeFirebase.getClient(),
      import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js'),
    ]).then(async ([client, sdk]) => {
      const auth = sdk.getAuth(client.app);
      await auth.authStateReady();
      return { ...client, sdkAuth: sdk, auth };
    }).catch(error => { connection = null; throw error; });
    return connection;
  }
  async function invoke(operation) {
    try { return await operation(await connect()); }
    catch (error) { throw new Error(messages[error.code] || error.message || '요청을 처리하지 못했습니다. 다시 시도해 주세요.'); }
  }
  function normalizeId(value) {
    const id = String(value || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_]{3,19}$/.test(id)) throw new Error('아이디는 영문 소문자·숫자·밑줄 4~20자로 입력해 주세요.');
    return id;
  }
  async function getUser() {
    return invoke(async ({ auth, sdkAuth, sdk, db }) => {
      if (registering || !auth.currentUser) return null;
      const user = auth.currentUser;
      const administrator = await sdk.getDoc(sdk.doc(db, 'admins', user.uid));
      const profile = await sdk.getDoc(sdk.doc(db, 'users', user.uid));
      return { uid: user.uid, name: profile.exists() ? profile.data().name : user.displayName || '사용자', admin: administrator.exists() && administrator.data().enabled === true };
    });
  }
  window.HaroAccount = {
    normalizeId,
    getUser,
    async requireLogin() {
      const user = await getUser();
      if (!user) throw new Error('로그인 후 글쓰기를 이용할 수 있습니다.');
      return user;
    },
    async isAdmin() { return (await getUser())?.admin === true; },
    async requireAdmin() { if (!(await this.isAdmin())) throw new Error('관리자만 글쓰기·수정·삭제할 수 있습니다. 관리자 계정으로 로그인해 주세요.'); },
    async getCurrentUserName() { return (await getUser())?.name || '방문자'; },
    checkId(value) {
      const username = normalizeId(value);
      if (username === 'admin') return Promise.resolve(false);
      return invoke(async ({ sdk, db }) => !(await sdk.getDocFromServer(sdk.doc(db, 'usernames', username))).exists());
    },
    register(input) {
      const username = normalizeId(input.username);
      const name = String(input.name || '').trim();
      const email = String(input.email || '').trim().toLowerCase();
      if (username === 'admin' || email === 'admin.com@company.co.kr') throw new Error('관리자 전용 아이디 또는 이메일은 사용할 수 없습니다.');
      if (name.length < 2 || name.length > 30) throw new Error('이름은 2~30자로 입력해 주세요.');
      if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email) || email.length > 254) throw new Error('올바른 이메일을 입력해 주세요.');
      if (typeof input.password !== 'string' || input.password.length < 6 || input.password.length > 128) throw new Error('비밀번호는 6~128자로 입력해 주세요.');
      return invoke(async ({ sdk, db, sdkAuth, auth }) => {
        if (auth.currentUser) throw new Error('이미 로그인되어 있습니다. 가입하려면 새 브라우저 세션을 사용해 주세요.');
        const userRef = sdk.doc(db, 'usernames', username);
        const emailRef = sdk.doc(db, 'emails', email);
        if ((await sdk.getDocFromServer(userRef)).exists()) throw new Error('이미 사용 중인 아이디입니다.');
        if ((await sdk.getDocFromServer(emailRef)).exists()) throw new Error('이미 사용 중인 이메일입니다.');
        registering = true;
        let user;
        try {
          user = (await sdkAuth.createUserWithEmailAndPassword(auth, loginEmail(username), input.password)).user;
          const profileRef = sdk.doc(db, 'users', user.uid);
          await sdk.runTransaction(db, async transaction => {
            const idRecord = await transaction.get(userRef);
            const emailRecord = await transaction.get(emailRef);
            if (idRecord.exists() || emailRecord.exists()) throw Object.assign(new Error('이미 사용 중인 아이디 또는 이메일입니다.'), { code: 'account/duplicate' });
            transaction.set(profileRef, { name, username, email, role: 'user', createdAt: new Date().toISOString() });
            transaction.set(userRef, { uid: user.uid });
            transaction.set(emailRef, { uid: user.uid });
          });
          const saved = await sdk.getDocFromServer(profileRef);
          if (!saved.exists() || saved.data().role !== 'user') {
            throw new Error('회원 정보의 role 저장을 확인하지 못했습니다. Firestore users 문서와 최신 보안 규칙을 확인해 주세요.');
          }
        } catch (error) {
          if (user) {
            // A network error can have an unknown commit result: preserve the identity in that case.
            if (['permission-denied', 'account/duplicate', 'invalid-argument'].includes(error.code)) {
              try { await sdkAuth.deleteUser(user); } catch { /* Original error remains actionable. */ }
            }
            await sdkAuth.signOut(auth);
          }
          throw error;
        } finally { registering = false; }
        await sdkAuth.signOut(auth);
        return { success: true };
      });
    },
    login(username, password) {
      username = normalizeId(username);
      return invoke(({ auth, sdkAuth }) => sdkAuth.signInWithEmailAndPassword(auth, loginEmail(username), password));
    },
    logout() { return invoke(({ sdkAuth, auth }) => sdkAuth.signOut(auth)); },
    subscribe(listener, onError = () => {}) {
      let active = true, unsubscribe;
      connect().then(({ auth, sdkAuth }) => {
        if (!active) return;
        unsubscribe = sdkAuth.onAuthStateChanged(auth, () => { getUser().then(user => { if (active) listener(user); }).catch(onError); }, onError);
      }).catch(onError);
      return () => { active = false; unsubscribe?.(); };
    },
  };
})();
