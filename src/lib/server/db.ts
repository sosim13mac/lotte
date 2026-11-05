import 'server-only';
import { Pool, types } from 'pg';

// bigint(int8)·bigint[] 는 JS 숫자로, date 는 'YYYY-MM-DD' 문자열 그대로 (당첨금은 2^53 보다 작음)
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1016 as never, (v) => v.slice(1, -1).split(',').filter(Boolean).map(Number));
types.setTypeParser(1082, (v) => v);

declare global {
  // eslint-disable-next-line no-var
  var __lottoPool: Pool | undefined;
}

/** Neon(Postgres) 연결 풀. 개발 서버 핫리로드에서도 하나만 유지합니다. */
export function getPool(): Pool {
  if (!globalThis.__lottoPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL 이 설정되지 않았습니다');
    globalThis.__lottoPool = new Pool({
      // pg 의 sslmode=require 는 verify-full 과 같게 동작하므로 명시해 경고를 없앱니다
      connectionString: url.replace('sslmode=require', 'sslmode=verify-full'),
      max: 5,
    });
  }
  return globalThis.__lottoPool;
}
