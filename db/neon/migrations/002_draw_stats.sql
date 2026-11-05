-- 당첨번호(본번호 6개)별 분석 데이터를 컬럼으로 기록 — 여러 번 실행해도 안전합니다.
--   홀수/짝수 개수, 저구간(1~22)/고구간(23~45) 개수, 합계, 평균
-- 보너스 번호는 포함하지 않습니다. 값은 트리거가 numbers 로부터 계산하므로 항상 일치합니다.
alter table public.winning_draws
  add column if not exists odd_count   smallint,
  add column if not exists even_count  smallint,
  add column if not exists low_count   smallint,
  add column if not exists high_count  smallint,
  add column if not exists sum_numbers smallint,
  add column if not exists avg_number  double precision;

comment on column public.winning_draws.odd_count   is '본번호 중 홀수 개수';
comment on column public.winning_draws.even_count  is '본번호 중 짝수 개수';
comment on column public.winning_draws.low_count   is '본번호 중 저구간(1~22) 개수';
comment on column public.winning_draws.high_count  is '본번호 중 고구간(23~45) 개수';
comment on column public.winning_draws.sum_numbers is '본번호 6개의 합계';
comment on column public.winning_draws.avg_number  is '본번호 6개의 평균 (소수 첫째 자리)';

create or replace function public.winning_draws_fill_stats()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select count(*) filter (where n % 2 = 1),
         count(*) filter (where n % 2 = 0),
         count(*) filter (where n <= 22),
         count(*) filter (where n >= 23),
         sum(n),
         round(avg(n)::numeric, 1)
    into new.odd_count, new.even_count, new.low_count, new.high_count, new.sum_numbers, new.avg_number
    from unnest(new.numbers) as n;
  return new;
end;
$$;

drop trigger if exists winning_draws_fill_stats on public.winning_draws;
create trigger winning_draws_fill_stats
  before insert or update of numbers on public.winning_draws
  for each row execute function public.winning_draws_fill_stats();

-- 이미 저장된 회차도 채움 (트리거가 계산)
update public.winning_draws set numbers = numbers where odd_count is null;

alter table public.winning_draws
  alter column odd_count set not null,
  alter column even_count set not null,
  alter column low_count set not null,
  alter column high_count set not null,
  alter column sum_numbers set not null,
  alter column avg_number set not null;

alter table public.winning_draws drop constraint if exists winning_draws_stats_check;
alter table public.winning_draws add constraint winning_draws_stats_check check (
  odd_count + even_count = 6 and low_count + high_count = 6 and sum_numbers between 21 and 255
);

-- 분포 집계용 인덱스는 필요 없는 규모(회차 수천 건)라 만들지 않습니다.
