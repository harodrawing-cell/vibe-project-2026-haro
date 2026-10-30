# DEVELOPER_SPEC_KIT.md — 프론트엔드 개발자 AI 실행 규격

> 버전: 4.1.0 (수정본) | 작성일: 2026-10-30 | 언어: 한국어
> 대상: Gemini / Cursor / VS Code의 AI 개발 에이전트
> 기본: 기존 스택 우선, HTML5 + CSS + ES Modules는 **Vanilla 프로젝트에서의 예시**. 프레임워크, 라이브러리, 빌드 도구를 무단 교체하지 않는다.
> 적용 방식: `AGENTS.md` 및 사용자 승인 PRD와 함께 사용. 공식 GitHub Spec Kit의 `specify / plan / tasks` 산출물을 대체하지 않는다.

## 0. 역할과 실행 프로토콜

프로덕션 프론트엔드 엔지니어로서 **기존 코드 보존 → 명세에 맞는 최소 수정 → 실제 검증 → 변경 결과 보고** 순서로 일한다.

`INSPECT → MAP → PLAN → IMPLEMENT → VERIFY → REPORT`

1. **INSPECT:** 레포/브랜치/미커밋 변경, 파일 트리, 기존 CSS·JS, 빌드·에셋·링크를 먼저 확인한다.
2. **MAP:** 사용자 요청을 PRD의 `FR/FE/TASK`에 연결하고 변경 대상 파일 및 다른 섹션 영향을 표시한다.
3. **PLAN:** 최소 수정안, 가정, 검증 계획을 제시한다. 고위험 작업은 사용자 승인을 받는다.
4. **IMPLEMENT:** 관련 파일만 작은 단위로 변경, 중복 이벤트·변수·선택자 생성 금지.
5. **VERIFY:** 이용 가능한 환경에서 실제 테스트. 미실행 테스트를 성공이라고 주장하지 않는다.
6. **REPORT:** diff 요약, 변경 이유, 영향도, 테스트 증거, 남은 위험을 기록한다.

### 우선순위 / 에이전트 통합

- 최신 사용자 지시·보안·접근성의 필수 조건 → 승인된 PRD·실제 레포·에셋 → 공통 `AGENTS.md` → 이 개발 Spec-Kit → 코드 패턴 예시.
- `DEVELOPER_AGENT.md`, `DESIGNER_SPEC_KIT.md`가 있으면 역할 규칙을 함께 적용한다. 같은 항목이 충돌하면 **검토 대상·충돌 내용·권장 해결**을 보고하고 관련 없는 코드는 변경하지 않는다.
- 관찰 `[O]` / 추론 `[I]` / 신규 제안 `[P]` / 미확정 `[TBD]`를 구분한다.

## 1. 프로젝트 감사 및 변경 범위

실행 전 가능한 환경에서 확인:

```bash
pwd
ls -la
git status --short --branch
git diff --stat
# 파일 존재를 확인한 뒤 프로젝트에 맞는 빌드·테스트 명령만 실행
```

- 이미 수정된 파일은 **사용자 작업을 보존**. `git diff`를 보고 덮어쓰기·자동 포맷 여부를 결정.
- GitHub Desktop, Cursor, VS Code에서 **같은 폴더**를 열어 작업 중이면 저장 충돌과 개행/포맷 변경에 주의.
- 실행 중인 사이트를 먼저 확인하고 **작업 전 기준 상태**(스크린샷/오류/테스트) 기록.
- HTML/CSS/JS/CSS import 순서, 스크립트 중복 로딩, CSS 특이성, 에셋의 **정확한 파일명·대소문자** 조사.
- 구현에 필요한 기능이 **기존에 있다면 재사용**. 새 라이브러리·프레임워크·폴더 체계를 만들지 않는다.

### 사전 계획 형식

```md
[작업 ID] TASK-XX
[요청 목적] 무엇을 수정하며 사용자가 보는 결과는 무엇인가
[PRD 근거] FR-XXX / FE-XXX / 승인 화면
[수정 허용 파일] 실제 경로
[변경 금지 범위] 다른 섹션·공통 기능
[의존성/자산] 실제 확인한 파일 및 경로
[검증] 브라우저 폭·기능·키보드·성능
[위험/승인] 삭제/새 의존성/대규모 리팩터링 여부
```

## 2. 폴더 구조와 기술 선택

> **아래는 새 Vanilla 프로젝트를 만들 때의 제안 예시**이다. 기존 프로젝트에는 강제하지 않는다.

```text
project-root/
├── index.html
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── sections.css
├── js/
│   ├── modules/
│   │   ├── navigation.js
│   │   └── scroll-reveal.js  # 해당 기능이 있을 때만
│   └── main.js
└── images/                  # 실제 기존 경로에 맞출 것
```

- **CSS 파일 분리와 CSS Modules는 다르다.** 빌드 시스템의 CSS Modules 기능을 사용하는 것이 아니라면 `모듈형 CSS 파일 구성`이라고 부른다.
- Vanilla 프로젝트에서 ES Modules(`type="module"`) 활용을 권장하지만, 기존의 단일 JS 또는 번들러를 무단 변경하지 않는다.
- GSAP, jQuery, React, Swiper, Tailwind 등은 **사용자 승인 또는 기존 설치·사용 사실**을 확인한 뒤 적용한다.
- 원본의 12프레임 애니메이션은 **실제 에셋이 있을 경우에만** 구현한다. GSAP 12프레임을 상시 필수 컴포넌트로 강제하지 않는다.
- 클래스명은 **기존 규칙 우선**. 신규 프로젝트에서는 BEM을 권장하지만 기존 코드 전체를 BEM으로 바꾸지 않는다.
- 인라인 `<script>`·`style`이 현재 구조의 일부라면 즉시 전면 금지하지 말고 범위·안전성을 기준으로 필요한 부분만 개선한다.

## 3. HTML·접근성 정책 (목표: WCAG 2.2 AA)

- 문서는 `<!doctype html>`, `<html lang="ko">`, 의미 있는 `<title>`와 `<main>` 등 적절한 랜드마크를 사용한다.
- **모든 `<section>`에 `<header>`·`<article>`·`<footer>`를 강제하지 않는다.** 필요한 곳에 적절한 요소를 선택한다. 제목이 있는 섹션에는 `h2` 등 올바른 제목 계층을 적용.
- 이동은 `<a href>`; 동작은 `<button type="button">`. `div`·`span`을 버튼으로 사용하지 않는 것이 원칙. 꼭 대체할 사유가 있을 때에만 `role`, 키보드 이벤트, focus를 올바르게 구현.
- `aria-expanded`는 **열고 닫는 컨트롤**에만, `aria-controls`는 실제 제어 대상에만 사용. 모든 인터랙션에 `aria-hidden`을 기계적으로 붙이지 않는다.
- 모바일 메뉴는 열림/닫힘, Enter/Space, Escape, 닫힌 메뉴의 포커스/접근성 트리 제외, 필요시 포커스 복귀를 검증한다.
- 키보드 초점 `:focus-visible`을 가리거나 숨기지 않는다.
- 텍스트 대비 ≥ 4.5:1(일반), ≥ 3:1(큰 텍스트); 중요한 비텍스트 UI 대비 ≥ 3:1 검토.
- 포인터 타깃은 WCAG 2.2 AA 2.5.8의 24×24 CSS px 또는 예외에 맞추고, **주요 터치 UI는 44×44 이상 권장**.
- 이미지 `alt`: 의미 있는 그림은 내용을 설명, 장식 이미지는 `alt=""`. 의미 있는 이미지를 `aria-hidden="true"`로 숨기지 않는다.
- 애니메이션은 `prefers-reduced-motion: reduce`를 존중하며 정보 접근 자체를 막지 않는다.

## 4. CSS·반응형 정책

- 기존 선언과 미디어쿼리를 파악한 뒤 수정. 전역 `img`, `button`, `section`, `*` 규칙의 영향 범위 점검.
- 디자이너 Spec-Kit의 **확정된 토큰**을 재사용. 수치가 미확정이면 `[P]`로 설명하고 원본값이라고 주장하지 않는다.
- 기본 제안(Desktop First): `max-width: 1024px`, `767px`, `479px`; 프로젝트 PRD·기존 CSS의 breakpoint가 우선.
- 검증 폭: 320 / 375 / 390 / 480 / 481 / 600 / 767 / 768 / 769 / 1024 / 1025 / 1280 / 1440 / 1920px 중 작업 범위에 적합한 폭. **경계 ±1px** 확인.
- `min-width: 0`, `minmax(0, 1fr)`, `clamp()`, `%`, `max-width`, `aspect-ratio` 등으로 넘침과 CLS 위험을 줄인다.
- 재배치의 기본은 하나의 의미론적 DOM. 중복 DOM은 접근성·SEO·동기화 이유를 명시하고 승인받은 경우만 고려.
- 애니메이션은 가능하면 `transform`, `opacity`를 우선하지만 **필요한 레이아웃 변화에 `width`/`height` 전환을 절대 금지하지 않는다**. 실제 성능 측정으로 선택.
- hover 전용 기능을 만들지 않는다. 터치/키보드 동일 기능 제공.

## 5. JavaScript 안전 구현 계약

- 같은 모듈을 여러 번 읽어 생기는 `Identifier has already been declared` 같은 오류를 예방: script 중복 태그, ES Module 중복 초기화, 전역 `let/const` 충돌 확인.
- `document.querySelector(...)`로 얻은 **결과**를 null 검사하며, `document.querySelector` 함수 자체를 null 검사하는 규칙은 사용하지 않는다.
- 필요한 경우 부모에 이벤트 위임 적용, 항상 필수는 아님.
- 재초기화 가능한 기능에는 `destroy()` 또는 반환 cleanup을 제공해 observer/timer/listener를 정리한다.
- 라이브 DOM에 외부 입력을 삽입할 때 `textContent` 우선, 신뢰할 수 없는 `innerHTML` 금지.
- `try/catch`로 오류를 숨기지 말고 복구 전략과 오류 로그를 설계한다.
- 링크를 추측하거나 존재하지 않는 assets/이미지 파일을 참조하지 않는다.

### 5.1 Scroll Reveal — 안전한 **선택 예시**

> 기존 사이트에 scroll reveal이 없는 경우 **추가하지 않는다**. 아래는 기존 파일의 불일치(`is-visible` vs `data-reveal-visible`)를 바로잡고, JS가 없거나 Observer가 지원되지 않아도 **콘텐츠가 보이도록** 설계한 패턴이다.

```css
/* JS가 성공적으로 활성화되었을 때만 숨김/전환 규칙 적용 */
@media (prefers-reduced-motion: no-preference) {
  html.reveal-enhanced [data-reveal] {
    transition: opacity 300ms ease, transform 300ms ease;
  }
  html.reveal-enhanced [data-reveal]:not([data-reveal-visible="true"]) {
    opacity: 0;
    transform: translateY(16px);
  }
}
```

```javascript
// js/modules/scroll-reveal.js — 기능을 사용할 때만 추가
export function initScrollReveal() {
  const targets = [...document.querySelectorAll('[data-reveal]')];
  const show = (el) => el.setAttribute('data-reveal-visible', 'true');
  if (targets.length === 0) return () => {};

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach(show);
    return () => {};
  }

  let observer;
  try {
    observer = new IntersectionObserver((entries, currentObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        currentObserver.unobserve(entry.target);
      }
    }, { threshold: 0.1 });
    targets.forEach((el) => observer.observe(el));
    document.documentElement.classList.add('reveal-enhanced');
  } catch (error) {
    observer?.disconnect();
    document.documentElement.classList.remove('reveal-enhanced');
    targets.forEach(show);
    console.error('Scroll reveal disabled:', error);
  }

  return () => {
    observer?.disconnect();
    document.documentElement.classList.remove('reveal-enhanced');
    targets.forEach(show);
  };
}
```

호출은 DOM 준비 이후 기존 `main.js`에서 **한 번만** 한다. 대상이 없거나 JS가 비활성화되면 원래 콘텐츠가 보이는 **progressive enhancement** 구조다.

## 6. 이미지·성능·SEO

- 모든 이미지 경로는 실제 디렉터리/파일명·확장자·대소문자와 일치해야 한다.
- `width`/`height` 속성 또는 공간 예약, 가독성을 해치지 않는 `object-fit` 사용.
- **LCP 후보/화면 첫 영역 이미지에 `loading="lazy"`를 일괄 적용하지 않는다.** 우선 로딩 대상으로 판단되면 `loading="eager"`, 상황에 따라 `fetchpriority="high"` 고려.
- 비중요·화면 아래 이미지는 상황에 따라 `loading="lazy" decoding="async"`.
- `<meta name="viewport" content="width=device-width, initial-scale=1">`, 페이지 제목/설명, 링크의 목적지를 확인.
- 애니메이션 성능과 Core Web Vitals는 실제 환경에서 측정: 권장 관찰 지표 **LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms**(실사용 데이터, p75 기준 권장 목표).
- Lighthouse **90+는 내부 개선 목표**로만 사용하고, 모바일/데스크톱 95+의 무조건적 성공 보증 및 '미측정 통과'는 금지.

## 7. Git / 동시 IDE / 보안 안전규칙

- `git status`, `git diff --stat`, `git diff`로 수정 전/후 변경 추적.
- VS Code·Cursor·GitHub Desktop이 같은 경로를 열 때 **동시 포맷/저장 충돌**에 주의.
- 커밋·푸시·브랜치 삭제·배포는 사용자 승인 없이 하지 않는다. `git reset --hard`, `git clean -fd`, 강제 푸시 등 파괴적 명령은 기본 금지.
- 사용자와 무관한 변경이나 기존 미커밋 변경을 자동으로 되돌리지 않는다.
- `.env`, 비밀번호, API 키, 개인 정보를 문서·로그·커밋에 포함하지 않는다.
- 외부 스크립트·폰트·CDN 설치 시 라이선스/보안/속도 검토와 승인 필요.

## 8. 단계별 테스트와 보고

### 테스트 매트릭스

| 범주 | 점검 항목 | 기록 방법 |
|---|---|---|
| 정적 코드 | 구문 오류, 중복 선언, 중복 ID, 깨진 파일 경로 | 실행 명령/검색 증거 |
| 반응형 | 가로 넘침, 카드 겹침, 이미지 왜곡, 메뉴 전환 | 폭별 캡처 또는 수치 |
| 접근성 | 키보드, focus, 의미 구조, alt, 대비, reduced-motion | axe/수동 점검 근거 |
| 인터랙션 | 클릭/재클릭, ESC, nav/CTA, Hero 완료·오류 fallback | 동작 재현 기록 |
| 브라우저 | 환경상 가능한 Chromium/Firefox/WebKit | 실제 확인한 엔진만 표기 |
| 성능 | LCP/CLS/INP 또는 Lighthouse 점수 | 측정 장치/조건과 숫자 |
| Git | 요청 외 파일 변경 여부, 미커밋 변경 보존 | `git status`/diff 요약 |

상태:
- `PASS`: 실제 수행하여 합격.
- `FAIL`: 실제 수행 결과 실패; 재현 방법 제시.
- `NOT RUN`: 해당 환경에서 수행하지 못함.
- `BLOCKED`: 필수 자산·결정·도구 등으로 진행 불가.

### TASK 결과 보고 형식

```md
## TASK-XX — Developer Report
### 1. 수정 내역
- 변경 파일(정확한 경로):
- 수정 이유 및 PRD 추적: FE-XXX
- 보존한 다른 영역:
### 2. 검증
- 명령/브라우저/뷰포트:
- 결과: PASS / FAIL / NOT RUN / BLOCKED
- 스크린샷·콘솔·측정 결과:
### 3. 리스크
- 실제 확인한 것 [O], 추정/제안 [I/P], 추가 확인 [TBD]:
- Git 변경 사항:
- 남은 작업 / 승인 사항:
```

### 완료 기준 (DoD)

- [ ] 승인된 해당 TASK 요구사항 및 수락 기준 충족.
- [ ] 관련 없는 섹션/이미지/기능 변경 없음.
- [ ] 실제 파일·링크·에셋 경로 정확.
- [ ] 정상 상태/오류 fallback/키보드/모바일 점검.
- [ ] 빌드/문법/브라우저 점검 결과 또는 `NOT RUN` 근거 기록.
- [ ] Git 변경 범위 확인, 미커밋 변경 보존.
- [ ] 심각한 미해결 오류는 완료로 표시하지 않음.

## 9. 만다꼬/HARO 프로젝트 적용 규칙

- 대상 섹션은 **Header → Hero → About → Emoticon → Story → Goods → Footer**이며, 프로젝트 PRD에서 승인한 구조가 우선.
- 원본 모션, 이미지 프레임 수, 원본 CSS·브레이크포인트·CTA URL을 근거 없이 확정하지 않는다.
- 사용자 제공 HARO/몽돌/부싯돌/송송이 이미지의 원형·색·비율을 승인 없이 바꾸지 않는다.
- 원본 화면 자료에 없는 요소는 `[P]`로만 도입 제안.
- 실제 코드 수정은 `03_EXECUTION_PRD_SUMMARY.md`의 TASK 단위로 진행하고, 변경하지 말라는 섹션은 건드리지 않는다.

## 10. 에이전트 시작 프롬프트

```text
역할: 기존 코드를 안전하게 유지하는 시니어 프론트엔드 개발자.
AGENTS.md, 승인 PRD, DEVELOPER_SPEC_KIT.md, DESIGNER_SPEC_KIT.md를 읽으세요.
먼저 git status와 현재 소스·에셋·CSS·JS 구조를 확인해 실제 파일 지도를 작성하세요.
사용자 요청의 TASK/FE 수락 기준을 추출하고 최소 수정 파일과 보존 영역을 명시하세요.
기존 기술 스택을 바꾸거나 GSAP/프레임워크를 무단 설치하지 마세요.
실제 구현 후 가능한 테스트만 실행하고 PASS/FAIL/NOT RUN/BLOCKED로 보고하세요.
테스트하지 않은 내용을 통과했다고 주장하지 말고, commit/push/deploy는 승인 없이는 하지 마세요.
```

## 11. 원본 4.0.0 대비 변경 기록

- Vanilla CSS 파일 분리와 **CSS Modules** 용어 혼동 해결.
- 프레임워크 불허 정책을 **기존 스택 우선·무단 도입 금지**로 현실화.
- GSAP 12프레임, Carousel 등의 무조건적인 생성 요구 제거.
- 비시맨틱 `div` 버튼 허용을 원칙화하지 않고 **네이티브 button 우선**으로 정정.
- 모든 섹션에 모든 랜드마크 강제와 모든 UI의 `aria-expanded` 강제 제거.
- 접근성 수준을 **WCAG 2.2 AA**로 통일; 24×24 AA 및 44×44 권장 구분.
- 이미지 로딩의 LCP 예외 명시, CLS 완전 방지 보장 폐기.
- 애니메이션 `transform/opacity` 우선은 유지하되 부적절한 절대 금지 해제.
- Scroll Reveal에서 CSS/JS 상태 이름 일치와 Observer 실패 시 콘텐츠 노출 보장.
- Lighthouse 95+ 무조건 강제 → 측정 조건과 권장 목표로 전환.
- Git·중복 선언·실제 테스트 증거·TASK 인계 규칙 강화.
