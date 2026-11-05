-- 문의 테이블을 여러 앱이 함께 쓸 수 있도록 앱 구분 컬럼을 추가합니다. 여러 번 실행해도 안전합니다.
-- 이 앱(로또당)의 문의는 'lottedang' 으로 저장됩니다. 기존 글도 모두 로또당 글이므로 같은 값이 채워집니다.
alter table public.inquiries add column if not exists app_name text not null default 'lottedang';
alter table public.inquiries drop constraint if exists inquiries_app_name_check;
alter table public.inquiries add constraint inquiries_app_name_check check (app_name ~ '^[a-z0-9][a-z0-9_-]{0,39}$');
comment on column public.inquiries.app_name is '문의가 들어온 앱 식별자 (로또당 = lottedang). 다른 앱이 이 테이블을 공유할 때 구분용';
create index if not exists inquiries_app_idx on public.inquiries (app_name, created_at desc);
