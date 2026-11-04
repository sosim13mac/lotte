-- =====================================================================
-- 쫄깃로또 초기 스키마
--
-- 법적 고지: 모든 번호 조합의 1등 확률은 1/8,145,060 으로 동일합니다.
-- 이 스키마의 어떤 값도 "당첨 확률"을 뜻하지 않으며, 사진 원본은 저장하지 않습니다
-- (tickets 에는 QR 텍스트와 판매점 코드만 저장).
--
-- 참고: 2026-10-30 부터 Supabase 는 public 스키마의 새 테이블/함수를 Data API 역할
-- (anon / authenticated / service_role) 에 자동 노출하지 않습니다. 그래서 아래에서
-- 필요한 권한만 명시적으로 GRANT 합니다.
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
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  birth_date  date check (birth_date is null or birth_date >= date '1900-01-01'),
  created_at  timestamptz not null default now()
);
comment on table public.users is '쫄깃로또 사용자 프로필 (auth.users 와 1:1)';
comment on column public.users.birth_date is '생일수 = (년+월+일) % 45 + 1 계산용';

-- 가입 시 public.users 행 자동 생성
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- 2. tickets (내가 산 로또)
-- ---------------------------------------------------------------------
create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.users (id) on delete cascade,
  round          int not null check (round > 0),
  purchase_date  timestamptz not null default now(),
  store_code     varchar(7) check (store_code ~ '^[0-9]{7}$'),
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
  code              varchar(7) primary key check (code ~ '^[0-9]{7}$'),
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

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.tickets        enable row level security;
alter table public.winning_draws  enable row level security;
alter table public.stores         enable row level security;
alter table public.dream_map      enable row level security;

create policy "users_select_own" on public.users
  for select to authenticated using ((select auth.uid()) = id);
create policy "users_insert_own" on public.users
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "users_update_own" on public.users
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "tickets_select_own" on public.tickets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "tickets_insert_own" on public.tickets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tickets_update_own" on public.tickets
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tickets_delete_own" on public.tickets
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 당첨번호 / 판매점 / 꿈 해몽은 공개 데이터 (쓰기는 service_role 만)
create policy "winning_draws_read_all" on public.winning_draws
  for select to anon, authenticated using (true);
create policy "stores_read_all" on public.stores
  for select to anon, authenticated using (true);
create policy "dream_map_read_all" on public.dream_map
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- 권한 (명시적 GRANT)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert on public.users to authenticated;
grant update (birth_date) on public.users to authenticated;

grant select, delete on public.tickets to authenticated;
-- win_amount / profit 은 정산 로직만 갱신 (사용자 직접 수정 불가)
grant insert (user_id, round, purchase_date, store_code, store_name, amount, games, qr_raw, opened_at)
  on public.tickets to authenticated;
grant update (round, purchase_date, store_code, store_name, amount, games, opened_at)
  on public.tickets to authenticated;

grant select on public.winning_draws, public.stores, public.dream_map to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;

-- CHECK 제약에서 쓰는 검증 함수
grant execute on function public.is_valid_lotto_numbers(int[], int) to anon, authenticated, service_role;
grant execute on function public.is_valid_games(jsonb) to anon, authenticated, service_role;
-- 트리거 전용 함수는 직접 호출 불가
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
