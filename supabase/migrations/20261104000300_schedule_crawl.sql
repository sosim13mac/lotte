-- =====================================================================
-- 토요일 20:35(KST) 이후 crawl-draw Edge Function 자동 호출 (pg_cron + pg_net)
--
-- 사전 준비 — 값은 git 에 넣지 말고 SQL Editor 에서 한 번만 실행하세요:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<임의의 긴 문자열>', 'crawl_cron_secret');
-- Edge Function 에도 같은 값을 시크릿으로:
--   npx supabase secrets set CRON_SECRET=<같은 문자열> KAKAO_REST_API_KEY=<카카오 REST 키>
-- 시크릿이 없으면 잡은 경고만 남기고 아무것도 하지 않습니다.
-- =====================================================================
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_crawl_draw(p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'crawl_cron_secret';
  if v_url is null or v_secret is null then
    raise warning 'crawl-draw: vault 에 project_url / crawl_cron_secret 이 없어 건너뜁니다';
    return null;
  end if;
  select net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/crawl-draw',
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke execute on function public.invoke_crawl_draw(jsonb) from public, anon, authenticated;

-- 다시 적용해도 중복되지 않게 기존 잡 제거
select cron.unschedule(jobname) from cron.job where jobname like 'zzolgit-crawl-%';

-- pg_cron 시간은 UTC 기준 (KST = UTC+9)
-- 토 20:35 / 20:45 / 20:55 KST
select cron.schedule('zzolgit-crawl-sat-early', '35-55/10 11 * * 6', $cron$select public.invoke_crawl_draw()$cron$);
-- 토 21:00 ~ 일 00:50 KST, 10분 간격 (발표가 늦어지는 경우 — 이미 저장된 회차는 함수가 건너뜀)
select cron.schedule('zzolgit-crawl-sat-late', '*/10 12-15 * * 6', $cron$select public.invoke_crawl_draw()$cron$);
-- 일 09:00 ~ 12:00 KST 매시 정각 — 당첨금·배출점이 늦게 올라온 경우 보충 + 재정산
select cron.schedule('zzolgit-crawl-sun-refill', '0 0-3 * * 0', $cron$select public.invoke_crawl_draw()$cron$);
