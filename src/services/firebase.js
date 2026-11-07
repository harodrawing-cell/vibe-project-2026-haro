import common from './notice-common.js';
const firebase = ((common) => {
  'use strict';
  const config = Object.freeze({
    apiKey:
      import.meta.env?.VITE_FIREBASE_API_KEY ||
      'AIzaSyAndMx1VVf3csbxwJEaPkNkvQX3XbwDf7E',
    authDomain:
      import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ||
      'haro-web-project.firebaseapp.com',
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'haro-web-project',
    storageBucket: 'haro-web-project.firebasestorage.app',
    messagingSenderId: '1059493107277',
    appId:
      import.meta.env?.VITE_FIREBASE_APP_ID ||
      '1:1059493107277:web:c84f6b928f50e530c92e04',
  });
  let client;
  function getClient() {
    if (!client)
      client = Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
      ])
        .then(([app, sdk]) => ({
          sdk,
          app: app.getApps()[0] || app.initializeApp(config),
        }))
        .then((value) => ({ ...value, db: value.sdk.getFirestore(value.app) }))
        .catch((error) => {
          client = null;
          throw error;
        });
    return client;
  }
  function createRepository({ auth, connect = getClient }) {
    const invoke = async (operation) => {
      try {
        return await operation(await connect());
      } catch (error) {
        if (error.code === 'permission-denied')
          throw new Error(
            'Firebase 접근이 거부되었습니다. 로그인 계정과 Firestore 보안 규칙을 확인해 주세요.',
          );
        if (error.code === 'not-found' || error.code === 'failed-precondition')
          throw new Error(
            'Firestore (default) 데이터베이스가 생성되어 있는지 확인해 주세요.',
          );
        if (error.code === 'unavailable' || error.name === 'TypeError')
          throw new Error(
            'Firebase에 연결하지 못했습니다. 인터넷 연결 후 다시 시도해 주세요. 입력 내용은 유지됩니다.',
          );
        throw error;
      }
    };
    function reference(sdk, db, id) {
      if (
        typeof id !== 'string' ||
        !id ||
        id.includes('/') ||
        id === '.' ||
        id === '..'
      )
        throw new Error('게시글 ID가 올바르지 않습니다.');
      return sdk.doc(db, 'notices', id);
    }
    const decode = (snapshot) =>
      snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
    function checkSize(post) {
      // Leave room for Firestore document names/field overhead under its 1 MiB limit.
      if (new TextEncoder().encode(JSON.stringify(post)).length > 950000) {
        throw new Error(
          '첨부 이미지와 본문의 합계가 저장 한도를 초과했습니다. 더 작은 이미지를 선택해 주세요. 입력 내용은 유지됩니다.',
        );
      }
      return post;
    }
    return {
      // Compatibility with the banner's storage-event hook; Firestore is the source of truth.
      STORAGE_KEYS: Object.freeze({}),
      seedIfNeeded: async () => {},
      getList: ({ category } = {}) =>
        invoke(async ({ sdk, db }) => {
          const result = await sdk.getDocsFromServer(
            sdk.collection(db, 'notices'),
          );
          return result.docs
            .map(decode)
            .filter(
              (post) =>
                !category || category === '전체' || post.category === category,
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }),
      getById: (id) =>
        invoke(async ({ sdk, db }) =>
          decode(await sdk.getDocFromServer(reference(sdk, db, id))),
        ),
      create: async (input) => {
        const user = await auth.requireLogin();
        const fields = common.validateInput(input);
        const now = new Date().toISOString();
        const post = checkSize({
          id: crypto.randomUUID(),
          ...fields,
          author: user.name,
          authorUid: user.uid,
          createdAt: now,
          updatedAt: now,
        });
        return invoke(async ({ sdk, db }) => {
          await sdk.setDoc(reference(sdk, db, post.id), post);
          return post;
        });
      },
      update: async (id, changes) => {
        const user = await auth.requireLogin();
        return invoke(({ sdk, db }) =>
          sdk.runTransaction(db, async (transaction) => {
            const ref = reference(sdk, db, id);
            const current = decode(await transaction.get(ref));
            if (!current)
              throw new Error(
                '수정할 게시글이 없습니다. NOTICE 목록으로 돌아가 주세요.',
              );
            if (!common.canManagePost(user, current))
              throw new Error(
                '게시글 작성자 본인과 관리자만 수정할 수 있습니다.',
              );
            const fields = common.validateInput({ ...current, ...changes });
            const post = checkSize({
              id: current.id,
              ...fields,
              author: current.author,
              createdAt: current.createdAt,
              updatedAt: new Date().toISOString(),
            });
            if (current.authorUid) post.authorUid = current.authorUid;
            transaction.set(ref, post);
            return post;
          }),
        );
      },
      remove: async (id) => {
        const user = await auth.requireLogin();
        return invoke(({ sdk, db }) =>
          sdk.runTransaction(db, async (transaction) => {
            const ref = reference(sdk, db, id);
            const current = decode(await transaction.get(ref));
            if (!current)
              throw new Error(
                '삭제할 게시글이 없습니다. NOTICE 목록으로 돌아가 주세요.',
              );
            if (!common.canManagePost(user, current))
              throw new Error(
                '게시글 작성자 본인과 관리자만 삭제할 수 있습니다.',
              );
            transaction.delete(ref);
          }),
        );
      },
    };
  }
  return { config, getClient, createRepository };
})(common);
export default firebase;
