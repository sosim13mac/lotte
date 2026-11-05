-- 로또당 Neon(Postgres) 스키마 — supabase/migrations 에서 Supabase 전용 부분(RLS/역할/GRANT/auth.users)을 걷어낸 버전

-- ===== Better Auth 코어 테이블 =====
create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create table if not exists session (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" (id) on delete cascade
);
create index if not exists session_user_idx on session ("userId");
create table if not exists account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" (id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists account_user_idx on account ("userId");
create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- =====================================================================
-- 쫄깃로또 초기 스키마
--
-- 법적 고지: 모든 번호 조합의 1등 확률은 1/8,145,060 으로 동일합니다.
-- 이 스키마의 어떤 값도 "당첨 확률"을 뜻하지 않으며, 사진 원본은 저장하지 않습니다
-- (tickets 에는 QR 텍스트와 판매점 코드만 저장).
--
-- (Neon) Supabase 의 RLS/역할/GRANT 는 쓰지 않습니다. 본인 데이터 제한은 API 서버 코드가 합니다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 검증 함수
-- ---------------------------------------------------------------------

-- 1~45 사이 서로 다른 정수 n개인지
create or replace function public.is_valid_lotto_numbers(nums int[], expected int)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select nums is not null
     and cardinality(nums) = expected
     and (select count(distinct n) from unnest(nums) as n where n between 1 and 45) = expected;
$$;

-- tickets.games: [[6개], ...] 형태, 1~5 게임, 각 게임은 1~45 서로 다른 정수 6개
create or replace function public.is_valid_games(games jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(games) = 'array'
     and jsonb_array_length(games) between 1 and 5
     and not exists (
       select 1
       from jsonb_array_elements(games) as g(game)
       where jsonb_typeof(g.game) <> 'array'
          or jsonb_array_length(g.game) <> 6
          or (
            select count(distinct case when n.v::text ~ '^[0-9]{1,2}$' then n.v::text::int end)
            from jsonb_array_elements(g.game) as n(v)
            where n.v::text ~ '^[0-9]{1,2}$' and n.v::text::int between 1 and 45
          ) <> 6
     );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. users (Supabase Auth 연동)
-- ---------------------------------------------------------------------
create table public.users (
  id          text primary key references "user" (id) on delete cascade,
  email       text,
  birth_date  date check (birth_date is null or birth_date >= date '1900-01-01'),
  created_at  timestamptz not null default now()
);
comment on table public.users is '쫄깃로또 사용자 프로필 (Better Auth user 와 1:1)';
comment on column public.users.birth_date is '생일수 = (년+월+일) % 45 + 1 계산용';

-- (Neon) 사용자 행은 로그인 후 API 가 만듭니다 (Better Auth "user" 테이블과 1:1)

-- ---------------------------------------------------------------------
-- 2. tickets (내가 산 로또)
-- ---------------------------------------------------------------------
create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null references public.users (id) on delete cascade,
  round          int not null check (round > 0),
  purchase_date  timestamptz not null default now(),
  store_code     varchar(8) check (store_code ~ '^[0-9]{7,8}$'),
  store_name     varchar(100),
  amount         int not null check (amount >= 0),
  games          jsonb not null check (public.is_valid_games(games)),
  -- int4 최대값(약 21억)을 넘는 1등 당첨금이 있어 bigint 사용
  win_amount     bigint not null default 0 check (win_amount >= 0),
  profit         bigint generated always as (win_amount - amount) stored,
  qr_raw         text,         -- QR 원문 텍스트 (사진은 저장하지 않음, 중복 등록 방지 키)
  opened_at      timestamptz,  -- 쫄깃 오픈 완료 시각 (null = 아직 안 열어봄)
  created_at     timestamptz not null default now()
);
comment on column public.tickets.games is '예: [[7,12,19,28,33,42], ...] (최대 5게임)';
comment on column public.tickets.amount is '게임 수 x 1,000원 (insert 시 비어 있으면 자동 계산)';

create index tickets_user_round_idx on public.tickets (user_id, round desc);
create index tickets_user_purchase_idx on public.tickets (user_id, purchase_date desc);
create index tickets_round_idx on public.tickets (round);
create unique index tickets_user_qr_uidx on public.tickets (user_id, qr_raw) where qr_raw is not null;

-- amount 가 없으면 게임 수 x 1,000원
create or replace function public.tickets_fill_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.amount is null then
    new.amount := jsonb_array_length(new.games) * 1000;
  end if;
  return new;
end;
$$;

create trigger tickets_fill_defaults
  before insert on public.tickets
  for each row execute function public.tickets_fill_defaults();

-- ---------------------------------------------------------------------
-- 3. winning_draws (토요일 크롤링 결과)
-- ---------------------------------------------------------------------
create table public.winning_draws (
  round               int primary key check (round > 0),
  draw_date           date not null,
  numbers             int[] not null check (public.is_valid_lotto_numbers(numbers, 6)),
  bonus               int not null check (bonus between 1 and 45),
  store_codes         text[] not null default '{}',  -- 1등 배출점 코드
  second_store_codes  text[] not null default '{}',  -- 2등 배출점 코드 (단골점 알림용)
  prize_amounts       bigint[],                      -- 게임당 당첨금 [1등,2등,3등,4등,5등]
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint winning_draws_bonus_not_in_numbers check (not (bonus = any (numbers))),
  constraint winning_draws_prize_len check (prize_amounts is null or cardinality(prize_amounts) = 5)
);
create index winning_draws_store_codes_gin on public.winning_draws using gin (store_codes);
create index winning_draws_second_store_codes_gin on public.winning_draws using gin (second_store_codes);

create trigger winning_draws_updated_at
  before update on public.winning_draws
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. stores (명당 DB)
-- ---------------------------------------------------------------------
create table public.stores (
  code              varchar(8) primary key check (code ~ '^[0-9]{7,8}$'),
  name              varchar(100) not null,
  address           text,
  lat               double precision check (lat between -90 and 90),
  lng               double precision check (lng between -180 and 180),
  first_win_count   int not null default 0 check (first_win_count >= 0),
  second_win_count  int not null default 0 check (second_win_count >= 0),
  is_hot            boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index stores_lat_lng_idx on public.stores (lat, lng);
create index stores_is_hot_idx on public.stores (is_hot) where is_hot;

create trigger stores_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. dream_map (꿈 키워드 → 행운수 2개)
-- ---------------------------------------------------------------------
create table public.dream_map (
  keyword  varchar(30) primary key,
  numbers  int[] not null check (public.is_valid_lotto_numbers(numbers, 2))
);
comment on table public.dream_map is '재미용 꿈 해몽 행운수. 당첨과 무관합니다.';

insert into public.dream_map (keyword, numbers) values
  ('돼지', array[12, 26]),
  ('용', array[5, 33]),
  ('뱀', array[7, 21]),
  ('구렁이', array[16, 43]),
  ('호랑이', array[3, 38]),
  ('소', array[2, 17]),
  ('말', array[9, 27]),
  ('개', array[11, 40]),
  ('고양이', array[13, 28]),
  ('쥐', array[1, 19]),
  ('닭', array[10, 35]),
  ('물고기', array[6, 24]),
  ('잉어', array[18, 30]),
  ('거북이', array[8, 44]),
  ('새', array[14, 31]),
  ('학', array[16, 41]),
  ('봉황', array[20, 38]),
  ('똥', array[4, 23]),
  ('물', array[15, 29]),
  ('불', array[18, 36]),
  ('돈', array[20, 45]),
  ('금', array[22, 39]),
  ('반지', array[25, 34]),
  ('보석', array[27, 45]),
  ('복권', array[21, 45]),
  ('조상', array[30, 42]),
  ('할머니', array[19, 26]),
  ('할아버지', array[10, 31]),
  ('엄마', array[5, 24]),
  ('아빠', array[15, 39]),
  ('친구', array[8, 22]),
  ('대통령', array[1, 43]),
  ('왕', array[29, 34]),
  ('연예인', array[17, 32]),
  ('천사', array[2, 33]),
  ('부처', array[9, 18]),
  ('아기', array[3, 26]),
  ('결혼', array[6, 37]),
  ('이빨', array[9, 30]),
  ('피', array[11, 22]),
  ('시체', array[13, 44]),
  ('꽃', array[5, 18]),
  ('나무', array[8, 25]),
  ('과일', array[23, 37]),
  ('쌀', array[24, 43]),
  ('바다', array[16, 33]),
  ('산', array[12, 40]),
  ('우물', array[13, 35]),
  ('해', array[1, 21]),
  ('달', array[15, 30]),
  ('별', array[7, 39]),
  ('무지개', array[7, 14]),
  ('비', array[10, 28]),
  ('눈', array[2, 35]),
  ('집', array[4, 31]),
  ('자동차', array[19, 38]),
  ('비행기', array[20, 41]),
  ('신발', array[3, 32]),
  ('거울', array[6, 42]),
  ('열쇠', array[11, 36]),
  ('시험', array[14, 27]),
  ('선물', array[17, 44])
on conflict (keyword) do update set numbers = excluded.numbers;


-- =====================================================================
-- 가계부 집계 + 당첨금 자동 정산
-- =====================================================================

-- ---------------------------------------------------------------------
-- 월 예산 (가계부 슬라이더)
-- ---------------------------------------------------------------------
alter table public.users
  add column monthly_budget int check (monthly_budget is null or monthly_budget between 0 and 10000000);
comment on column public.users.monthly_budget is '월 로또 예산(원). 이번 달 구매액이 80%를 넘으면 알림';

-- ---------------------------------------------------------------------
-- 당첨금 계산 (tickets.win_amount)
-- ---------------------------------------------------------------------
alter table public.tickets add column settled_at timestamptz;
comment on column public.tickets.settled_at is '당첨금 정산 시각 (null = 아직 추첨 결과 없음)';

-- 게임별 일치 개수로 등수를 매기고 회차별 1게임 당첨금을 합산.
-- 4·5등은 고정(50,000 / 5,000), 1~3등은 winning_draws.prize_amounts (없으면 0 → 크롤러가 채운 뒤 재정산)
create or replace function public.compute_win_amount(p_games jsonb, p_round int)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(
    case
      when x.m = 6 then coalesce(d.prize_amounts[1], 0)
      when x.m = 5 and x.b then coalesce(d.prize_amounts[2], 0)
      when x.m = 5 then coalesce(d.prize_amounts[3], 0)
      when x.m = 4 then coalesce(d.prize_amounts[4], 50000)
      when x.m = 3 then coalesce(d.prize_amounts[5], 5000)
      else 0
    end), 0)::bigint
  from public.winning_draws d
  cross join lateral jsonb_array_elements(p_games) as g(game)
  cross join lateral (
    select count(*) filter (where n.v::int = any (d.numbers)) as m,
           coalesce(bool_or(n.v::int = d.bonus), false) as b
    from jsonb_array_elements_text(g.game) as n(v)
  ) as x
  where d.round = p_round;
$$;

-- 티켓 등록/수정 시: 이미 추첨된 회차면 바로 당첨금 계산 (추첨 후에 등록하는 경우가 많음)
create or replace function public.tickets_settle_on_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.winning_draws where round = new.round) then
    new.win_amount := public.compute_win_amount(new.games, new.round);
    new.settled_at := now();
  else
    new.win_amount := 0;
    new.settled_at := null;
  end if;
  return new;
end;
$$;

create trigger tickets_settle_on_insert
  before insert on public.tickets
  for each row execute function public.tickets_settle_on_write();

create trigger tickets_settle_on_update
  before update of games, round on public.tickets
  for each row execute function public.tickets_settle_on_write();

-- 크롤러가 당첨번호를 저장한 뒤 호출: 해당 회차 티켓 전체 재정산
create or replace function public.settle_round(p_round int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected int;
begin
  update public.tickets t
     set win_amount = public.compute_win_amount(t.games, t.round),
         settled_at = now()
   where t.round = p_round;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- 판매점별 1·2등 배출 횟수 재계산 + 명당(is_hot) 표시
create or replace function public.refresh_store_stats(p_codes text[] default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected int;
begin
  update public.stores s
     set first_win_count  = (select count(*) from public.winning_draws w where s.code = any (w.store_codes)),
         second_win_count = (select count(*) from public.winning_draws w where s.code = any (w.second_store_codes))
   where p_codes is null or s.code = any (p_codes);
  -- 명당 기준: 1등 2회 이상 또는 2등 5회 이상
  update public.stores s
     set is_hot = (s.first_win_count >= 2 or s.second_win_count >= 5)
   where p_codes is null or s.code = any (p_codes);
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ---------------------------------------------------------------------
-- 가계부 집계 (p_user 본인 티켓만)
-- 클라이언트 데모 모드의 src/lib/ledger.ts 와 같은 결과를 냅니다.
-- ---------------------------------------------------------------------
create or replace function public.get_ledger_stats(p_user text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with t as (
    select amount, win_amount, round, (purchase_date at time zone 'Asia/Seoul') as kst
    from public.tickets
    where user_id = p_user
  ),
  days as (
    select distinct kst::date as d from t
  ),
  gaps as (
    select d - lag(d) over (order by d) as gap from days
  ),
  s as (
    select coalesce(sum(amount), 0)::bigint as total_spent,
           coalesce(sum(win_amount), 0)::bigint as total_won,
           count(*)::int as ticket_count,
           count(*) filter (where win_amount > 0)::int as win_ticket_count,
           min(kst) as first_kst,
           max(kst) as last_kst
    from t
  ),
  now_kst as (
    select (now() at time zone 'Asia/Seoul') as v
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total_spent', s.total_spent,
      'total_won', s.total_won,
      'profit', s.total_won - s.total_spent,
      'roi', case when s.total_spent > 0
                  then round((s.total_won - s.total_spent)::numeric * 100 / s.total_spent, 1) end,
      'ticket_count', s.ticket_count,
      'win_ticket_count', s.win_ticket_count,
      'first_purchase', to_char(s.first_kst, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'last_purchase', to_char(s.last_kst, 'YYYY-MM-DD"T"HH24:MI:SS'),
      -- 첫 구매부터 지금까지 주 수 (최소 1주)
      'weekly_avg_spent', case when s.ticket_count > 0
          then round(s.total_spent / greatest(1, ceil(extract(epoch from (n.v - s.first_kst)) / 604800.0)))::bigint end,
      -- 구매한 날 사이 평균 간격(일)
      'purchase_cycle_days', (select round(avg(gap)::numeric, 1) from gaps where gap is not null)
    ),
    'this_month_spent', (
      select coalesce(sum(amount), 0)::bigint from t
      where date_trunc('month', kst) = date_trunc('month', n.v)
    ),
    'monthly', (
      select coalesce(jsonb_agg(m order by m.month), '[]'::jsonb)
      from (
        select to_char(date_trunc('month', kst), 'YYYY-MM') as month,
               sum(amount)::bigint as spent,
               sum(win_amount)::bigint as won,
               count(*)::int as tickets
        from t
        group by 1
        order by 1 desc
        limit 12
      ) m
    ),
    'heatmap', (
      select coalesce(jsonb_agg(h order by h.dow, h.slot), '[]'::jsonb)
      from (
        select extract(dow from kst)::int as dow,
               (extract(hour from kst)::int / 4) as slot,
               count(*)::int as count,
               sum(amount)::bigint as amount
        from t
        group by 1, 2
      ) h
    )
  )
  from s, now_kst n;
$$;


-- =====================================================================
-- 명당 지도 · 단골점 · 푸시 알림
-- =====================================================================

-- 판매점 영업시간 ([영업중] 필터). 모르면 null → 로또 판매시간만으로 판단
alter table public.stores
  add column open_time time,
  add column close_time time;
comment on column public.stores.open_time is '영업 시작 (null = 정보 없음, open=close 이면 24시간)';

-- 알림 설정
alter table public.users
  add column notify_geofence boolean not null default true,
  add column notify_favorite_win boolean not null default true,
  add column notify_draw_result boolean not null default true;
comment on column public.users.notify_geofence is '명당 500m 이내 진입 시 로컬 알림';
comment on column public.users.notify_favorite_win is '단골점에서 1·2등이 나오면 FCM 푸시';
comment on column public.users.notify_draw_result is '내 티켓 회차 결과가 나오면 FCM 푸시 (결과는 앱에서 쫄깃하게 공개)';

-- 같은 회차 알림 중복 발송 방지 (일요일 보충 크롤링 등)
alter table public.winning_draws add column notified_at timestamptz;

-- ---------------------------------------------------------------------
-- 단골점
-- ---------------------------------------------------------------------
create table public.favorite_stores (
  user_id     text not null references public.users (id) on delete cascade,
  store_code  varchar(8) not null references public.stores (code) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, store_code)
);
create index favorite_stores_store_idx on public.favorite_stores (store_code);


-- ---------------------------------------------------------------------
-- FCM 토큰 (웹 PWA + Flutter 앱)
-- ---------------------------------------------------------------------
create table public.push_tokens (
  token         text primary key,
  user_id       text not null references public.users (id) on delete cascade,
  platform      text not null check (platform in ('web', 'android', 'ios')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);



-- ---------------------------------------------------------------------
-- 푸시 대상 조회 (크롤러 전용)
-- ---------------------------------------------------------------------
-- 단골점에서 1·2등이 나온 사용자의 토큰
create or replace function public.favorite_win_targets(p_round int)
returns table (token text, platform text, store_code text, store_name text, rank int)
language sql
stable
security definer
set search_path = ''
as $$
  with wins as (
    select unnest(w.store_codes) as code, 1 as rank from public.winning_draws w where w.round = p_round
    union
    select unnest(w.second_store_codes), 2 from public.winning_draws w where w.round = p_round
  ),
  best as (
    select code, min(rank) as rank from wins group by code
  )
  select t.token, t.platform, s.code::text, s.name::text, b.rank
  from best b
  join public.stores s on s.code = b.code
  join public.favorite_stores f on f.store_code = s.code
  join public.users u on u.id = f.user_id and u.notify_favorite_win
  join public.push_tokens t on t.user_id = u.id;
$$;

-- 이번 회차 티켓이 있는 사용자의 토큰 (결과 공개 알림)
create or replace function public.draw_result_targets(p_round int)
returns table (token text, platform text, tickets int)
language sql
stable
security definer
set search_path = ''
as $$
  select t.token, t.platform, count(distinct k.id)::int
  from public.tickets k
  join public.users u on u.id = k.user_id and u.notify_draw_result
  join public.push_tokens t on t.user_id = u.id
  where k.round = p_round
  group by t.token, t.platform;
$$;

