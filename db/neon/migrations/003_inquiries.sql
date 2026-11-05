-- 문의/건의 게시판 — 본인 글만 조회 (조회·작성·삭제는 API 가 user_id 로 제한), 답변은 운영자만. 여러 번 실행해도 안전합니다.
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users (id) on delete cascade,
  category    text not null check (category in ('inquiry', 'suggestion', 'bug')),
  title       varchar(100) not null check (length(btrim(title)) > 0),
  body        text not null check (length(btrim(body)) between 1 and 2000),
  status      text not null default 'open' check (status in ('open', 'answered')),
  reply       text check (reply is null or length(reply) <= 2000),
  replied_at  timestamptz,
  created_at  timestamptz not null default now()
);
comment on table public.inquiries is '문의/건의/오류 신고. 작성자 본인과 운영자(ADMIN_EMAILS)만 볼 수 있음';
create index if not exists inquiries_user_idx on public.inquiries (user_id, created_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
