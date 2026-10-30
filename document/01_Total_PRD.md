# [문서 01] 전체 제품 요구사항 정의서 (Total PRD) - HARO 프로젝트

## 1. 프로젝트 개요
- **프로젝트 명**: HARO — 오늘도 적당히 덤덤한 고양이 웹사이트 리디자인 및 구현
- **타겟 URL**: https://www.mandaco.co.kr/[cite: 1]
- **브랜드 정체성**: 바쁘고 지친 일상 속에서 과도하게 애쓰지 않고 자기만의 속도로 살아가는 무덤덤한 고양이 '하로'를 중심으로 한 브랜딩, 이모티콘, 스토리, 굿즈 안내 플랫폼.

## 2. 정보 구조(IA) 및 네비게이션
- **상단 고정 네비게이션 (`header.nav`)**:
  - 로고 (`HARO`): 클릭 시 상단(#top)으로 스무스 스크롤 이동[cite: 1]
  - GNB 메뉴: 
    - `ABOUT HARO` (`#about`)[cite: 1]
    - `EMOTICON` (`#emoticon`)[cite: 1]
    - `STORY` (`#story`)[cite: 1]
    - `GOODS` (`#goods`)[cite: 1]
  - 모바일 햄버거 메뉴 토글 (`.nav__toggle`) 지원[cite: 6]

## 3. 핵심 섹션별 기능 요구사항 (Functional Requirements)
- **FR-01 (Hero 섹션)**: 
  - 방 안 배경 (`room-bg.png`) 위에 그라데이션 오버레이 적용[cite: 1, 10]
  - 12개 프레임으로 구성된 플립북 애니메이션 박스 인터랙션 (`box-interaction`) 탑재 (사용자가 클릭하거나 상호작용하여 하로가 등장하는 연출)[cite: 5]
- **FR-02 (About 섹션)**: 
  - 4개의 개별 회전 각도를 가진 발자국 데코레이션(`about__paws`)이 스크롤에 맞춰 순차 페이드인[cite: 1, 10]
  - 캐릭터 일러스트레이션과 공감형 카피라이트 배치[cite: 1]
- **FR-03 (Emoticon 섹션)**: 
  - 4열 타일 그리드 구조의 이모티콘 스티커 갤러리[cite: 1, 10]
  - 네이버 OGQ 및 카카오 이모티콘 링크 연결 (`.btn-pill`)[cite: 1, 6]
- **FR-04 (Story 섹션)**: 
  - 인스타툰을 보여주는 2x2 사진 그리드 카드 (`.story__photo-grid`)와 인스타그램 링크 연동[cite: 1, 10]
- **FR-05 (Goods 섹션)**: 
  - 가로 스크롤 네이티브 지원 및 화살표 버튼(`.goods__arrow`)을 통한 카드 단위 탐색 캐러셀[cite: 1, 10]
  - 마플샵(Marpple) 굿즈 샵 링크 연결[cite: 1, 10]
- **FR-06 (Footer)**: 
  - 브랜드 메시지, 공식 이메일 (`harodrowing@gmail.com`), 소셜 아이콘(블로그, 비핸스, 인스타그램) 연동[cite: 1, 10]