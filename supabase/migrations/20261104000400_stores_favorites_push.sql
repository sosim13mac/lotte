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
grant update (notify_geofence, notify_favorite_win, notify_draw_result) on public.users to authenticated;

-- 같은 회차 알림 중복 발송 방지 (일요일 보충 크롤링 등)
alter table public.winning_draws add column notified_at timestamptz;

-- ---------------------------------------------------------------------
-- 단골점
-- ---------------------------------------------------------------------
create table public.favorite_stores (
  user_id     uuid not null default auth.uid() references public.users (id) on delete cascade,
  store_code  varchar(7) not null references public.stores (code) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, store_code)
);
create index favorite_stores_store_idx on public.favorite_stores (store_code);

alter table public.favorite_stores enable row level security;
create policy "favorite_stores_select_own" on public.favorite_stores
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "favorite_stores_insert_own" on public.favorite_stores
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "favorite_stores_delete_own" on public.favorite_stores
  for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, delete on public.favorite_stores to authenticated;
grant select, insert, update, delete on public.favorite_stores to service_role;

-- ---------------------------------------------------------------------
-- FCM 토큰 (웹 PWA + Flutter 앱)
-- ---------------------------------------------------------------------
create table public.push_tokens (
  token         text primary key,
  user_id       uuid not null references public.users (id) on delete cascade,
  platform      text not null check (platform in ('web', 'android', 'ios')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated using ((select auth.uid()) = user_id);
grant select, delete on public.push_tokens to authenticated;
grant select, insert, update, delete on public.push_tokens to service_role;

-- 토큰 등록: 같은 기기 토큰이 다른 계정에 묶여 있으면 현재 사용자로 옮김
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  if p_platform not in ('web', 'android', 'ios') or length(p_token) < 20 or length(p_token) > 4096 then
    raise exception 'invalid push token';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, (select auth.uid()), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end;
$$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 푸시 대상 조회 (crawl-draw Edge Function 전용)
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

revoke execute on function public.favorite_win_targets(int) from public, anon, authenticated;
revoke execute on function public.draw_result_targets(int) from public, anon, authenticated;
grant execute on function public.favorite_win_targets(int) to service_role;
grant execute on function public.draw_result_targets(int) to service_role;
