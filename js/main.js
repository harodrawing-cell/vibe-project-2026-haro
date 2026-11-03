const menuToggle = document.querySelector(".site-nav__toggle");
const siteNav = document.querySelector("#site-nav");

if (menuToggle && siteNav) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "메뉴 열기");
    siteNav.classList.remove("is-open");
  };

  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute("aria-label", isExpanded ? "메뉴 열기" : "메뉴 닫기");
    siteNav.classList.toggle("is-open", !isExpanded);
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuToggle.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menuToggle.focus();
    }
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.closest('a[href^="#"]')) {
      closeMenu();
    }
  });
}

const boxButton = document.querySelector(".hero__button-look");
const heroBox = document.querySelector("#hero-box");
const boxFrame = document.querySelector("#hero-box-frame");
const scrollHint = document.querySelector(".hero__scroll-hint");

if (boxButton && heroBox && boxFrame && scrollHint) {
  const frameSources = Array.from(
    { length: 12 },
    (_, index) =>
      `./images/box-animation/transparent/BOX_${String(index + 1).padStart(3, "0")}.png`,
  );
  const frameDuration = 125;

  let preloadedFrames = null;
  const preloadFrame = (src) => {
    const image = new Image();
    image.src = src;
    return image.decode().then(
      () => image,
      () => {
        throw new Error(`상자 프레임을 불러오지 못했습니다: ${src}`);
      },
    );
  };

  const finishOpening = () => {
    heroBox.classList.remove("is-opening");
    heroBox.classList.add("is-open");
    boxFrame.src = frameSources[frameSources.length - 1];
    boxFrame.alt = "상자에서 고개를 내민 하로";
    boxButton.setAttribute("aria-label", "하로가 상자에서 나왔습니다");
    scrollHint.hidden = false;
  };

  const resetBox = () => {
    heroBox.classList.remove("is-opening", "is-open");
    boxFrame.src = frameSources[0];
    boxFrame.alt = "닫힌 HARO 상자";
    boxButton.disabled = false;
    boxButton.setAttribute("aria-label", "상자를 열어 하로 만나기");
    scrollHint.hidden = true;
  };

  boxButton.disabled = true;
  Promise.all(frameSources.map(preloadFrame))
    .then((frames) => {
      preloadedFrames = frames;
      boxButton.disabled = false;
    })
    .catch((error) => {
      console.error(error);
      scrollHint.textContent = "상자 애니메이션 이미지를 불러오지 못했습니다.";
      scrollHint.hidden = false;
    });

  let previousScrollY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > previousScrollY && heroBox.classList.contains("is-open")) {
        resetBox();
      }
      previousScrollY = currentScrollY;
    },
    { passive: true },
  );

  boxButton.addEventListener("click", () => {
    if (
      boxButton.disabled ||
      !preloadedFrames ||
      heroBox.classList.contains("is-opening")
    ) {
      return;
    }

    boxButton.disabled = true;
    heroBox.classList.add("is-opening");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      boxFrame.src = frameSources[frameSources.length - 1];
      finishOpening();
      return;
    }

    const startedAt = performance.now();
    let frameIndex = 0;
    const showNextFrame = (now) => {
      const elapsed = now - startedAt;
      const nextFrameIndex = Math.min(
        Math.floor(elapsed / frameDuration),
        preloadedFrames.length - 1,
      );

      if (nextFrameIndex > frameIndex) {
        frameIndex = nextFrameIndex;
        boxFrame.src = preloadedFrames[frameIndex].src;
      }

      if (elapsed >= preloadedFrames.length * frameDuration) {
        finishOpening();
        return;
      }

      window.requestAnimationFrame(showNextFrame);
    };

    window.requestAnimationFrame(showNextFrame);
  });
}

const revealElements = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && revealElements.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );

  revealElements.forEach((element) => {
    element.classList.add("is-revealing");
    revealObserver.observe(element);
  });
}
