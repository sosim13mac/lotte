-- =====================================================================
-- 가계부 집계 + 당첨금 자동 정산
-- =====================================================================

-- ---------------------------------------------------------------------
-- 월 예산 (가계부 슬라이더)
-- ---------------------------------------------------------------------
alter table public.users
  add column monthly_budget int check (monthly_budget is null or monthly_budget between 0 and 10000000);
comment on column public.users.monthly_budget is '월 로또 예산(원). 이번 달 구매액이 80%를 넘으면 알림';
grant update (monthly_budget) on public.users to authenticated;

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
-- 가계부 집계 (호출한 사용자 본인 티켓만 — security invoker + RLS)
-- 클라이언트 데모 모드의 src/lib/ledger.ts 와 같은 결과를 냅니다.
-- ---------------------------------------------------------------------
create or replace function public.get_ledger_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with t as (
    select amount, win_amount, round, (purchase_date at time zone 'Asia/Seoul') as kst
    from public.tickets
    where user_id = (select auth.uid())
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

-- ---------------------------------------------------------------------
-- 권한
-- ---------------------------------------------------------------------
grant execute on function public.compute_win_amount(jsonb, int) to authenticated, service_role;
grant execute on function public.get_ledger_stats() to authenticated;
revoke execute on function public.settle_round(int) from public, anon, authenticated;
revoke execute on function public.refresh_store_stats(text[]) from public, anon, authenticated;
grant execute on function public.settle_round(int) to service_role;
grant execute on function public.refresh_store_stats(text[]) to service_role;
revoke execute on function public.tickets_settle_on_write() from public, anon, authenticated;
