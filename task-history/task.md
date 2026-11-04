# 작업 이력 및 다음 작업 인계

> 다음 작업을 시작하기 전에 이 문서를 읽고, 아래 인계 사항과 현재 저장소 상태를 대조한다. 현재 사용자 요청과 실제 코드가 이 문서보다 우선하며, 완료되지 않은 기능을 이미 구현된 것으로 가정하지 않는다. 작업이 끝나면 변경·검증 결과와 남은 일을 이 문서에 갱신한다.

## 이전 작업: HARO 상단 히어로 화면 구성

- **요청:** README 및 프로젝트 명세를 확인하고, 첨부된 데스크톱 화면을 참고해 기본 HTML/CSS 구성과 상단 화면을 구현한다. 이미지 파일을 만들지 않고 상자 형태로 표현한다.
- **완료 상태:** 상단 헤더 및 히어로 화면 구현 완료. 이후 페이지 섹션과 실제 인터랙션은 미구현.

### 구현 내용

- `index.html`에 한국어 문서 기본 구조, 페이지 제목·설명, 건너뛰기 링크, 헤더/메뉴, `main`, 히어로 제목과 태그라인을 추가했다.
- 화면의 방 분위기(창문, 커튼, 책장, 바닥)와 HARO 상자 및 발바닥 표시는 이미지 없이 CSS 도형으로 만들었다.
- README의 CSS 분리 구조에 맞춰 아래 스타일시트를 생성하고 HTML에서 순서대로 연결했다.
  - `css/tokens.css`: 색상, 글꼴, 간격, 레이아웃 토큰
  - `css/base.css`: 기본 스타일, 포커스 표시, 모션 감소 설정
  - `css/layout.css`: 헤더·히어로 배치와 좁은 화면 대응
  - `css/components.css`: 브랜드명, 메뉴, 제목, 태그라인, CTA 표현
  - `css/box.css`: CSS 상자와 발바닥 도형
  - `css/sections.css`: 창문·커튼·책장·바닥 배경 표현
- 태그라인 색상 대비를 개선해 단색 히어로 배경 기준 약 3.47:1로 조정했다. 데스크톱 크기에서는 큰 텍스트 기준(3:1)을 만족하지만, 작은 화면의 19px 글꼴에서는 일반 텍스트 기준(4.5:1)에 미달할 수 있으므로 후속 접근성 검토가 필요하다.

### 검증 결과

- 로컬 브라우저에서 HTML을 열어 히어로 화면을 렌더링했다.
- 연결된 CSS 6개가 모두 브라우저에 로드되는 것을 확인했다.
- 320, 375, 390, 760, 761, 1161, 1920px 너비에서 문서 가로폭이 뷰포트 너비를 초과하지 않는 것을 확인했다.
- 별도의 자동화 테스트, 키보드 상호작용 테스트, 실제 이미지/폰트 자산 테스트는 하지 않았다.

### 남은 작업과 주의사항

- 당시에는 이미지 자산이 확인되지 않아 방과 상자를 CSS 도형으로 만들었다. 최근 작업에서 실제 방·상자 이미지를 적용했고, 웹폰트는 여전히 제공되지 않아 시스템 폴백을 사용한다.
- `CLICK`과 “열어볼래?”는 모양만 구현되어 있으며 클릭 기능은 없다.
- 메뉴의 ABOUT HARO / EMOTICON / STORY / GOODS 항목은 텍스트 표시이며 아직 각 섹션에 연결되지 않았다.
- 후속 작업 전에 현재 PRD와 실제 자산을 확인하고, 필요한 섹션·링크·인터랙션을 이어서 구현한다. 이미 구성된 문서 골격과 6개 CSS 파일을 확인 없이 중복 생성하거나 교체하지 않는다.

## 다음 작업 시작 절차

1. `README.md`와 이 파일을 읽고, 이번 요청과 기존 작업 범위를 구분한다.
2. README에서 지정한 프로젝트 규약 및 관련 PRD를 확인한다.
3. 실제 HTML/CSS/JS와 자산 상태를 살펴 이 인계 내용이 여전히 유효한지 확인한다.
4. 현재 코드와 사용자 요청을 기준으로 미완료 사항만 진행하고, 이미 구현된 작업을 반복하지 않는다.
5. 작업 후 이 문서의 완료 상태, 변경 파일, 검증 결과, 남은 작업을 갱신한다.

## 최근 작업: 히어로 반응형 및 실제 이미지 적용

- **요청:** mandaco 참고 화면을 바탕으로 HARO 히어로를 데스크톱/태블릿/모바일 대응하고 `images/used`의 실제 방 배경과 상자 이미지를 사용한다.
- **완료 상태:** HTML/CSS 반응형 레이아웃과 모바일 메뉴 토글 구현 및 브라우저 확인 완료.
- **변경 파일:** `index.html`, `css/tokens.css`, `css/layout.css`, `css/components.css`, `css/box.css`, `css/sections.css`, `js/main.js`, `task-history/task.md`.
- **구현 내용:** 헤더를 고정하고 화면 높이에 맞춘 히어로, 데스크톱 우측 CTA 및 중앙 상자, 태블릿 중앙 CTA 및 하단 상자, 모바일 햄버거 메뉴와 커튼 중심 배경 크롭을 적용했다. 실제 방 배경과 상자 정적 이미지를 연결했다. SNS 표식은 히어로에 어울리지 않아 다음 수정에서 제거했다.
- **확인 사항:** `haro-dt-10.png`, `haro-tab-18.png`, `haro-mob-16.png`은 1280×1024이며 파일 해시가 동일하다. SNS 실제 계정 URL은 저장소에서 찾지 못했다. `spec-kit/AGENTS.md`는 저장소에 없었다. 기존 CLICK CTA는 시각 요소로 유지했다.
- **검증:** 1920×1080, 1024×768, 769×768, 768×900, 375×735, 320×568에서 브라우저 레이아웃, 반응형 배경 자산 및 상자 이미지 로드를 확인했다. 가로 넘침이 없고, 스크롤 뒤에도 헤더가 고정됨을 확인했다. 모바일 메뉴 열기/닫기(Escape 포함)를 확인했다. 태그라인 대비는 #f7f3eb 배경 기준 4.86:1이다. 데스크톱·태블릿·모바일 화면을 시각 점검했으며 별도 자동화 테스트 러너는 실행하지 않았다.

## 후속 수정: SNS 표식 제거 및 상자 애니메이션 자리 유지

- **요청:** 하단 SNS 표식은 footer 영역이므로 현재 히어로 화면에서 제거하고, 상자는 추후 애니메이션이 들어갈 자리로 사용한다.
- **변경:** `index.html`에서 SNS aside를 제거하고 `css/components.css`의 관련 고정 스타일을 삭제했다. `.hero-box` 반응형 컨테이너는 유지하며 현재 내부 이미지는 애니메이션 적용 전까지의 시각용 자리표시자로 남겼다.
- **검증:** 1920×1080, 1024×768, 768×900, 375×735에서 브라우저로 SNS aside 부재, 상자 컨테이너·이미지 로드, 가로 넘침 없음과 반응형 상자 위치를 확인했다.

## 002: ABOUT HARO 섹션 및 HERO 상자 인터랙션

- **요청:** HERO의 CLICK으로 상자를 열고, 애니메이션 완료 후 스크롤 안내를 표시한다. HERO 다음에 ABOUT HARO를 추가하고 데스크톱/태블릿/모바일 반응형 레이아웃을 적용한다.
- **완료 상태:** 구현 및 브라우저 검증 완료.
- **변경 파일:** `index.html`, `css/base.css`, `css/layout.css`, `css/components.css`, `css/box.css`, `css/sections.css`, `js/main.js`, `task-history/task.md`.
- **구현 내용:**
  - HERO CTA를 실제 버튼으로 연결했다. 클릭은 한 번만 실행되며 상자가 흔들린 뒤 CSS 뚜껑이 열리고 제공된 하로 이미지가 올라온다. 완료 후 버튼은 비활성화되고 스크롤 안내가 나타난다. 클릭 이후 자동 스크롤은 하지 않는다.
  - `images/used`에 프레임 시퀀스가 없어 상자 애니메이션은 실제 프레임 재생이 아니라 CSS 뚜껑 회전과 하로 이미지 등장으로 구성했다. 모션 감소 설정에서는 애니메이션 없이 완료 상태로 전환한다.
  - HERO 다음에 ABOUT HARO를 추가했다. 데스크톱은 캐릭터 이미지와 소개 문구를 가로 배치하고, 1024px 이하에서는 타이틀 → 캐릭터 → 소개 타이틀 → 설명 순으로 세로 중앙 정렬한다. 데스크톱 발자국 장식은 태블릿 이하에서 숨긴다.
  - ABOUT 이미지 및 발자국은 프로젝트의 `images/used` 자산을 사용했다. 모바일에서 설명 문구의 짧은 외톨이 줄을 피하도록 최대 너비를 조정했다.
  - 320px 화면에서 최소 너비 고정으로 발생하던 가로 넘침을 막기 위해 문서와 본문의 `min-width: 320px`를 제거했다.
- **검증:** 브라우저에서 1920, 1024, 769, 768, 390, 375, 320px 너비를 확인했다. 데스크톱 ABOUT 가로 배치와 태블릿/모바일 세로 배치, 이미지 로드·원본 비율, 320px 포함 가로 넘침 없음, 375px 설명 줄바꿈을 확인했다. HERO 버튼 클릭 후 열린 상자, 비활성 버튼, 스크롤 안내를 확인했고, 모션 감소 설정에서도 즉시 열린 상태와 안내가 표시됨을 확인했다. 태블릿·모바일 ABOUT와 열린 HERO 상자를 브라우저에서 시각 점검했다. 저장소에 자동화 테스트 파일은 없어 별도 테스트 러너는 실행하지 않았다.

## HERO 상자 12프레임 PNG 애니메이션

- **요청:** 닫힌 상자에서 시작해 미세한 흔들림, 뚜껑 개방, 하로가 고개를 내미는 12프레임 애니메이션을 재생하고 마지막 프레임을 유지한다.
- **구현:** 실제 자산 이름은 요청 예시의 `box_01.png` 형식이 아니라 `images/box-animation/BOX_001.png`부터 `BOX_012.png`까지여서 제공된 파일명을 그대로 사용했다. HERO 상자를 단일 프레임 이미지로 교체하고 12개 이미지를 미리 로드한 뒤 125ms 간격으로 순서대로 전환한다. 클릭 중 버튼을 비활성화하고, 재생 완료 후 마지막 프레임과 스크롤 안내를 유지한다. 모션 감소 설정에서는 마지막 프레임으로 바로 전환한다.
- **레이아웃 처리:** 프레임 캔버스 크기에 맞춰 이미지를 절대 배치해 프레임 사이 위치와 비율을 고정했다. 기기별 별도 프레임을 두지 않고 동일한 시퀀스를 사용한다.
- **변경 파일:** `index.html`, `css/box.css`, `js/main.js`, `task-history/task.md`.
- **후속 요청:** 흰 배경이 투명해 보이는 합성을 제거하고, 애니메이션 완료 후 아래로 스크롤하면 상자를 닫힌 프레임으로 되돌려 다시 열 수 있도록 했다. 스크롤 안내는 상자를 초기화할 때 숨긴다.
- **후속 변경 파일:** `css/box.css`, `js/main.js`, `task-history/task.md`.
- **검증:** 사용자가 오류가 없으면 테스트하지 말라고 요청해 이번 수정에 대해서는 테스트를 실행하지 않았다.
- **흰 배경 투명 처리:** 원본 프레임의 바깥과 연결된 흰색 픽셀만 알파 투명하게 만든 복사본 12장을 `images/box-animation/transparent/`에 생성하고, HERO 프리로드 및 프레임 재생 경로를 복사본으로 연결했다. 원본 PNG는 보존했다. 요청에 따라 별도 테스트는 실행하지 않았다.

## EMOTICON 섹션 및 외부 스토어 링크

- **요청:** EMOTICON 섹션 하단의 OGQ/카카오 버튼을 제공된 URL 규칙에 맞춰 연결한다. 기존 화면에 EMOTICON 섹션과 버튼이 없음을 확인해, 사용자 확인 후 첨부 디자인과 저장소 이미지 자산을 바탕으로 섹션도 추가했다.
- **구현:** `images/img-dt/img_6_tile-1.png`부터 `img_9_tile-4.png`까지 네 이미지를 갤러리에 배치했다. 데스크톱/태블릿은 4열, 모바일은 2×2열로 전환한다. 내비게이션의 EMOTICON 항목을 섹션 앵커에 연결했다.
- **링크:** OGQ 버튼은 제공된 검색 URL을 새 탭에서 열며 `rel="noopener noreferrer"`를 적용했다. 카카오 버튼은 URL이 아직 없어 같은 캡슐형 버튼 디자인을 유지한 채 비활성화했다. 버튼에 hover 스타일을 적용하고, OGQ 링크는 기존 전역 키보드 포커스 스타일을 사용한다.
- **변경 파일:** `index.html`, `css/layout.css`, `css/components.css`, `task-history/task.md`.
- **검증:** 사용자의 요청에 따라 테스트는 실행하지 않았다.

## HERO 상자 프레임 재생 안정화

- **요청:** 상자 애니메이션이 불규칙하게 동작하거나 멈추는 원인 확인.
- **원인 및 수정:** 프레임은 이미지 다운로드 완료까지만 확인하고, 브라우저의 디코딩 완료 전에도 125ms마다 `src`를 바꾸고 있었다. 느린 기기에서는 디코딩 지연 때문에 프레임 전환이 멈춘 것처럼 보일 수 있다. 이제 모든 프레임을 `Image.decode()`로 사전 디코딩하고, `requestAnimationFrame`과 경과 시간 기준으로 프레임을 전환한다. 디코딩 실패 시에는 콘솔에 구체적인 프레임 오류를 남기고 안내 영역에 실패 상태를 표시한다.
- **변경 파일:** `js/main.js`, `task-history/task.md`.
- **검증:** 사용자의 요청에 따라 테스트는 실행하지 않았다.

## 검색 오버레이 및 하단 상품/푸터 영역

- **요청:** 헤더 돋보기로 전체 화면 검색 레이어를 열고, 입력/닫기 상단 줄은 고정하며 아래 내용은 스크롤 가능하게 한다. 검색 동작 없이 화면에 제시된 최근 검색어 상태만 보이고, 상품 카드 및 하단 정보를 포함한다.
- **구현:** 이미지 자산이 없어 돋보기와 닫기 아이콘은 CSS로 구성했다. 헤더 검색 버튼으로 전체 뷰포트를 덮는 fixed 대화상자를 열고, 상단 입력 줄은 스크롤 영역과 분리했다. 닫기 버튼과 Escape로 닫으며, 검색 폼 submit은 막아 실제 검색을 수행하지 않는다. 최근 검색어는 시안 그대로 “최근 검색어가 없습니다”만 표시한다.
- **상품/푸터:** `images/img-dt/img_14_item-1.png`~`img_21_item-8.png` 상품 이미지와 아이콘 파일 `img_22_icon-blog.png`~`img_24_icon-instagram.png`를 사용한다. 상품 소개 블록은 그리드로, HARO 브랜드 소개/메일/소셜 아이콘/저작권은 오버레이 하단에 배치해 스크롤되게 했다. 확인되지 않은 상품 구매 및 소셜 URL은 만들지 않았다.
- **변경 파일:** `index.html`, `css/base.css`, `css/layout.css`, `css/components.css`, `js/main.js`, `task-history/task.md`.
- **검증:** 사용자 요청에 따라 자동화/브라우저 테스트는 실행하지 않았다.

## EMOTICON 섹션 디자인 및 반응형 정밀 조정

- **요청:** 첨부된 3장의 디자인 이미지(`emo--dt.png`, `emo-tab.png`, `emo-mob.png`)를 분석하여 데스크톱, 태블릿, 모바일 레이아웃과 디자인 디테일을 정밀 조정.
- **구현 및 조정 내용:**
  1. **타이틀 및 소개 문구:** 디자인 시안에 맞추어 `EMOTICON` 타이틀과 하단 구분선(rule)을 배치하고, 소개 문구를 요청 명세에 맞춰 `오늘도 적당히 덤덤한 하로\n네이버 OGA에서 만나보세요!`(2줄)로 일치시킴.
  2. **이미지 갤러리:** 데스크톱 및 태블릿(1025px 이상, 769~1024px)에서는 4열 1:1 정사각형 비율 유지, 모바일(768px 이하)에서는 `2열 × 2행` 그리드로 전환(`grid-template-columns: repeat(2, minmax(0, 1fr))`, `gap: 8px`). `alt` 텍스트를 요청 순서 및 명칭에 맞춰 정비.
  3. **버튼 간격 및 호버 스타일:** 데스크톱/태블릿에서 두 버튼 간 간격을 디자인 참조에 맞추어 `16px`로 조정하고, 호버 시 부드러운 `#f7f3eb` 배경 변화 및 키보드 포커스 스타일(`:focus-visible`)을 적용.
  4. **스크롤 리빌 인터랙션:** `data-reveal` 속성을 타이틀, 갤러리, 문구, 버튼 영역에 적용하여 Progressive Enhancement 기반 등장 인터랙션 연결.
- **변경 파일:** `index.html`, `css/layout.css`, `css/components.css`, `task-history/task.md`.

## 004: STORY 섹션 임시 구현 및 다음 섹션 연결

- **작업일:** 2026-11-04
- **요청:** 제공된 데스크톱/태블릿/모바일 시안을 기준으로 STORY 소개와 2×2 컬러 플레이스홀더를 구현한다. Instagram 계정을 연결하고, API·랜덤 이미지 기능은 이번 범위에서 제외한다.
- **완료 상태:** STORY 섹션과 반응형 배치 구현 완료. 이후 005 GOODS 섹션을 추가할 수 있도록 STORY를 `main` 마지막 섹션으로 두었다.
- **구현:** 내비게이션 STORY 항목을 `#story`에 연결하고, EMOTICON 다음에 독립적인 `story` 섹션을 추가했다. 데스크톱은 좌측 소개/우측 2×2 컬러 타일, 1024px 이하 태블릿은 가로 배치를 유지하며, 768px 이하에서는 소개 아래에 타일 그리드를 배치한다. 4개 슬롯은 개별 클래스와 `data-story-slot` 식별자를 가지며 현재 색상 플레이스홀더로 남겼다. Instagram 버튼은 요청된 계정으로 새 탭 연결했다. API 및 이미지 로딩 기능은 추가하지 않았다.
- **변경 파일:** `index.html`, `css/sections.css`, `task-history/task.md`.
- **보존 사항:** 기존 섹션의 HTML/CSS/JavaScript와 기존 `curr-task` 프롬프트 파일은 수정하지 않았다. GOODS 섹션은 추가하지 않았다.
- **검증:** 브라우저에서 1440, 1024, 769, 768, 390, 320px 너비를 확인했다. 769px까지 가로 2열, 768px부터 모바일 세로형으로 전환되고, 타일 4개와 Instagram 목적지, 가로 넘침 없음, 소개 콘텐츠의 넘침 없음을 확인했다. `#story` 직접 진입 시 고정 헤더 여백과 제목 표시를 확인했다. HTML/CSS 편집기 진단에서 오류 없음.
- **미구현:** Instagram API, 랜덤 콘텐츠 로딩, 실제 인스타툰 이미지와 GOODS 섹션.

## 005: GOODS 상품 캐러셀

- **작업일:** 2026-11-04
- **요청:** README 및 이전 작업 인계를 확인하고, PRD의 GOODS 섹션 요구사항을 기준으로 다음 작업을 시작한다.
- **완료 상태:** GOODS 섹션의 반응형 시안 반영과 네이티브 가로 스크롤 캐러셀 구현 완료.
- **구현:** GOODS 타이틀과 구분선을 중앙 정렬하고, 좌우 이동 버튼을 트랙 양옆에 배치했다. 상품 이미지에는 원본 비율을 유지하는 `contain`과 회색 배경/테두리를 적용하고, 카드명·규격을 아래 캡션에 표시한다. 데스크톱 및 1024px 이하 태블릿은 4개 카드가 보이며, 768px 이하에서는 한 카드와 다음 카드 일부가 보이는 터치 스크롤 트랙으로 전환한다. 스토어 버튼은 요청된 `https://marpple.shop/kr/mandac`로 연결한다.
- **변경 파일:** `index.html`, `css/sections.css`, `js/main.js`, `task-history/task.md`.
- **검증:** 1920, 1024, 769, 768, 390, 320px 너비에서 카드 노출 수와 가로 넘침을 확인했다. 실제 버튼 클릭으로 데스크톱/모바일 트랙 이동, 끝 위치의 화살표 비활성화, 역방향 이동을 검증했다. 모바일에서 다음 카드 일부 노출, 이미지 원본 비율, Marpple 링크 목적지를 확인했다. HTML/CSS/JavaScript 진단에서 오류 없음.
- **미구현:** 실제 상품 상세 판매 URL은 제공되지 않아 카드별 링크는 추가하지 않았다. 상품 5~8 이미지는 저장소의 플레이스홀더 자산이다.

## 006: FOOTER 반응형 구현

- **작업일:** 2026-11-04
- **완료 상태:** GOODS 바로 다음에 일반 문서 흐름의 FOOTER를 추가하고 반응형 정렬을 적용했다.
- **구현:** 짙은 네이비 배경에 HARO 로고, 브랜드 소개, 이메일, 저작권과 SNS 아이콘을 배치했다. 데스크톱/태블릿은 본문 좌측 정렬, 저작권 좌하단, SNS 우하단 구조이며 모바일은 본문 좌측 정렬을 유지하고 저작권 및 SNS를 아래쪽 중앙으로 정렬한다. 네이버 블로그, Behance, Instagram 링크는 실제 확인된 채널 주소로 새 탭 연결했다.
- **변경 파일:** `index.html`, `css/sections.css`, `task-history/task.md`.
- **검증:** 1920, 1024, 768, 390, 320px에서 FOOTER 배치, 중앙 정렬, 정적 문서 흐름, 가로 넘침 없음을 확인했다. 외부 SNS 링크 3개와 이메일 링크를 확인했으며, 데스크톱·모바일 FOOTER를 시각 점검했다. HTML/CSS 진단에서 오류 없음.

## 상단 메뉴 투명도 및 블러 보정

- **작업일:** 2026-11-04
- **요청:** 메뉴 글씨는 선명하게 유지하면서 뒤의 캐릭터와 이미지가 부드럽게 비치도록 상단 메뉴바를 조정한다.
- **구현:** `.site-header` 배경을 흰색 62% 투명도로 낮추고, 배경에 `blur(14px) saturate(125%)`를 적용했다. 텍스트나 헤더 요소에는 투명도를 적용하지 않았다.
- **변경 파일:** `css/layout.css`, `task-history/task.md`.
- **검증:** 데스크톱 1440px과 모바일 390px에서 배경 알파·블러, 헤더와 메뉴 요소의 불투명도 1, 가로 넘침 없음을 확인했다. 컬러 타일 위에 헤더가 겹치는 브라우저 화면에서 배경 비침과 글자 선명도를 시각 확인했다. CSS 진단 오류 없음.

## 004 후속: STORY Instagram 피드 연동 구조

- **작업일:** 2026-11-04
- **완료 상태:** 기본 테스트 모드, 랜덤 피드 렌더러, Instagram Login 서버리스 API 계약과 설정 문서를 추가했다. 실제 Meta API 실데이터 연결은 인증 및 배포 설정 전까지 미완료다.
- **구현:** 기본 `test` 모드는 기존 네 컬러 플레이스홀더만 새로고침 시 랜덤 순서로 표시하고 API 미연결 상태를 알린다. `api` 모드는 동일 출처 `/api/instagram-posts`만 호출한다. 응답 어댑터는 이미지, 영상 썸네일, 캐러셀 대표 미디어와 실제 Instagram 게시물 permalink를 정규화·검증하고 중복 없는 최대 4개 선택 및 4개 미만 응답을 처리한다. 서버 함수는 Instagram Login 미디어 페이지네이션, 게시물 ID/해시태그 필터, 환경변수 토큰, CDN/프로세스 캐시, 마지막 정상 데이터의 제한된 stale fallback과 명시적 오류 상태를 제공한다. 설정 절차와 호스팅 제약을 `api/README.md`에 기록했다.
- **변경 파일:** `index.html`, `css/sections.css`, `js/story-adapter.js`, `js/story-fixtures.js`, `js/story-feed.js`, `api/instagram-posts.js`, `api/README.md`, `tests/story-adapter.test.js`, `tests/instagram-route.test.js`, `task-history/task.md`.
- **검증:** Node 테스트 9개 통과. 어댑터의 이미지/영상/캐러셀 변환, permalink 검증, 랜덤 중복 방지, 부족한 피드, 서버의 503/405 응답, 서버 헤더 토큰 사용과 캐시 동작을 검사했다. 브라우저에서 1920, 1024, 768, 390px STORY 레이아웃, resize 시 같은 선택 유지, 테스트 모드 상태, API 실패 시 컬러 플레이스홀더 복귀를 확인했다. HTML/CSS/JavaScript 진단 및 Node 구문 검사 오류 없음.
- **미완료:** Instagram 프로 계정/Meta 앱 권한 및 `INSTAGRAM_ACCESS_TOKEN`, API 버전, 게시물 ID 또는 해시태그 설정. 저장소에 배포 설정이 없어 Vercel 호환 `/api/instagram-posts`를 준비했지만 서버리스 호스팅 배포와 실 API 인증은 검증하지 못했다. 현 상태는 GitHub Pages 등 정적 호스팅에서 테스트 모드만 작동한다. `curr-task/004/prompt.txt`는 수정하지 않았다.

## GOODS 캐러셀 화살표 시안 보정

- **작업일:** 2026-11-04
- **구현:** 문자 화살표를 가는 CSS 꺾쇠 아이콘으로 교체하고 원형 테두리를 연한 회색으로 조정했다. 버튼 크기와 캐러셀 이벤트는 유지했다.
- **변경 파일:** `index.html`, `css/sections.css`, `task-history/task.md`.
- **검증:** 브라우저에서 양쪽 화살표 모양과 카드 양옆 배치를 시각 확인했으며 HTML/CSS 진단 오류 없음.

## 004 후속: 로컬 인스타툰 이미지 랜덤 표시

- **작업일:** 2026-11-04
- **완료 상태:** Instagram API 및 서버리스 의존성을 제거하고 `data/story.json` 기반 로컬 이미지 렌더링으로 전환했다.
- **구현:** `images/img-story/story-haro-1.jpg`~`story-haro-38.jpg`를 JSON 데이터로 등록했다. 로딩 시 38개 중 중복 없이 최대 4개를 선택하며, resize에서는 순서를 유지하고 새로고침에서 다시 선택한다. 게시물 URL은 저장소와 타겟 사이트에서 실제 permalink를 찾지 못해 `null`로 두었으며 해당 항목은 링크 없이 표시한다. 실제 Instagram 프로필 버튼과 STORY 반응형은 유지했다. 이미지 원본 비율을 보존하고 로딩 레이아웃을 고정했다.
- **API 정리:** `data-story-source`/API URL 속성과 API 스크립트 연결을 제거했다. STORY 전용 서버리스 함수·API 설정 문서·fixture·API 테스트를 삭제했다. 공통 메인 스크립트와 다른 섹션 기능은 변경하지 않았다.
- **변경 파일:** `index.html`, `css/sections.css`, `js/story-adapter.js`, `js/story-feed.js`, `data/story.json`, `tests/story-adapter.test.js`, `task-history/task.md`; 삭제: `js/story-fixtures.js`, `api/instagram-posts.js`, `api/README.md`, `tests/instagram-route.test.js`.
- **검증:** JSON 38개 항목 파싱 및 이미지 경로 누락 0개. Node 테스트 5개 통과. 로컬 HTTP 브라우저에서 1920, 1024, 768, 390px 레이아웃, 이미지 4개 로드, resize 중 선택 유지, reload 시 새 랜덤 조합, 중복 없음, 가로 넘침 없음 확인. HTML/CSS/JavaScript 진단 오류 없음.
- **남은 내용:** 이미지별 실제 Instagram 게시물 URL이 제공되지 않아 현재 모두 `null`이며 이미지 클릭 링크는 적용되지 않는다. 실제 URL을 `data/story.json`에 추가하면 해당 이미지에만 새 탭 링크가 생성된다. `curr-task/004/prompt.txt`는 수정하지 않았다.

## 004 후속: STORY 레이아웃 리뉴얼

- **작업일:** 2026-11-04
- **요청:** STORY 레이아웃을 좌우 분할/모바일 세로 배치로 정리하면서 기존 사이트의 흰색·검정·회색 톤과 로컬 랜덤 이미지/조건부 Instagram 링크를 유지한다.
- **구현:** STORY 제목·구분선을 컨테이너 왼쪽 상단으로 옮기고 메인 카피를 2줄로 정리했다. 기존 사이트와 어울리도록 흰 배경, 연회색 컨테이너, 검정 타이포, 아웃라인 Instagram 버튼을 사용하고 카드에만 은은한 그림자를 적용했다. 실제 프로젝트 원본 하로 이미지(`images/img-dt/img_5_haro-cat.png`)를 좌측 하단 장식으로 사용했다. 누워 있는 포즈 자산은 없어 서 있는 원본을 사용했으며 모바일에서는 장식을 숨긴다. STORY 외 섹션과 로컬 JSON/랜덤 로더는 변경하지 않았다.
- **변경 파일:** `index.html`, `css/sections.css`, `task-history/task.md`.
- **검증:** 1920, 1024, 768, 390px에서 가로/세로 전환, 정사각형 이미지 4개 로드, 원본 비율 `contain`, 텍스트/캐릭터 겹침 없음, 가로 넘침 없음을 확인했다. HTML/CSS 진단 오류 없음.
- **주의:** 프로젝트의 실제 이미지 경로는 사용자가 언급한 `images/story/`가 아니라 `images/img-story/`다. `data/story.json`의 게시물 URL이 모두 `null`이므로 이미지 카드는 계속 비클릭이며, 실 URL을 등록하면 링크가 활성화된다. 디자인 시안 이미지는 이 요청에 첨부되지 않아 텍스트 명세를 기준으로 구현했다. `curr-task/004/prompt.txt`는 수정하지 않았다.

## 검색 아이콘 이미지 적용

- **작업일:** 2026-11-04
- **구현:** 헤더와 검색 오버레이의 CSS 돋보기 도형을 `images/used/haro-search.png`로 교체했다.
- **변경 파일:** `index.html`, `css/components.css`, `task-history/task.md`.
- **검증:** 양쪽 이미지의 로드와 검색 오버레이 열림을 브라우저에서 확인했으며 HTML/CSS 진단 오류 없음.

## 공통 버튼 검정/흰색 상호작용

- **작업일:** 2026-11-04
- **구현:** 사용 가능한 버튼과 버튼형 링크의 hover, active, focus-visible 상태를 검정 배경/흰색 전경으로 통일했다. 햄버거 선, 닫기 아이콘, 검색 이미지도 상호작용 중 흰색으로 보정했다. disabled 컨트롤은 기본 스타일을 유지한다.
- **변경 파일:** `css/sections.css`, `task-history/task.md`.
- **검증:** 브라우저에서 STORY, 이모티콘, GOODS, 검색 컨트롤의 hover 색과 아이콘 반전을 확인했고 비활성 카카오 버튼은 변경되지 않음을 확인했다. CSS 진단 오류 없음.

## GOODS Swiper implementation

- Date: 2026-11-04
- Scope: GOODS section based on desktop, tablet, and mobile reference screenshots.
- Replaced native scroll carousel with Swiper 12 bundle loaded from jsDelivr, following https://swiperjs.com/get-started.
- Preserved all eight local product images and the existing shop URL. Combined product names and specifications into centered captions.
- Desktop/tablet show four cards; mobile shows one card and part of the next. Navigation uses Swiper boundary disabling, touch gestures, keyboard support, accessibility labels, and reduced-motion handling.
- Adjusted section spacing, square images, borders, caption heights, and outlined shop button for the supplied references.
- Validation: JavaScript syntax check passed; eight slides and all image paths verified; carousel div tags balanced; existing story adapter tests passed (5/5).
- Limitation: browser tooling is unavailable in this session, so visual rendering, touch gestures, and viewport overflow have not been verified in a browser. Swiper requires CDN access.
- Files: index.html, css/sections.css, js/main.js, task-history/task.md. Prompt files unchanged.

## 005. GOODS Swiper requirements and browser verification

- Date: 2026-11-04
- Added a guard against initializing an existing Swiper instance twice.
- Explicitly configured one-card navigation, disabled loop/autoplay/autoHeight, and reduced tablet card spacing at 769-1024px.
- Made cards flex columns with stretching caption areas so all eight cards keep equal heights even when titles wrap.
- Validation in headless Chrome: 1920, 1025, 1024, 769, 768, 578, 390, and 320px widths passed. Desktop/tablet show 4 cards and mobile uses 1.1; all eight card heights match; next arrow click advances one card; first/last arrows disable; document and GOODS do not overflow horizontally. Emulated touch swipe advanced to the next card. JavaScript syntax check passed.
- Existing eight images and shop link retained. No non-GOODS sections or prompt files changed. This browser verification supersedes the previous browser-tooling limitation for GOODS.
- Files changed in this pass: js/main.js, css/sections.css, task-history/task.md.

## GOODS loop and autoplay

- Date: 2026-11-04
- Enabled infinite looping and autoplay with a 4000ms delay per user request. Autoplay continues after arrow clicks and swipes. Loop mode keeps both navigation directions available.
- Validation: node --check js/main.js passed.
- Changed files: js/main.js, task-history/task.md.

## 003. EMOTICON Swiper

- Date: 2026-11-04
- Added images/img-dt/img_10_image-1.png through img_13_image-4.png after the original four images.
- Reused the existing Swiper bundle with a separate guarded EMOTICON instance and independent arrows. Enabled loop, 4000ms autoplay, 600ms animation, one-column navigation, and continued autoplay after interaction.
- Preserved the 1080px gallery limit, responsive square card sizes, desktop/tablet four-column layout, and mobile two-column/two-row layout. Images use contain to preserve their proportions. Navigation buttons overlap the gallery edges to preserve card widths. Existing links are unchanged.
- Chrome validation at 1920/1024/768/390px: eight images, four visible cards, original expected card widths (256.5/230.5/356/167px), square proportions, no horizontal page overflow. Arrow navigation and repeated loop moves worked; 4000ms autoplay advanced, and mobile touch swipe advanced. JavaScript syntax check passed.
- GOODS options and other sections unchanged; prompt files unchanged.
- Changed files: index.html, css/layout.css, js/main.js, task-history/task.md.

## Button click colors

- Date: 2026-11-04
- Extended the shared button and button-link black background/white foreground states to include focus after clicks, matching the GOODS shop button. Updated menu, close, and search icon states consistently. Disabled buttons remain inactive.
- Validation: reviewed shared selectors and icon rules; no JavaScript or layout changes.
- Changed files: css/sections.css, task-history/task.md.

## Consistent text button proportions

- Date: 2026-11-04
- Unified CLICK, EMOTICON actions, Instagram, GOODS shop, and search shop text buttons using the main CLICK dimensions: 48px height, 136px minimum width, 16px bold text, 24px horizontal padding, 1.5px rounded borders. Mobile uses 46px height, 132px minimum width, and 20px horizontal padding. Width expands to fit labels.
- Icon controls retain their circular geometry. Existing action colors and section margins remain.
- Validation: checked shared rule specificity against section and mobile overrides.
- Changed files: css/sections.css, task-history/task.md.

## GOODS shop button centering fix

- Date: 2026-11-04
- Restored the GOODS shop action to a block-level flex container with fit-content width and automatic inline margins. The shared inline-flex button rule had removed its automatic centering. Unified button dimensions remain in effect.
- Validation: confirmed the centering override follows the shared button rule and applies at all viewport widths.
- Changed files: css/sections.css, task-history/task.md.

## Desktop section spacing aligned to reference

- Date: 2026-11-04
- Inspected https://www.mandaco.co.kr/ in Chrome at 1920px: content sections use 80px vertical padding and 114px top margins; footer uses 80px top and 40px bottom padding.
- Applied those spacing values above 1024px to ABOUT, EMOTICON, STORY, GOODS, and footer. Set heading-to-gallery spacing to 80px, EMOTICON description spacing to 80px and actions to 44px, and GOODS shop spacing to 80px. Removed desktop ABOUT minimum height to avoid extra blank space beyond its padding. Existing section layouts, image/button sizes, and slider settings retained.
- Validation: Chrome confirmed measured desktop section padding/margins at 1920px. At 1025px desktop spacing applies; at 1024px and 390px existing responsive padding remains. No page horizontal overflow at those boundary widths.
- Changed files: css/sections.css, task-history/task.md. Prompt files unchanged.

## STORY consistent image boxes across viewports

- Date: 2026-11-04
- Removed mobile-only 8px image-box padding and 18px corner override. All viewports now share desktop zero padding, 22px corners, square boxes, full-size images, and object-fit: contain. Existing tablet/mobile section layouts and grid spacing remain responsive.
- Validation: checked all STORY image selectors; no breakpoint overrides remain for tile padding/corners or image sizing.
- Changed files: css/sections.css, task-history/task.md.

## HTTP preview for STORY images

- Date: 2026-11-04
- Added scripts/preview.cjs (Node built-in static HTTP server bound to 127.0.0.1:8080) and preview.cmd launcher. Documented usage in README.md. No dependencies or site design changes.
- Started local HTTP preview and opened http://127.0.0.1:8080/#story in the external browser.
- Validation: JSON and all 38 registered STORY images return HTTP 200. Chrome confirmed four randomly selected images rendered and loaded successfully.
- spec-kit/AGENTS.md is absent; followed the available HARO specification and current implementation.

## Desktop section padding adjustment

- Date: 2026-11-04
- Changed ABOUT, EMOTICON, STORY, and GOODS desktop vertical padding from 80px to 60px at widths of 1025px and above. Existing 114px inter-section margins, internal content gaps, footer padding, and tablet/mobile spacing retained.
- Validation: reviewed desktop shared spacing rule.
- Changed files: css/sections.css, task-history/task.md.

## Desktop title font sizes

- Date: 2026-11-04
- Unified ABOUT, EMOTICON, and GOODS desktop title sizes to the existing ABOUT value: clamp(30px, 3vw, 36px), scoped to widths >=1025px. Existing weights, spacing, and tablet/mobile title sizes retained.
- Validation: checked shared desktop rule matches ABOUT sizing and follows base title declarations.
- Changed files: css/sections.css, task-history/task.md.

## Desktop title underline spacing

- Date: 2026-11-04
- Matched ABOUT, EMOTICON, and GOODS desktop title-to-rule margins to the ABOUT reference: 24px. Scoped to >=1025px, overriding the intermediate GOODS 38px rule as well. Existing underline widths and tablet/mobile spacing retained.
- Validation: checked cascade and desktop breakpoint scope.
- Changed files: css/sections.css, task-history/task.md.

## Shared responsive title and underline spacing

- Date: 2026-11-04
- Extended ABOUT, EMOTICON, and GOODS title sizing (clamp(30px, 3vw, 36px)) and 24px underline top margins to all viewport widths. Moved shared rules outside the desktop media query, after existing responsive rules. Desktop section padding remains scoped to desktop.
- Validation: reviewed cascade; shared declarations override earlier tablet/mobile title sizes and rule margins.
- Changed files: css/sections.css, task-history/task.md.

## 006. FOOTER white SNS icons and right alignment

- Date: 2026-11-04
- Replaced footer-only colored PNG references with transparent white SVG blog, Behance, and Instagram icons. Preserved original links, accessible labels, footer background, copy, email, and copyright.
- Standardized artwork to 28px, touch targets to 44x44px, and icon gaps to 20px. Added smooth hover/focus opacity. Mobile icons align to the right content edge below the centered copyright. Desktop/tablet keep their bottom-right alignment.
- Chrome checks at 1920, 1024, 768, and 390px passed: all three SVG assets load, right edges align, mobile copyright remains centered with SNS below, targets measure 44x44px, and no page horizontal overflow.
- Changed files: index.html (footer only), css/sections.css (footer only), images/icons/*-white.svg, task-history/task.md. Other sections and prompt files unchanged.

## Footer copyright alignment

- Date: 2026-11-04
- Explicitly set copyright text left alignment for desktop/tablet and centered self/text alignment at <=768px. SNS right alignment retained.
- Validation: checked breakpoint scope against existing row/column footer layout.
- Changed files: css/sections.css, task-history/task.md.

## Footer copyright tablet/mobile boundary correction

- Date: 2026-11-04
- Changed footer copyright alignment boundary to match the supplied approximately 700px tablet screenshot: left alignment above 600px, centered alignment at 600px and below. Within the existing <=768px column layout, tablet copyright now aligns to the left content edge. SNS retains right alignment. Other responsive breakpoints unchanged.
- Validation: reviewed 601-768px cascade and <=600px center override.
- Changed files: css/sections.css, task-history/task.md.

## 001. HERO box responsive size and position

- Date: 2026-11-05
- Changed files: css/layout.css, task-history/task.md. HTML, JavaScript, image assets, other sections, and prompt.txt unchanged.
- Desktop: replaced clamp(180px, 16vw, 250px) with a shared --hero-box-width: clamp(185px, 18.75vw, 262.5px). Maximum width increases exactly 5%. Kept the 61% top anchor and existing PNG image transform/aspect ratio. Minimum HERO height now also accounts for the lowest painted animation frame on short desktop screens.
- Tablet: removed the conflicting top:auto / bottom:7% / clamp(100px, 11vw, 150px) override. Inherits the desktop top anchor and fluid width, eliminating the 1025/1024 position discontinuity. Controls remain on the right with a minimum 175px offset from center to clear the opened artwork; tablet control gap remains 14px.
- Mobile: replaced clamp(90px, 20vw, 112px) and bottom:19% with clamp(140px, 45vw, 185px) and top:max(61%, calc(38% + 126px + var(--hero-box-width) * 0.55)). Controls are centered at 38%, title at 20%, and HERO minimum height is 720px, reserving space for the revealed scroll hint and all animation frames. The image frame is deliberately allowed to extend beyond its box container, as before.
- Duplicate/conflicting breakpoint declarations were removed from their original rules, rather than adding later override media queries. Removed tablet bottom positioning and box width rule, redundant mobile left positioning, and mobile bottom/width overrides. Desktop First max-width:1024px and max-width:768px structure retained.
- Width calculations (container CSS pixels): 1920=262.5; 1025=192.1875; 1024=192; 963=185; 768=185; 639=185; 390=175.5. At 769/768 both widths are 185px. The 1025/1024 top remains 61% of the same HERO height.
- Static validation: all 12 source frames are 1024x1024; alpha bounds scanned at alpha>16. Last frame has the highest artwork (y=216), while frame 001 has the lowest artwork (y=772). Existing width:300%, top:86%, translate(-50%,-59.3%) produce an artwork envelope approximately -0.533 to +1.100 box widths from the anchor. At the minimum 720px mobile HERO height and maximum 185px width, the opened top is about 403px, the lowest frame bottom about 706px, and the control/hint area has a reserved 16px gap. Frame geometry is independent of the image source and state classes; animation filenames, order, speed, and click handling were not changed.
- Browser validation: attempted Edge checks at all seven requested widths. Node execution was blocked by sandbox EPERM; the required escalation request was rejected by the user. Consequently actual browser screenshots, click playback, font-dependent text overlap, and page-wide horizontal overflow are NOT verified. Width/position results above are static CSS/image calculations, not browser test results. Temporary browser-check script removed.