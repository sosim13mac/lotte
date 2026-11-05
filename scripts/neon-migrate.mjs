// Neon 스키마 적용: node scripts/neon-migrate.mjs
// DATABASE_URL 은 환경변수 또는 .env.local 에서 읽습니다. 이미 적용했다면 건너뜁니다.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trimStart().startsWith('#')) process.env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim();
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 이 없습니다 (.env.local 확인)');
  process.exit(1);
}

const sql = readFileSync(new URL('../db/neon/schema.sql', import.meta.url), 'utf8');
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query("select to_regclass('public.tickets') as t");
  if (rows[0].t) {
    console.log('이미 적용됨: public.tickets 가 있습니다. 건너뜁니다.');
  } else {
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    console.log('스키마 적용 완료');
  }
  const t = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by 1",
  );
  console.log('테이블:', t.rows.map((r) => r.table_name).join(', '));
  const d = await client.query('select count(*)::int as n from public.dream_map');
  console.log('dream_map 행:', d.rows[0].n);
} catch (e) {
  await client.query('rollback').catch(() => {});
  console.error('실패:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
