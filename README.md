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
| QR / OCR | 브라우저 `BarcodeDetector` → 미지원 시 `jsQR`, `Tesseract.js` (판매점 코드). 모두 기기 안에서 실행 |

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

## 티켓 사진 등록 (QR + OCR)

`src/components/scan/TicketScanner.tsx` · `src/lib/scan/*`

1. 사진 1장 선택(촬영/앨범) → 브라우저 캔버스로 디코딩 (긴 변 2000px 이하로 축소, EXIF 회전 반영)
2. **상단 40%** 에서 QR 디텍트 — `BarcodeDetector`(Android Chrome, Safari 17+) → 미지원·실패 시 `jsQR` 로 여러 해상도 재시도 → 그래도 없으면 사진 전체
3. QR 원문(`...?v=1248q031219283342...`)을 파싱해 회차·게임 번호 추출 (`src/lib/lotto/qr.ts`)
4. **하단 30%** 를 확대·이진화한 뒤 `Tesseract.js` OCR → 숫자 7자리 판매점 코드 추출 (`src/lib/scan/storeCode.ts`, O→0·l→1 같은 OCR 혼동 보정)
5. QR + 판매점 코드 성공 → `tickets` 자동 insert (`amount = 게임 수 x 1,000원`, 명당 DB 에 있으면 판매점 이름 자동 채움)
6. 실패 시 수동 입력 fallback — QR 실패면 번호 직접 입력(로또 용지 같은 7칸 번호판), 판매점 코드만 실패면 번호는 채워진 채로 코드만 입력

- **사진 원본은 서버로 보내거나 저장하지 않습니다.** DB 에는 QR 텍스트(`qr_raw`)와 판매점 코드만 들어갑니다. 같은 QR 은 다시 등록되지 않습니다.
- Tesseract 워커·WASM 엔진·영문 데이터는 `npm install` 시 `public/tesseract/` 로 복사되어 자체 호스팅됩니다 (CDN 불필요 → PWA/WebView 에서도 동작).
- QR 에는 발행일시가 없어서, 지난 회차 티켓은 OCR 텍스트에 발행일시가 보이면 그 값을, 없으면 추첨일 정오로 구매 시각을 추정합니다.
- 판매점 코드는 요구사항대로 **숫자 7자리**로 가정했습니다. 실제 티켓 인쇄 형식이 다르면 `STORE_CODE_LENGTH` 와 스캔 구간(`scanTicket.ts`)만 바꾸면 됩니다.

## 개인화 추천 · 품질 평가 (순수 함수)

`src/lib/lotto/recommend.ts` · `src/lib/lotto/quality.ts` — 브라우저(Web Worker)와 테스트에서 같은 코드가 돌아갑니다.

**추천** (`recommend()`, 홈 "오늘의 쫄깃 번호")

1. 100만 개 조합을 무작위 생성 (`crypto.getRandomValues` 기반, Web Worker 에서 실행 → 화면 멈춤 없음)
2. 필터: 연속 3개 이상 · 한 구간(1~10/11~20/21~30/31~40/41~45) 4개 이상 · 합계 90~200 밖 · 홀짝 6:0/0:6 제외
3. 생일수 `(년+월+일) % 45 + 1` 강제 포함
4. 꿈 내용에 `dream_map` 키워드가 있으면(가장 긴 키워드 우선) 행운수 2개 중 1개 이상 강제 포함
5. 서로 3개 넘게 겹치지 않는 5게임 + 게임마다 이유 태그 3개 (예: `생일수 36 포함`, `돼지꿈 행운수 12`, `합계 146 균형`)

**품질 점수** (`evaluateQuality()`, 0~100 가중평균 — "당첨 확률"이 아님)

| 항목 | 비중 | 기준 |
| --- | --- | --- |
| 밸런스 | 40% | 홀짝 3:3 만점, 합계 140~170 만점 (벗어난 만큼 감점) |
| 희소성 | 40% | 모두 1~31(생일 조합)·1~12 이면 감점, 연속 번호·등차수열·같은 배수·같은 끝수·용지 한 줄 모양 같은 인기 패턴 감점 |
| 중복회피 | 20% | 최근 20회 1등 번호와 3개 이상 겹치면 감점 |

AI 코멘트는 감점 요인을 바탕으로 한 규칙 기반 문장입니다 (LLM 미사용 → 확률을 암시하는 문장이 생성될 위험이 없음).
점수가 85 이상이면 "1등 확률은 모든 조합이 1/8,145,060으로 같다"는 안내를 함께 붙입니다.

**법적 문구 가드**: `tests/compliance.test.ts` 가 `src/` 전체에서 "당첨 확률", "확률 n%", "적중률", "당첨 보장" 같은 표현을 찾아 테스트를 실패시킵니다.

## 티켓 로그 — 쫄깃 오픈 + 당첨번호 클릭 매칭 (`/logs`)

`src/app/(main)/logs/LogsView.tsx` · `src/components/logs/*` · 규칙은 `src/lib/lotto/reveal.ts` (순수 함수 + 테스트)

- 추첨이 끝난 티켓은 처음에 `? ? ? ? ? ?` 로 가려져 있고, 하단 고정 바에서 두 가지 모드로 엽니다.
  - **[한번에 짠!]** — 가려진 공이 전부 두근두근 흔들린 뒤 순서대로 뒤집히고, 당첨이면 컨페티
  - **[한줄씩 쫄깃 오픈]** — 누를 때마다 한 줄씩, 공을 하나씩 공개. 이미 2개가 맞았으면 다음 공은 흔들리며 뜸을 들입니다
- 상단에 회차 당첨번호 6개 + 보너스를 크게 표시. **공을 누르면** 내 티켓의 같은 번호가 Glow + scale 1.2 + 금색 테두리로 빛납니다 (Framer Motion)
  - 1개 선택: 그 숫자가 들어간 공이 전부 빛남
  - 2개 이상 선택: 선택한 번호를 **모두** 가진 게임만 빛나고 나머지 줄은 흐려짐
  - 6개 모두 선택: **결과 하이라이트** — 맞은 공이 전부 빛나고 등수·당첨금 배지, 회차 요약(구매/당첨금/손익), 당첨이면 컨페티
  - 가려진 티켓도 누른 번호와 같은 공은 살짝 뒤집혀 보입니다 (번호 하나씩 맞춰보는 재미)
- 모두 열린 티켓은 `tickets.opened_at` 에 저장되어 다른 기기에서도 열린 상태로 보입니다. 미개봉 티켓 수는 하단 탭 배지로 표시
- 추첨 전 회차는 카운트다운과 함께 가려진 상태로 보이고, 눈 아이콘으로 번호를 미리 볼 수 있습니다
- `prefers-reduced-motion` 이면 흔들림·컨페티 없이 즉시 공개, 지원 기기에서는 진동 피드백

## 자동 가계부 (`/stats`)

티켓만 등록하면 자동으로 집계됩니다. 집계 쿼리는 `get_ledger_stats()` RPC (security invoker → RLS 로 본인 티켓만) 이고,
데모 모드에서는 같은 규칙의 TS 구현(`src/lib/ledger.ts`)을 씁니다. 두 구현은 Postgres 16 에서 무작위 티켓 300장으로 결과가 완전히 같은지 확인했습니다.

- 지표: 총 구매액 · 총 당첨액 · 손익 · ROI · 주 평균 구매액(첫 구매부터 지금까지) · 구매 주기(구매한 날 사이 평균 간격)
- 월별 구매·당첨 묶은 막대 차트 (최근 6개월), 요일 x 시간대 히트맵 — 모든 차트에 툴팁(키보드 포커스 포함)과 "표로 보기" 제공
- 월 예산 슬라이더 → 이번 달 구매액이 **80%** 를 넘으면 앱 내 토스트 + 휴대폰 알림(권한 허용 시), 100% 초과 시 한 번 더 (월 1회씩)
- 구매 내역 표: 날짜 · 회차 · 구매점 · 구매액 · 당첨액 · 손익, [당첨만] 필터
- 차트 색은 dataviz 기본 팔레트를 다크 표면(`#14172E`) 기준으로 검증한 값입니다 (`src/app/globals.css` 의 `--viz-*`)

### 당첨금 자동 정산

- `tickets` insert/update 트리거: 이미 추첨된 회차의 티켓은 등록 즉시 `win_amount` 계산 (추첨 후에 등록하는 경우가 많음)
- `settle_round(round)`: 크롤러가 당첨번호를 저장한 뒤 그 회차 티켓 전체를 재정산 (service_role 전용)
- 4·5등은 고정(5만/5천원), 1~3등은 `winning_draws.prize_amounts` 의 회차별 1게임 당첨금

## 토요일 크롤링 (Edge Function `crawl-draw`)

`supabase/functions/crawl-draw` — 동행복권에서 당첨번호(JSON), 등위별 당첨금 표, 1·2등 배출점을 가져와
`winning_draws` 저장 → `settle_round` 로 `tickets.win_amount` 갱신 → `stores` 의 1·2등 배출 횟수·명당(`is_hot`: 1등 2회↑ 또는 2등 5회↑) 갱신.
새 판매점 주소는 카카오 로컬 API 로 좌표를 붙입니다.

`supabase/migrations/20261104000300_schedule_crawl.sql` 의 pg_cron 잡이 **토요일 20:35 KST 부터 10분 간격**으로 호출하고
(발표 지연 대비 자정까지), 일요일 오전에 한 번 더 당첨금·배출점을 보충합니다. 이미 저장된 회차는 건너뜁니다.

설정 (값은 git 에 넣지 마세요):

```bash
npx supabase functions deploy crawl-draw --no-verify-jwt
```

```bash
npx supabase secrets set CRON_SECRET=<긴 임의 문자열> KAKAO_REST_API_KEY=<카카오 REST API 키>
```

SQL Editor 에서 pg_cron 이 쓸 값을 Vault 에 저장:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<CRON_SECRET 과 같은 값>', 'crawl_cron_secret');
```

과거 회차 채우기 (한 번에 최대 30회):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/crawl-draw" -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"from": 1219, "to": 1248}'
```

> 동행복권 응답 형식은 예고 없이 바뀔 수 있습니다. 파서는 `supabase/functions/_shared/dhlottery.ts` 에 모여 있고
> `tests/dhlottery.test.ts` 의 예시 HTML/JSON 으로 테스트합니다. (개발 환경에서 동행복권 사이트에 직접 접속할 수 없어 실제 응답으로는 검증하지 못했습니다.)
> 판매점 코드가 7자리가 아니면 `stores` 에는 넣지 않고, `winning_draws.store_codes` 에 원본 ID 만 남깁니다.

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
    lotto/                            회차 · 당첨 등수 · 생일수 · QR 파서 · 추천 · 품질 점수 (순수 함수)
    scan/                             사진 → QR / OCR 파이프라인 (브라우저 전용)
    repo/                             데이터 접근 계층 (Supabase 구현 / 데모 구현)
    supabase/                         브라우저 · 서버 · 미들웨어 클라이언트
    nativeBridge.ts                   Flutter WebView 브리지
  store/useAppStore.ts                Zustand 스토어
  middleware.ts                       세션 갱신 + 비로그인 리다이렉트
supabase/
  config.toml                         Google 로그인만 활성화, Storage 비활성화
  migrations/                         스키마 · 정산/가계부 함수 · pg_cron 스케줄
  functions/crawl-draw/               토요일 당첨번호 크롤러 (Deno)
  functions/_shared/                  동행복권 파서 · 카카오 지오코딩 · 회차 계산
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
| `npm test` | 단위 테스트 (Vitest) — 추천/품질/QR/OCR 파서/가계부/크롤러 파서/법적 문구 가드 |
| `node scripts/copy-tesseract-assets.mjs` | OCR 엔진 자산을 `public/tesseract` 로 복사 (postinstall 에서 자동 실행) |
| `node scripts/render-icons.mjs` | `public/icon.svg` → PWA PNG 아이콘 재생성 (Playwright) |

## 알려진 사항

- **Next.js 14 는 지원이 끝난 버전**이며, 14.2.35 에는 15.x/16.x 에서만 고쳐진 보안 권고가 남아 있습니다.
  요구 스택(Next 14)을 지키되 노출면을 줄이기 위해 이미지 최적화 API 를 끄고(`images.unoptimized`), Server Actions·rewrites 를 쓰지 않습니다.
  운영 배포 전 Next 16 업그레이드를 권장합니다 (데이터 접근이 클라이언트 + Supabase 중심이라 이전 부담이 작습니다).
