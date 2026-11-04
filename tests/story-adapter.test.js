const assert = require("node:assert/strict");
const test = require("node:test");
const { isInstagramPostUrl, normalizeItems, selectRandom } = require("../js/story-adapter.js");

const storyItem = {
  id: "story-haro-1",
  src: "./images/img-story/story-haro-1.jpg",
  postUrl: null,
  alt: "하로 인스타툰 이미지",
};

test("normalizes local JSON items and leaves missing post URLs unlinked", () => {
  assert.deepEqual(normalizeItems({ items: [storyItem] }), [
    {
      id: "story-haro-1",
      src: "./images/img-story/story-haro-1.jpg",
      postUrl: null,
      alt: "하로 인스타툰 이미지",
    },
  ]);
});

test("discards duplicate IDs and invalid local paths", () => {
  const items = normalizeItems({
    items: [
      storyItem,
      storyItem,
      { ...storyItem, id: "external-image", src: "https://example.com/image.jpg" },
      { ...storyItem, id: "wrong-folder", src: "./images/img-dt/img_6_tile-1.png" },
      { ...storyItem, id: "missing-alt", alt: "  " },
    ],
  });

  assert.deepEqual(items.map((item) => item.id), ["story-haro-1"]);
});

test("does not treat a profile URL as a post permalink", () => {
  assert.equal(isInstagramPostUrl("https://www.instagram.com/liberoflowerpig/"), false);
  assert.equal(isInstagramPostUrl(null), false);
});

test("returns fewer than four items when fewer are registered", () => {
  const selected = selectRandom(normalizeItems({ items: [storyItem] }), 4, () => 0);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, storyItem.id);
});

test("selects a random set of four items without duplicates", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({ ...storyItem, id: `story-haro-${index + 1}` }));
  const selected = selectRandom(items, 4, () => 0.5);

  assert.equal(selected.length, 4);
  assert.equal(new Set(selected.map((post) => post.id)).size, 4);
});