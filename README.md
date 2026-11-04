# 쫄깃로또 🎱

> "추천"이 아니라 **"내 로또 생활을 재미있게 관리"** 하는 개인화 로또 관리 PWA.
> 웹(PWA)으로 먼저 만들고, 나중에 Flutter WebView 로 감싸 앱스토어에 배포합니다.

**본 앱은 통계 참고 도구이며 당첨을 보장하지 않습니다.**
모든 번호 조합의 1등 확률은 **1/8,145,060** 으로 동일합니다. 앱 어디에도 "당첨 확률 n%" 같은 문구를 쓰지 않습니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, PWA (`public/manifest.json`, `public/sw.js`) |
| 상태관리 | Zustand |
| 인증 | Supabase Auth — **Google 로그인만** |
| DB | Supabase Postgres (RLS) |

## 빠른 시작 (데모 모드)

Supabase 설정 없이도 바로 실행됩니다. `.env.local` 이 없으면 **데모 모드**로 동작하며,
로그인 없이 브라우저 localStorage 에 저장되는 샘플 데이터(가상의 당첨번호·판매점)를 사용합니다.

```bash
npm install
```

```bash
npm run dev
```

http://localhost:3000 → "데모로 둘러보기"

## Supabase 연결

### 1) 로컬 개발 (Supabase CLI + Docker)

```bash
cp .env.example .env
```

`.env` 에 Google OAuth 클라이언트 ID/secret 을 넣습니다 (`supabase/config.toml` 이 `env()` 로 읽음).

```bash
npx supabase start
```

```bash
npx supabase db reset
```

`supabase start` 가 출력하는 API URL 과 Publishable(anon) key 를 `.env.local` 에 넣습니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 2) 호스팅 프로젝트

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

Dashboard → Authentication → Sign In / Providers 에서 **Google 만** 켜고 이메일 가입은 끕니다.
Authentication → URL Configuration 의 Redirect URLs 에 `https://<도메인>/auth/callback` 을 추가합니다.

### Google OAuth 설정

1. Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID (웹 애플리케이션)
2. 승인된 리디렉션 URI
   - 로컬: `http://127.0.0.1:54321/auth/v1/callback`
   - 호스팅: `https://<project-ref>.supabase.co/auth/v1/callback`
3. 발급된 ID/secret 을 로컬은 `.env`, 호스팅은 Dashboard 의 Google provider 에 입력

로그인 흐름: `/login` → Google → `/auth/callback` (세션 교환) → 생년월일이 없으면 `/onboarding` → `/`.
만 19세 미만은 온보딩에서 이용이 제한됩니다 (복권 및 복권기금법).

## DB 스키마

`supabase/migrations/20261104000100_init_schema.sql`

| 테이블 | 설명 |
| --- | --- |
| `users` | auth.users 와 1:1. 가입 시 트리거로 자동 생성. `birth_date` 는 생일수 계산용 |
| `tickets` | 내가 산 로또. `games jsonb` (예: `[[7,12,19,28,33,42], ...]`), `profit` 은 생성 컬럼 |
| `winning_draws` | 회차별 당첨번호·보너스·1등 배출점 코드 |
| `stores` | 판매점(명당) DB |
| `dream_map` | 꿈 키워드 → 행운수 2개 (예: 돼지 → 12, 26) |

요구 스키마에서 바꾸거나 더한 부분과 이유:

- `tickets.win_amount`, `tickets.profit` 은 `int` 대신 **`bigint`** — 1등 당첨금이 int4 최대값(약 21억)을 넘는 회차가 있습니다.
- `tickets.qr_raw` — "QR 텍스트만 저장" 원칙에 따라 QR 원문을 저장하고, `(user_id, qr_raw)` 유니크 인덱스로 같은 티켓 중복 등록을 막습니다. **사진 원본은 어디에도 저장하지 않습니다.**
- `tickets.opened_at` — 쫄깃 오픈 여부(기기 간 동기화).
- `winning_draws.second_store_codes`, `winning_draws.prize_amounts` — 단골점 2등 알림과 당첨금 자동 계산용.
- `tickets.amount` 는 비워서 넣으면 트리거가 `게임 수 x 1,000원` 으로 채웁니다.
- 각 게임은 1~45 의 서로 다른 정수 6개, 티켓당 1~5게임만 허용(CHECK 제약).

### 보안 (RLS / 권한)

- `users`, `tickets` 는 본인 행만 조회·수정 가능. `win_amount` 는 사용자가 직접 수정할 수 없습니다(컬럼 단위 GRANT).
- `winning_draws`, `stores`, `dream_map` 은 누구나 읽기 전용, 쓰기는 `service_role`(Edge Function) 만.
- 2026-10-30 부터 Supabase 는 새 테이블을 Data API 역할에 자동 노출하지 않으므로, 마이그레이션에서 필요한 권한만 명시적으로 GRANT 합니다.

## 프로젝트 구조

```
src/
  app/
    (auth)/login, (auth)/onboarding   로그인 · 생년월일 온보딩 (하단 탭 없음)
    (main)/                           홈 · logs · map · stats · settings (AppShell + 하단 탭)
    auth/callback/route.ts            OAuth 코드 → 세션 교환
    offline/                          서비스 워커 오프라인 페이지
  components/                         UI 컴포넌트
  lib/
    lotto/                            회차 계산 · 당첨 등수 · 생일수 등 순수 함수
    repo/                             데이터 접근 계층 (Supabase 구현 / 데모 구현)
    supabase/                         브라우저 · 서버 · 미들웨어 클라이언트
    nativeBridge.ts                   Flutter WebView 브리지
  store/useAppStore.ts                Zustand 스토어
  middleware.ts                       세션 갱신 + 비로그인 리다이렉트
supabase/
  config.toml                         Google 로그인만 활성화, Storage 비활성화
  migrations/                         스키마
  seed.sql                            로컬 전용 샘플 판매점
public/
  manifest.json, sw.js, icons/        PWA
```

## Flutter WebView 래핑 메모

- Google 은 WebView 안 OAuth 를 막습니다. 앱에서는 `ZzolgitNative` JavaScriptChannel 로 `google-sign-in` 요청을 받아
  네이티브 Google 로그인 후 `google-id-token` 이벤트로 ID 토큰을 돌려주면, 웹이 `signInWithIdToken` 으로 세션을 만듭니다
  (`src/lib/nativeBridge.ts`).
- 웹은 `env(safe-area-inset-*)` 를 사용하므로 WebView 를 edge-to-edge 로 띄워도 됩니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` / `npm run typecheck` | ESLint / 타입 검사 |
| `npm test` | 단위 테스트 (Vitest) |
| `node scripts/render-icons.mjs` | `public/icon.svg` → PWA PNG 아이콘 재생성 (Playwright) |

## 알려진 사항

- **Next.js 14 는 지원이 끝난 버전**이며, 14.2.35 에는 15.x/16.x 에서만 고쳐진 보안 권고가 남아 있습니다.
  요구 스택(Next 14)을 지키되 노출면을 줄이기 위해 이미지 최적화 API 를 끄고(`images.unoptimized`), Server Actions·rewrites 를 쓰지 않습니다.
  운영 배포 전 Next 16 업그레이드를 권장합니다 (데이터 접근이 클라이언트 + Supabase 중심이라 이전 부담이 작습니다).
