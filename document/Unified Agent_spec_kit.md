# 🤖 Unified Agent Spec-Kit (Vanilla Web Edition)

## 1. Agent Overview & Operating Principles
- **Target Stack**: Native HTML5, CSS3 (Modular / Custom Properties), Vanilla JS (ES6+), GSAP / IntersectionObserver
- **Primary Persona**: Senior Full-Spectrum AI Developer (UI/UX Designer + Frontend Architect)
- **Core Directive**: Generate complete, production-grade, zero-dependency (except specified animation libraries) code. **NEVER use code placeholders or truncated snippets (`// TODO: ...` or `// 생략...`). Always output the entire source code.**

---

## 2. Directory Architecture & File Structure

Every generated or refactored codebase must adhere strictly to this modular structure:

```
project-root/
├── index.html
├── css/
│   ├── tokens.css       # CSS Variables (Design Tokens)
│   ├── base.css         # Reset & Baseline Global Styles
│   ├── layout.css       # Grid, Containers & Spacing
│   ├── components.css   # Reusable UI Elements (Buttons, Cards, Nav)
│   ├── sections.css     # Page Section Specific Styles
│   └── box.css          # Complex Component Specific CSS
├── js/
│   ├── main.js          # App Initialization
│   ├── scroll-animations.js # IntersectionObserver Reveal Logic
│   ├── box-interaction.js  # GSAP Flipbook/Interactive Logic
│   └── goods-carousel.js   # Native Scroll / Carousel Navigation
└── assets/              # Static Images, Fonts, Icons
```

---

## 3. Design System & Token Specifications (`tokens.css`)

```css
:root {
  /* Brand Color Tokens */
  --color-bg-primary: #F6EFE2;
  --color-surface-white: #FFFFFF;
  --color-surface-soft: #FAF7F2;
  --color-surface-story: #ECE7DF;
  
  /* Text & Ink Tokens */
  --color-ink-strong: #111111;
  --color-ink: #222222;
  --color-text-secondary: #666666;
  --color-text-muted: #888888;
  
  /* Border Tokens */
  --color-border: rgba(0, 0, 0, 0.08);
  --color-border-strong: #111111;

  /* Typography System */
  --font-primary: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-display: "Cafe24Syongsyong", var(--font-primary);
  
  /* Spacing Tokens */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 80px;

  /* Layout & Container */
  --content-max-width: 1200px;
  --page-padding: 24px;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
  --radius-pill: 9999px;

  /* Transition Durations & Easing */
  --duration-micro: 0.2s;
  --duration-ui: 0.3s;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 4. UI/UX Design & Component Specifications

### 4.1 Pills & Interactive Buttons (`.btn-pill`)
- **Dimensions**:
  - Desktop: `width: 190px`, `height: 68px`, `font-size: 24px`
  - Tablet: `width: 160px`, `height: 56px`, `font-size: 18px`
  - Mobile: `width: 140px`, `height: 48px`, `font-size: 15px`
- **Styling & State**:
  - Border: `2px solid var(--color-ink-strong)`, Background: `var(--color-surface-white)`, Radius: `var(--radius-pill)`.
  - Hover/Focus: Background inverts to `var(--color-ink-strong)`, Text inverts to `var(--color-surface-white)`.
  - Interaction: `transform: translateY(-2px); transition: all var(--duration-micro) var(--ease-out);`.

### 4.2 Cards & Media Containers
- **Aspect Ratios**: Square (`1 / 1`) for goods/emoticons; Story Card responsive layout (`1440 / 700` ratio).
- **Media Scaling**: Image containers must use `object-fit: contain` or `object-fit: cover` with proper padding to prevent asset cropping.

---

## 5. Development & Architecture Standards

### 5.1 HTML5 & Accessibility (A11y) Rules
- **Semantic Structure**: Strictly enforce standard semantic tags: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- **Keyboard Navigation & SR Support**:
  - Interactive non-button elements MUST include `tabindex="0"`, `role="button"`, and keydown handlers (`Enter`/`Space`).
  - Dynamic elements must dynamically manage `aria-expanded` and `aria-pressed` attributes.
- **Media Optimization**:
  - Non-hero `<img>` elements must feature `loading="lazy"`.
  - Decorative icons/graphics must include `aria-hidden="true"` and an empty `alt=""`.

### 5.2 CSS & Responsive Layout Rules
- **BEM Naming Standard**: Write clean, semantic BEM-style CSS classes (e.g., `.goods-card__media`).
- **Single DOM Responsive Strategy**: Do NOT duplicate DOM nodes for mobile vs. desktop layouts. Rearrange DOM elements exclusively via CSS Media Queries (`1024px`, `860px`, `599px`).
- **GPU-Accelerated Motion**: Transitions must animate hardware-accelerated properties (`transform`, `opacity`) only. Avoid animating layout properties (`top`, `width`, `height`).

### 5.3 Vanilla JavaScript Engineering Rules
- **Performance Optimization**:
  - Utilize Event Delegation for lists and grids.
  - Scroll and resize handlers must be throttled/debounced or managed via `IntersectionObserver` / `ResizeObserver`.
- **Defensive Coding**: Always check for DOM element existence before executing query selectors or manipulating properties.

---

## 6. Unified Quality Checklist
- [ ] Are CSS Variables strictly used for colors, fonts, spacing, and radii?
- [ ] Is the HTML fully semantic and free from unnecessary wrapper `<div>`s?
- [ ] Are all non-hero images configured with `loading="lazy"` and appropriate `alt` tags?
- [ ] Does the UI adapt smoothly across viewports without breaking horizontal layout boundaries?
- [ ] Are all script files imported with `defer` or configured for non-blocking execution?
- [ ] Is the output completely free of code truncations or placeholders?