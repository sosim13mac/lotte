/**
 * 동행복권 당첨번호 / 당첨금 / 1·2등 배출점 수집 (2025 개편 이후 JSON API).
 *
 * 순수 파서(parse*)는 런타임 API 를 쓰지 않아 서버(Node)와 Vitest 양쪽에서 테스트할 수 있습니다.
 * 동행복권 응답 형식이 바뀌면 파서만 고치면 됩니다 (tests/dhlottery.test.ts 에 예시 JSON).
 *
 * - 회차 결과: GET /lt645/selectPstLt645Info.do?srchLtEpsd=<회차>
 * - 1·2등 배출점: GET /wnprchsplcsrch/selectLtWnShp.do?srchWnShpRnk=all&srchLtEpsd=<회차>&srchShpLctn=
 */

export const DHLOTTERY = 'https://www.dhlottery.co.kr';

export interface DrawInfo {
  round: number;
  drawDate: string; // YYYY-MM-DD
  numbers: number[];
  bonus: number;
  /** 게임당 당첨금 [1등, 2등, 3등, 4등, 5등] (알 수 없으면 null) */
  prizes: Array<number | null>;
}

export interface TopStore {
  rank: 1 | 2;
  /** 동행복권 판매점 ID (숫자 8자리) */
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

/** 동행복권 공식 온라인 판매(인터넷) 항목 — 실제 판매점이 아니므로 제외 */
const ONLINE_STORE_ID = '51100000';

/** 숫자(또는 숫자 문자열)만 읽고, null/빈 문자열/그 밖의 값은 null (Number(null) === 0 이 되지 않게) */
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

function listOf(json: unknown): Record<string, unknown>[] {
  if (!json || typeof json !== 'object') return [];
  const data = (json as { data?: unknown }).data;
  const list = data && typeof data === 'object' ? (data as { list?: unknown }).list : null;
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

/** selectPstLt645Info.do 응답 → 지정한 회차의 DrawInfo (추첨 전이거나 형식이 다르면 null) */
export function parseDrawJson(json: unknown, round: number): DrawInfo | null {
  const row = listOf(json).find((r) => Number(r.ltEpsd) === round);
  if (!row) return null;
  const numbers = [1, 2, 3, 4, 5, 6].map((i) => Number(row[`tm${i}WnNo`])).sort((a, b) => a - b);
  const bonus = Number(row.bnsWnNo);
  const ymd = String(row.ltRflYmd ?? '');
  const drawDate = /^\d{8}$/.test(ymd) ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '';
  const valid =
    drawDate !== '' &&
    numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45) &&
    new Set(numbers).size === 6 &&
    Number.isInteger(bonus) &&
    bonus >= 1 &&
    bonus <= 45 &&
    !numbers.includes(bonus);
  if (!valid) return null;
  return {
    round,
    drawDate,
    numbers,
    bonus,
    prizes: [1, 2, 3, 4, 5].map((r) => num(row[`rnk${r}WnAmt`])),
  };
}

/** selectLtWnShp.do 응답 → 1·2등 배출점 (온라인 판매사이트 제외) */
export function parseTopStores(json: unknown): TopStore[] {
  const out: TopStore[] = [];
  for (const r of listOf(json)) {
    const rank = Number(r.wnShpRnk);
    const id = String(r.ltShpId ?? '').trim();
    if ((rank !== 1 && rank !== 2) || !/^\d+$/.test(id) || id === ONLINE_STORE_ID) continue;
    const name = String(r.shpNm ?? r.tradNm ?? '').trim();
    if (!name) continue;
    out.push({
      rank,
      id,
      name,
      address: String(r.shpAddr ?? r.rdnm ?? '').trim(),
      lat: num(r.shpLat),
      lng: num(r.shpLot),
    });
  }
  return out;
}

/** 판매점 코드는 숫자 7~8자리 (실제 동행복권 ID 는 8자리). 형식이 다르면 null */
export function normalizeStoreCode(id: string): string | null {
  const digits = id.replace(/\D/g, '');
  return /^\d{7,8}$/.test(digits) ? digits : null;
}

// ── 네트워크 ────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (compatible; LottoDangBot/1.0)';

async function fetchJson(url: string, ms = 15_000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return null; // 점검 페이지 등 HTML 응답
    }
  } finally {
    clearTimeout(timer);
  }
}

/** 아직 추첨 전이거나 응답을 읽을 수 없으면 null */
export async function fetchDraw(round: number): Promise<DrawInfo | null> {
  return parseDrawJson(await fetchJson(`${DHLOTTERY}/lt645/selectPstLt645Info.do?srchLtEpsd=${round}`), round);
}

export async function fetchTopStores(round: number): Promise<TopStore[]> {
  return parseTopStores(await fetchJson(`${DHLOTTERY}/wnprchsplcsrch/selectLtWnShp.do?srchWnShpRnk=all&srchLtEpsd=${round}&srchShpLctn=`));
}
