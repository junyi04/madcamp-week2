# 🌌 GitHubble
**개발자의 GitHub 활동을 3D 우주 공간으로 시각화하는 인터랙티브 웹 서비스**

GitHubble은 개발자의 “레포 활동을 3D 우주 공간으로 시각화”한 서비스입니다.  
각 레포지토리는 하나의 은하, 커밋/PR은 그 안에서 빛나는 별이 됩니다.  
나만의 우주를 만들어나가고 친구들의 우주를 방문하며, 개발 활동의 결과를 직관적이고 재미있게 확인할 수 있습니다.

## 🧩 기획 배경
GitHub는 현대 개발자에게 필수적인 도구입니다.  
코드 저장, 버전 관리, 협업까지 개발의 모든 과정이 깃허브에서 이뤄집니다.

그래서 저희는 GitHub 활동을 시각화하여 변화를 쉽게 추적할 수 있도록 만들고자 했습니다.  
레포/커밋을 우주로 표현해 한눈에 보고 탐험하는 경험을 제공합니다.

---

## 🎯 타겟 사용자
- 레포 활동을 한눈에 보고 싶은 개발자
- 커밋 습관/작업 흐름을 시각적으로 확인하고 싶은 분
- 친구/동료의 활동을 가볍게 둘러보고 싶은 사용자

---

## ⭐ 핵심 기능

### 1) 온보딩
- GitHubble 소개 페이지 제공
- 로그인 전 서비스 컨셉/사용 흐름 안내

### 2) 메인 우주 화면 (Repo = Galaxy)
- 로그인 후 애니메이션 효과와 함께 3D 우주 진입
- 우주의 은하 하나 = 사용자 레포 하나
- 은하 크기: 레포 커밋 개수에 비례
- 은하 Hover 시 레포 이름 표시
- 사용자마다 은하 배치가 다르게 생성되어 나만의 우주 느낌 강화

### 3) 개별 은하 화면 (Commit/PR = Star)
- 사이드바에서 레포 선택 시 해당 은하로 클로즈업 전환
- 선택 레포의 main 브랜치 기준 최신 커밋 50개 조회
- 커밋/PR은 은하의 별로 표현되고, 커밋 용어(feat/fix/docs 등)에 따라 색상이 다름

### 4) 커밋 비율 모달 (Commit Stats)
- 상단 Commit Stats 버튼 클릭 시 모달 표시
- 선택 레포의 타입별 커밋 비율/개수를 시각화
- 커밋 상태를 빠르게 파악 가능

### 5) 사이드바
- **레포 목록 패널**
  - 전체 레포 수 / 친구 수 표시
  - 레포 클릭 시 해당 은하로 전환 + 커밋 기록 확인
- **친구 패널**
  - GitHubble 이용 사용자에 한해 GitHub ID로 친구 추가
  - 친구 요청 수락/거절
  - 친구가 되면 친구의 우주 열람 가능

### 6) 커밋 가이드 (Guide)
- 상단 Guide 버튼 클릭 시 커밋 용어 가이드 표시
- feat/fix/docs 등 용어를 색상 + 사용 상황으로 정리
- 커밋 메시지 작성에 익숙해지도록 도움

---

## 🧱 기술 스택

| 구분 | 기술 / 라이브러리 | 비고 |
| --- | --- | --- |
| Frontend | **React + TypeScript + Vite** | 타입 안정성, 빠른 개발 |
| 3D Rendering | **Three.js** | WebGL 기반 3D 렌더링 |
| UI / Styling | **Tailwind CSS** | 반응형 & 빠른 스타일링 |
| Backend | **NestJS** | 구조화된 서버 개발 |
| Database | **PostgreSQL** | 관계형 DB |
| ORM | **Prisma** | 타입 안전 DB 클라이언트 |
| Infra / Hosting | **KCLOUD** | 클라우드 호스팅 |
| External API | **GitHub REST API v3** | 인증/레포/커밋 데이터 |

---

## 🏗️ 아키텍처 개요
- **Frontend**: GitHub OAuth 로그인 → 3D 우주 렌더링(Three.js) → 레포/커밋 데이터 시각화
- **Backend**: GitHub OAuth 토큰 처리 및 API 프록시/캐싱, 친구 시스템(요청/수락/거절), 사용자/레포 관련 데이터 관리
- **DB**: 사용자, 친구 관계, 레포 메타, 커밋 통계 등 저장

---

## 🚀 실행 방법 (로컬)


### 1) Frontend
```bash
cd frontend
npm install
npm run dev

.env
VITE_API_BASE_URL=http://localhost:3000
VITE_GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
VITE_GITHUB_REDIRECT_URI=http://localhost:5173
```

### 2) Backend
```bash
cd backend
npm install
npm start run:dev

.env
DATABASE_URL="postgresql://madcamp:madcamp@localhost:5432/madcamp?schema=public"
JWT_SECRET=YOUR_JWT_SECRET
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET
