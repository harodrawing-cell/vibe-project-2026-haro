(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./notice-common.js') : root.HaroNoticeCommon);
  if (node) module.exports = api;
  else root.HaroNoticeRepository = api.createRepository({ getStorage: () => root.localStorage, auth: root.HaroNoticeAuth });
})(globalThis, function (common) {
  'use strict';
  const STORAGE_KEYS = Object.freeze({ POSTS: 'haro-notices-v2', SEEDED: 'haro-notices-v2-seeded', LEGACY: 'haro-notices-test-v1', CATEGORY_SAMPLES: 'haro-notices-category-samples-20261105' });
  // User-requested one-time sample batch. Existing documents are never replaced.
  const categorySamples = [
    ['공지사항', 'NOTICE 게시판 이용 안내', '카테고리별 소식을 확인하고 제목을 선택하면 상세 내용을 볼 수 있습니다.'],
    ['공지사항', '공지사항 검색 방법 안내', '검색창에 제목이나 내용의 일부를 입력하면 관련 게시글을 찾을 수 있습니다.'],
    ['공지사항', '공지 배너 이용 안내', '상단 배너에서 최신 소식을 확인하고 일시정지·재생·닫기 기능을 이용할 수 있습니다.'],
    ['이모티콘', '하로 이모티콘 미리보기', '하로의 다양한 표정을 홈페이지 EMOTICON 영역에서 살펴보세요.'],
    ['이모티콘', '마음에 드는 하로 표정 찾기', '반가움과 느긋함 등 일상의 기분에 어울리는 하로 표정을 찾아보세요.'],
    ['이모티콘', '이모티콘 소식 확인 안내', '이모티콘 카테고리에서는 관련 소식을 모아서 확인할 수 있습니다.'],
    ['굿즈', '하로 굿즈 둘러보기', '홈페이지 GOODS 영역에서 하로 상품 이미지를 확인할 수 있습니다.'],
    ['굿즈', '굿즈 이미지 살펴보기', '상품 목록의 화살표나 스와이프를 이용해 하로 굿즈를 둘러보세요.'],
    ['굿즈', '굿즈 소식 확인 안내', '굿즈 카테고리에서 관련 게시글을 모아 확인할 수 있습니다.'],
    ['사이트 소식', '하로 홈페이지 메뉴 안내', 'ABOUT HARO, EMOTICON, STORY, GOODS, NOTICE 메뉴로 원하는 콘텐츠를 찾아보세요.'],
    ['사이트 소식', '모바일 홈페이지 이용 안내', '모바일에서는 상단 메뉴 버튼으로 홈페이지의 각 영역으로 이동할 수 있습니다.'],
    ['사이트 소식', 'NOTICE 테스트 모드 안내', '현재 게시판은 브라우저 저장소를 사용하며 다른 기기와 데이터가 동기화되지 않습니다.'],
  ];
  function createRepository({ getStorage, auth }) {
    let pending = Promise.resolve();
    // Serializes operations in this page so overlapping async writes cannot lose records.
    const run = operation => {
      const result = pending.then(operation);
      pending = result.catch(() => {});
      return result;
    };
    function storage() {
      try { return getStorage(); }
      catch { throw new Error('브라우저 저장소에 접근할 수 없습니다. 브라우저 설정을 확인해 주세요.'); }
    }
    function write(key, value) {
      try { storage().setItem(key, value); }
      catch (error) {
        if (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014) {
          throw new Error('브라우저 저장 공간이 부족합니다. 더 작은 이미지를 선택하거나 불필요한 글을 삭제한 뒤 다시 시도해 주세요. 입력 내용은 유지됩니다.');
        }
        throw new Error('브라우저에 저장하지 못했습니다. 저장소 설정을 확인해 주세요. 입력 내용은 유지됩니다.');
      }
    }
    function parse(raw) {
      try {
        const posts = JSON.parse(raw);
        if (!Array.isArray(posts) || new Set(posts.map(post => post.id)).size !== posts.length) throw new Error();
        for (const post of posts) {
          if (typeof post.id !== 'string' || !post.id || typeof post.author !== 'string' || !post.author ||
              typeof post.createdAt !== 'string' || typeof post.updatedAt !== 'string' ||
              !Number.isFinite(Date.parse(post.createdAt)) || !Number.isFinite(Date.parse(post.updatedAt))) throw new Error();
          common.validateInput(post);
        }
        return posts;
      } catch { throw new Error('저장된 게시글 형식이 올바르지 않습니다. 데이터를 초기화하지 않고 보존했습니다.'); }
    }
    async function seedIfNeeded() {
      // TODO: Firebase 교체 — 서버 데이터 사용 시 로컬 시드/구버전 데이터 이전을 제거한다.
      const store = storage();
      if (store.getItem(STORAGE_KEYS.POSTS) !== null) {
        parse(store.getItem(STORAGE_KEYS.POSTS));
        if (store.getItem(STORAGE_KEYS.SEEDED) !== '1') write(STORAGE_KEYS.SEEDED, '1');
        return;
      }
      if (store.getItem(STORAGE_KEYS.SEEDED) === '1') return;
      const legacy = store.getItem(STORAGE_KEYS.LEGACY);
      let posts;
      if (legacy !== null) {
        try {
          const records = JSON.parse(legacy);
          if (!Array.isArray(records)) throw new Error();
          posts = records.map(post => ({ id: post.id, category: post.category, title: post.title, content: post.body,
            author: post.author, imageUrl: post.image ? post.image.src : '', createdAt: post.createdAt, updatedAt: post.updatedAt || post.createdAt }));
          parse(JSON.stringify(posts));
        } catch { throw new Error('기존 NOTICE 데이터를 이전하지 못했습니다. 원본 데이터는 보존되어 있습니다.'); }
      } else {
        const now = new Date().toISOString();
        posts = [{ id: crypto.randomUUID(), category: '공지사항', title: '하로 NOTICE 테스트 게시판 안내',
          content: '하로의 소식을 전하는 NOTICE 테스트 게시판입니다.\n\n목록 하단에서 관리자 테스트 모드를 켜면 글쓰기·수정·삭제를 체험할 수 있습니다.\n글과 이미지는 현재 브라우저에만 저장되며 실제 서버에는 반영되지 않습니다.',
          author: '관리자', imageUrl: '', createdAt: now, updatedAt: now }];
      }
      // Write data before the flag. If the flag fails, the next attempt reuses existing data.
      write(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      write(STORAGE_KEYS.SEEDED, '1');
    }
    async function read() {
      await seedIfNeeded();
      const posts = parse(storage().getItem(STORAGE_KEYS.POSTS) || '[]');
      // TODO: Firebase 교체 — 로컬 샘플 일회성 추가 대신 별도 관리용 데이터 이전을 사용한다.
      // Explicitly requested development content; ordinary CRUD still requires admin.
      if (storage().getItem(STORAGE_KEYS.CATEGORY_SAMPLES) !== '1') {
        const now = new Date().toISOString();
        for (const [category, label, description] of categorySamples) {
          const title = `[샘플] ${label}`;
          // Also prevents duplicate batches if writing the completion flag failed.
          if (posts.some(post => post.category === category && post.title === title)) continue;
          posts.push({ id: crypto.randomUUID(), category, title,
            content: `${description}\n\n이 글은 카테고리별 목록·검색·상세 화면 확인을 위해 추가한 샘플 게시글입니다. 실제 출시나 운영 일정 공지가 아닙니다.`,
            author: '관리자', imageUrl: '', createdAt: now, updatedAt: now });
        }
        write(STORAGE_KEYS.POSTS, JSON.stringify(posts));
        write(STORAGE_KEYS.CATEGORY_SAMPLES, '1');
      }
      return posts;
    }
    async function save(posts) {
      await auth.requireAdmin();
      // TODO: Firebase 교체 — Firestore 쓰기와 서버 보안 규칙으로 교체한다.
      write(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    }
    return {
      STORAGE_KEYS,
      seedIfNeeded: () => run(seedIfNeeded),
      // TODO: Firebase 교체 — 아래 Promise CRUD 인터페이스와 문서 구조를 유지한다.
      getList: ({ category } = {}) => run(async () => (await read())
        .filter(post => !category || category === '전체' || post.category === category)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      getById: id => run(async () => (await read()).find(post => post.id === id) || null),
      create: input => run(async () => {
        await auth.requireAdmin();
        const fields = common.validateInput(input);
        const posts = await read();
        const now = new Date().toISOString();
        const post = { id: crypto.randomUUID(), ...fields, author: await auth.getCurrentUserName(), createdAt: now, updatedAt: now };
        posts.unshift(post);
        await save(posts);
        return post;
      }),
      update: (id, changes) => run(async () => {
        await auth.requireAdmin();
        const posts = await read();
        const index = posts.findIndex(post => post.id === id);
        if (index === -1) throw new Error('수정할 게시글이 없습니다. NOTICE 목록으로 돌아가 주세요.');
        const fields = common.validateInput({ ...posts[index], ...changes });
        const current = posts[index];
        posts[index] = { id: current.id, ...fields, author: current.author, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
        await save(posts);
        return posts[index];
      }),
      remove: id => run(async () => {
        await auth.requireAdmin();
        const posts = await read();
        const index = posts.findIndex(post => post.id === id);
        if (index === -1) throw new Error('삭제할 게시글이 없습니다. NOTICE 목록으로 돌아가 주세요.');
        posts.splice(index, 1);
        await save(posts);
      }),
    };
  }
  return { STORAGE_KEYS, createRepository };
});
