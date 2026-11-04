(function () {
  const story = document.querySelector("#story");
  const grid = story?.querySelector("[data-story-grid]");
  const status = story?.querySelector("[data-story-status]");
  const adapter = window.HAROStoryAdapter;

  if (!story || !grid || !status || !adapter) {
    return;
  }

  const slotClasses = [
    "story__tile--one",
    "story__tile--two",
    "story__tile--three",
    "story__tile--four",
  ];

  const setStatus = (message) => {
    status.textContent = message;
  };

  const renderItems = (items) => {
    let failedImages = 0;
    const tiles = items.map((item, index) => {
      const tile = document.createElement(item.postUrl ? "a" : "div");
      tile.className = `story__tile ${slotClasses[index % slotClasses.length]}`;
      if (item.postUrl) {
        tile.classList.add("story__tile--linked");
        tile.href = item.postUrl;
        tile.target = "_blank";
        tile.rel = "noopener noreferrer";
      }

      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => {
        tile.replaceChildren();
        tile.classList.add("story__tile--failed");
        failedImages += 1;
        setStatus(`${failedImages}개 이미지를 불러오지 못했습니다. 등록된 다른 이미지를 확인해 주세요.`);
      }, { once: true });
      tile.append(image);
      return tile;
    });

    grid.replaceChildren(...tiles);
    grid.dataset.postCount = String(items.length);
    if (items.some((item) => !item.postUrl)) {
      setStatus("Instagram 게시물 URL이 등록되지 않은 이미지는 링크 없이 표시됩니다.");
    } else {
      setStatus("");
    }
  };

  const loadLocalItems = async () => {
    try {
      const response = await fetch("./data/story.json", {
        headers: { Accept: "application/json" },
        cache: "no-cache",
      });
      if (!response.ok) {
        throw new Error("story_data_unavailable");
      }

      const payload = await response.json();
      const items = adapter.selectRandom(adapter.normalizeItems(payload), 4);
      if (items.length === 0) {
        grid.replaceChildren();
        grid.dataset.postCount = "0";
        setStatus("표시할 로컬 인스타툰 이미지가 없습니다.");
        return;
      }

      renderItems(items);
    } catch {
      setStatus(
        window.location.protocol === "file:"
          ? "story.json을 불러오려면 로컬 HTTP 서버에서 페이지를 열어주세요."
          : "로컬 인스타툰 목록을 불러오지 못했습니다. 기존 플레이스홀더를 표시합니다.",
      );
    }
  };

  loadLocalItems();
})();