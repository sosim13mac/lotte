/**
 * 동행복권 당첨번호 / 당첨금 / 1·2등 배출점 수집.
 *
 * 순수 파서(parse*)는 Deno 와 Node(Vitest) 양쪽에서 테스트할 수 있게 런타임 API 를 쓰지 않습니다.
 * 동행복권 페이지 구조가 바뀌면 파서만 고치면 됩니다 (tests/dhlottery.test.ts 에 예시 HTML).
 */

export const DHLOTTERY = 'https://www.dhlottery.co.kr';

export interface DrawInfo {
  round: number;
  drawDate: string; // YYYY-MM-DD
  numbers: number[];
  bonus: number;
  /** 1등 1게임당 당첨금 (JSON API 제공) */
  firstPrize: number | null;
}

export interface TopStore {
  rank: 1 | 2;
  /** 동행복권 판매점 ID (숫자) */
  id: string;
  name: string;
  address: string;
  /** 1등만: 자동 / 수동 / 반자동 */
  method: string | null;
}

/** common.do?method=getLottoNumber 응답 → DrawInfo (추첨 전이면 null) */
export function parseDrawJson(json: unknown): DrawInfo | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;
  if (j.returnValue !== 'success') return null;
  const numbers = [1, 2, 3, 4, 5, 6].map((i) => Number(j[`drwtNo${i}`])).sort((a, b) => a - b);
  const bonus = Number(j.bnusNo);
  const round = Number(j.drwNo);
  const drawDate = String(j.drwNoDate ?? '');
  const valid =
    Number.isInteger(round) &&
    /^\d{4}-\d{2}-\d{2}$/.test(drawDate) &&
    new Set([...numbers, bonus]).size === 7 &&
    [...numbers, bonus].every((n) => Number.isInteger(n) && n >= 1 && n <= 45);
  if (!valid) return null;
  const first = Number(j.firstWinamnt);
  return { round, drawDate, numbers, bonus, firstPrize: Number.isFinite(first) && first > 0 ? first : null };
}

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

export const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const rowsOf = (html: string) => html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
const cellsOf = (row: string) => (row.match(/<td[\s\S]*?<\/td>/gi) ?? []).map(stripTags);

/**
 * gameResult.do?method=byWin 의 등위별 표 → 1게임당 당첨금 [1등..5등]
 * 행: 순위 | 등위별 총 당첨금액 | 당첨게임 수 | 1게임당 당첨금액 | 당첨기준 | 비고
 */
export function parsePrizeTable(html: string): Array<number | null> {
  const out: Array<number | null> = [null, null, null, null, null];
  for (const row of rowsOf(html)) {
    const text = stripTags(row);
    const m = /^(\d)\s*등/.exec(text);
    if (!m) continue;
    const rank = Number(m[1]);
    if (rank < 1 || rank > 5) continue;
    const amounts = [...text.matchAll(/([\d,]+)\s*원/g)].map((a) => Number(a[1].replace(/,/g, '')));
    if (amounts.length >= 2) out[rank - 1] = amounts[1];
  }
  return out;
}

const METHOD_RE = /^(자동|수동|반자동)$/;
const ID_RE = /(?:showMapPage|storeDetail|RTLRID)\D{0,4}'?(\d{6,12})/i;

function parseStoreRows(sectionHtml: string, rank: 1 | 2): TopStore[] {
  const stores: TopStore[] = [];
  for (const row of rowsOf(sectionHtml)) {
    const id = ID_RE.exec(row)?.[1];
    const cells = cellsOf(row);
    if (!id || cells.length < 3) continue;
    const name = cells[1];
    const method = cells.find((c) => METHOD_RE.test(c)) ?? null;
    const address = cells
      .slice(2)
      .filter((c) => !METHOD_RE.test(c) && !/위치보기|지도/.test(c))
      .sort((a, b) => b.length - a.length)[0];
    if (!name || !address) continue;
    stores.push({ rank, id, name, address, method: rank === 1 ? method : null });
  }
  return stores;
}

/** store.do?method=topStore&pageGubun=L645 → 1등·2등 배출점 */
export function parseTopStores(html: string): TopStore[] {
  const idx2 = html.search(/2등\s*배출점/);
  const first = idx2 >= 0 ? html.slice(0, idx2) : html;
  const second = idx2 >= 0 ? html.slice(idx2) : '';
  return [...parseStoreRows(first, 1), ...parseStoreRows(second, 2)];
}

/** 앱 스키마의 판매점 코드는 숫자 7자리 (요구사항). 형식이 다르면 null */
export function normalizeStoreCode(id: string): string | null {
  const digits = id.replace(/\D/g, '');
  return /^\d{7}$/.test(digits) ? digits : null;
}

// ── 네트워크 (Deno / Node 공통 fetch) ────────────────────────────────

const UA = 'Mozilla/5.0 (compatible; ZzolgitLottoBot/1.0)';

async function fetchWithTimeout(url: string, ms = 15_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: '*/*' } });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string, encoding = 'utf-8'): Promise<string> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return new TextDecoder(encoding).decode(await res.arrayBuffer());
}

export async function fetchDraw(round: number): Promise<DrawInfo | null> {
  const res = await fetchWithTimeout(`${DHLOTTERY}/common.do?method=getLottoNumber&drwNo=${round}`);
  if (!res.ok) throw new Error(`당첨번호 조회 실패 ${res.status}`);
  const text = await res.text();
  try {
    return parseDrawJson(JSON.parse(text));
  } catch {
    return null; // 점검 페이지 등 HTML 응답
  }
}

export async function fetchPrizes(round: number): Promise<Array<number | null>> {
  return parsePrizeTable(await fetchText(`${DHLOTTERY}/gameResult.do?method=byWin&drwNo=${round}`, 'euc-kr'));
}

export async function fetchTopStores(round: number): Promise<TopStore[]> {
  return parseTopStores(await fetchText(`${DHLOTTERY}/store.do?method=topStore&pageGubun=L645&drwNo=${round}`, 'euc-kr'));
}
