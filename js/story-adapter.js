(function (root, factory) {
  const adapter = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = adapter;
  }
  root.HAROStoryAdapter = adapter;
})(globalThis, function () {
  const isInstagramPostUrl = (value) => {
    if (typeof value !== "string") {
      return false;
    }

    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "instagram.com" || url.hostname === "www.instagram.com") &&
        /^\/(p|reel|tv)\/[\w.-]+\/?$/.test(url.pathname)
      );
    } catch {
      return false;
    }
  };

  const isLocalStoryImage = (value) => {
    if (typeof value !== "string") {
      return false;
    }

    return /^\.\/images\/img-story\/[\w.-]+\.(?:jpe?g|png|webp)$/i.test(value);
  };

  const normalizeItems = (payload) => {
    const records = Array.isArray(payload?.items) ? payload.items : [];
    const unique = new Map();

    records.forEach((record) => {
      if (!record || typeof record !== "object") {
        return;
      }

      const id = typeof record.id === "string" ? record.id.trim() : "";
      const src = record.src;
      const alt = typeof record.alt === "string" ? record.alt.trim() : "";
      if (!id || !isLocalStoryImage(src) || !alt || unique.has(id)) {
        return;
      }

      unique.set(id, {
        id,
        src,
        postUrl: isInstagramPostUrl(record.postUrl) ? record.postUrl : null,
        alt,
      });
    });

    return [...unique.values()];
  };

  const selectRandom = (records, count = 4, random = Math.random) => {
    const pool = Array.isArray(records) ? records.slice() : [];
    const limit = Math.min(Math.max(0, Math.floor(count)), pool.length);

    for (let index = 0; index < limit; index += 1) {
      const randomValue = Math.min(0.999999999, Math.max(0, random()));
      const swapIndex = index + Math.floor(randomValue * (pool.length - index));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }

    return pool.slice(0, limit);
  };

  return Object.freeze({
    isInstagramPostUrl,
    isLocalStoryImage,
    normalizeItems,
    selectRandom,
  });
});