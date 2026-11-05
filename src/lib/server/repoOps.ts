import 'server-only';
import type { QueryResultRow } from 'pg';
import { GAME_PRICE } from '@/lib/lotto/constants';
import { getPool } from './db';
import type { SessionUser } from './session';

type Args = Record<string, unknown>;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

const q = async <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) =>
  (await getPool().query<T>(text, params)).rows;

/** patch 객체에서 허용된 컬럼만 골라 UPDATE 의 SET 절을 만듭니다 */
function buildSet(patch: Args, allowed: readonly string[], jsonCols: readonly string[] = []) {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const k of allowed) {
    if (!(k in patch) || patch[k] === undefined) continue;
    vals.push(jsonCols.includes(k) ? JSON.stringify(patch[k]) : patch[k]);
    cols.push(`${k} = $${vals.length}`);
  }
  return { sql: cols.join(', '), vals };
}

const PROFILE_FIELDS = ['birth_date', 'monthly_budget', 'notify_geofence', 'notify_favorite_win', 'notify_draw_result'] as const;
const TICKET_FIELDS = ['opened_at', 'store_code', 'store_name', 'round', 'games', 'purchase_date'] as const;

const str = (v: unknown, name: string): string => {
  if (typeof v !== 'string' || !v) throw new HttpError(400, `${name} 가 필요해요`);
  return v;
};

async function ensureUser(user: SessionUser) {
  await q('insert into public.users (id, email) values ($1, $2) on conflict (id) do nothing', [user.id, user.email]);
}

/** Repo 인터페이스와 같은 이름의 서버 연산. 모두 로그인한 사용자 본인 데이터만 다룹니다. */
export const ops: Record<string, (user: SessionUser, a: Args) => Promise<unknown>> = {
  async getProfile(user) {
    await ensureUser(user);
    return (await q('select * from public.users where id = $1', [user.id]))[0] ?? null;
  },

  async updateProfile(user, a) {
    await ensureUser(user);
    const { sql, vals } = buildSet((a.patch ?? {}) as Args, PROFILE_FIELDS);
    if (sql) await q(`update public.users set ${sql} where id = $${vals.length + 1}`, [...vals, user.id]);
    return (await q('select * from public.users where id = $1', [user.id]))[0];
  },

  async listTickets(user) {
    return q('select * from public.tickets where user_id = $1 order by purchase_date desc limit 1000', [user.id]);
  },

  async insertTicket(user, a) {
    await ensureUser(user);
    const t = (a.input ?? {}) as Args;
    const games = t.games;
    if (!Array.isArray(games)) throw new HttpError(400, 'games 가 필요해요');
    const rows = await q(
      `insert into public.tickets (user_id, round, purchase_date, store_code, store_name, games, amount, qr_raw)
       values ($1, $2, coalesce($3::timestamptz, now()), $4, $5, $6::jsonb, $7, $8) returning *`,
      [user.id, t.round, t.purchase_date ?? null, t.store_code || null, t.store_name || null, JSON.stringify(games), games.length * GAME_PRICE, t.qr_raw ?? null],
    );
    return rows[0];
  },

  async updateTicket(user, a) {
    const { sql, vals } = buildSet((a.patch ?? {}) as Args, TICKET_FIELDS, ['games']);
    if (!sql) return null;
    await q(`update public.tickets set ${sql} where id = $${vals.length + 1} and user_id = $${vals.length + 2}`, [...vals, str(a.id, 'id'), user.id]);
    return null;
  },

  async deleteTicket(user, a) {
    await q('delete from public.tickets where id = $1 and user_id = $2', [str(a.id, 'id'), user.id]);
    return null;
  },

  async listDraws(_user, a) {
    const rounds = a.rounds as number[] | undefined;
    if (rounds?.length) return q('select * from public.winning_draws where round = any($1::int[]) order by round desc', [rounds]);
    return q('select * from public.winning_draws order by round desc limit $1', [Math.min(Number(a.limit ?? 20), 200)]);
  },

  async listDreamMap() {
    return q('select keyword, numbers from public.dream_map');
  },

  async getLedgerStats(user) {
    return (await q('select public.get_ledger_stats($1) as s', [user.id]))[0].s;
  },

  async findStore(_user, a) {
    return (await q('select * from public.stores where code = $1', [str(a.code, 'code')]))[0] ?? null;
  },

  async listStores(_user, a) {
    const query = (a.query ?? {}) as { bounds?: Record<string, number>; hotOnly?: boolean; limit?: number };
    const where = ['lat is not null'];
    const vals: unknown[] = [];
    if (query.bounds) {
      const b = query.bounds;
      vals.push(b.swLat, b.neLat, b.swLng, b.neLng);
      where.push('lat >= $1 and lat <= $2 and lng >= $3 and lng <= $4');
    }
    if (query.hotOnly) where.push('is_hot = true');
    vals.push(Math.min(Number(query.limit ?? 300), 1000));
    return q(`select * from public.stores where ${where.join(' and ')} order by first_win_count desc limit $${vals.length}`, vals);
  },

  async listFavoriteStores(user) {
    return q(
      `select s.* from public.favorite_stores f join public.stores s on s.code = f.store_code
       where f.user_id = $1 order by f.created_at desc`,
      [user.id],
    );
  },

  async setFavoriteStore(user, a) {
    const code = str(a.code, 'code');
    if (a.on) {
      await ensureUser(user);
      await q('insert into public.favorite_stores (user_id, store_code) values ($1, $2) on conflict do nothing', [user.id, code]);
    } else {
      await q('delete from public.favorite_stores where user_id = $1 and store_code = $2', [user.id, code]);
    }
    return null;
  },

  async registerPushToken(user, a) {
    const token = str(a.token, 'token');
    const platform = String(a.platform);
    if (!['web', 'android', 'ios'].includes(platform) || token.length < 20 || token.length > 4096) {
      throw new HttpError(400, 'invalid push token');
    }
    await ensureUser(user);
    // 같은 기기 토큰이 다른 계정에 묶여 있으면 현재 계정으로 옮김
    await q(
      `insert into public.push_tokens (token, user_id, platform) values ($1, $2, $3)
       on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now()`,
      [token, user.id, platform],
    );
    return null;
  },

  async unregisterPushToken(user, a) {
    await q('delete from public.push_tokens where token = $1 and user_id = $2', [str(a.token, 'token'), user.id]);
    return null;
  },
};
