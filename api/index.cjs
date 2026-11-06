'use strict';
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { createHash } = require('node:crypto');
const validation = require('./account-validation.cjs');
initializeApp();
const auth = getAuth(), db = getFirestore();
const options = { region: 'asia-northeast3', maxInstances: 5, cors: true };
const apiKey = 'AIzaSyAndMx1VVf3csbxwJEaPkNkvQX3XbwDf7E';
function validate(operation) {
  try { return operation(); }
  catch (error) { throw new HttpsError('invalid-argument', error.message); }
}
async function rateLimit(request) {
  // One private record per IP. Do not store passwords, tokens or raw IPs.
  const ip = request.rawRequest.ip || 'unknown';
  const key = createHash('sha256').update(ip).digest('hex');
  const ref = db.collection('accountLimits').doc(key);
  await db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    const now = Date.now(), old = current.data();
    const count = old && now - old.startedAt < 600000 ? old.count + 1 : 1;
    if (count > 40) throw new HttpsError('resource-exhausted', '요청이 많습니다. 10분 후 다시 시도해 주세요.');
    transaction.set(ref, { count, startedAt: count === 1 ? now : old.startedAt });
  });
}
exports.checkUsername = onCall(options, async request => {
  await rateLimit(request);
  const id = validate(() => validation.username(request.data?.username));
  return { available: id !== 'admin' && !(await db.collection('usernames').doc(id).get()).exists };
});
exports.registerAccount = onCall(options, async request => {
  await rateLimit(request);
  const input = validate(() => validation.registration(request.data));
  let user;
  try {
    user = await auth.createUser({ email: input.email, password: input.password, displayName: input.name });
    await db.runTransaction(async transaction => {
      const ref = db.collection('usernames').doc(input.username);
      if ((await transaction.get(ref)).exists) throw new HttpsError('already-exists', '이미 사용 중인 아이디입니다.');
      transaction.create(ref, { uid: user.uid });
      transaction.create(db.collection('users').doc(user.uid), { name: input.name, username: input.username, email: input.email, role: 'user', createdAt: new Date().toISOString() });
    });
    return { success: true };
  } catch (error) {
    // Roll back only the newly created Auth identity if the username race was lost.
    if (user) await auth.deleteUser(user.uid);
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') throw new HttpsError('already-exists', '이미 사용 중인 이메일입니다.');
    if (error.code === 'auth/invalid-password') throw new HttpsError('invalid-argument', '비밀번호는 6자 이상이어야 합니다.');
    throw new HttpsError('internal', '회원가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
});
exports.loginAccount = onCall(options, async request => {
  await rateLimit(request);
  const id = validate(() => validation.username(request.data?.username));
  const password = request.data?.password;
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) throw new HttpsError('unauthenticated', '아이디 또는 비밀번호가 올바르지 않습니다.');
  const invalid = () => new HttpsError('unauthenticated', '아이디 또는 비밀번호가 올바르지 않습니다.');
  const profile = await db.collection('usernames').doc(id).get();
  if (!profile.exists) throw invalid();
  const user = await auth.getUser(profile.data().uid);
  if (user.disabled || !user.email) throw invalid();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password, returnSecureToken: true }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw invalid();
  // Only mint a Firebase session after Firebase has verified the password.
  return { token: await auth.createCustomToken(user.uid) };
});
