// Run manually with Application Default Credentials, passing the password on stdin.
'use strict';
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
async function main() {
  let password = '';
  for await (const chunk of process.stdin) password += chunk;
  password = password.replace(/[\r\n]+$/, '');
  if (password.length < 6 || password.length > 128) throw new Error('관리자 비밀번호는 6~128자여야 합니다.');
  initializeApp({ credential: applicationDefault(), projectId: 'haro-web-project' });
  const auth = getAuth(), db = getFirestore();
  const email = 'admin.com@company.co.kr';
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  // Never take over an existing identity or reset its password automatically.
  if (user) {
    const record = await db.collection('usernames').doc('admin').get();
    if (!record.exists || record.data().uid !== user.uid || user.customClaims?.admin !== true) throw new Error('동일 이메일의 기존 계정이 있습니다. 소유권 확인 후 수동으로 처리하세요.');
    console.log('Administrator already provisioned; no changes made.');
    return;
  }
  user = await auth.createUser({ email, password, displayName: '관리자' });
  try {
    await auth.setCustomUserClaims(user.uid, { admin: true });
    await db.runTransaction(async tx => {
      const idRef = db.collection('usernames').doc('admin');
      if ((await tx.get(idRef)).exists) throw new Error('admin 아이디가 이미 등록되어 있습니다.');
      tx.create(idRef, { uid: user.uid });
      tx.create(db.collection('users').doc(user.uid), { name: '관리자', username: 'admin', email, role: 'admin', createdAt: new Date().toISOString() });
    });
  } catch (error) { await auth.deleteUser(user.uid); throw error; }
  console.log('Administrator provisioned:', user.uid);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
