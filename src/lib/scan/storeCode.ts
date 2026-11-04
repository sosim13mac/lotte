/**
 * OCR 결과 텍스트에서 판매점 코드(숫자 7자리)를 찾습니다.
 *
 * - OCR 이 숫자를 비슷한 글자로 읽는 경우(O→0, l→1, S→5, B→8 …)를 숫자 위주 토큰에서만 보정
 * - 앞뒤로 다른 숫자가 붙은 7자리(바코드·일련번호의 일부)는 제외
 * - '판매점', 'STORE', 'No' 같은 키워드가 있는 줄을 우선
 * - "123 4567" 처럼 공백으로 끊겨 읽힌 경우도 이어 붙여 후보로 사용 (낮은 우선순위)
 */
export const STORE_CODE_LENGTH = 7;

const CONFUSABLE: Record<string, string> = {
  O: '0', o: '0', D: '0', Q: '0', U: '0',
  I: '1', l: '1', i: '1', '|': '1', '!': '1', L: '1',
  Z: '2', z: '2',
  S: '5', s: '5',
  G: '6', b: '6',
  T: '7',
  B: '8',
  g: '9', q: '9',
};

const KEYWORD_RE = /판매|점번호|store|shop|retail|\bno\b|n0\.|id[:.]/i;

/** 숫자가 대부분인 토큰만 혼동 문자를 숫자로 바꿈 */
function normalizeToken(token: string): string {
  const digitLike = [...token].filter((c) => /\d/.test(c) || c in CONFUSABLE).length;
  const digits = [...token].filter((c) => /\d/.test(c)).length;
  if (token.length >= 4 && digits >= 3 && digitLike / token.length >= 0.7) {
    return [...token].map((c) => CONFUSABLE[c] ?? c).join('');
  }
  return token;
}

interface Candidate {
  code: string;
  priority: number; // 낮을수록 우선
  order: number;
}

export function extractStoreCode(text: string, length = STORE_CODE_LENGTH): string | null {
  const candidates: Candidate[] = [];
  const exact = new RegExp(`(?<!\\d)(\\d{${length}})(?!\\d)`, 'g');
  let order = 0;

  text.split(/\r?\n/).forEach((line) => {
    const keyword = KEYWORD_RE.test(line);
    const tokens = line.split(/\s+/).filter(Boolean).map(normalizeToken);
    const joined = tokens.join(' ');

    for (const m of joined.matchAll(exact)) {
      candidates.push({ code: m[1], priority: keyword ? 0 : 1, order: order++ });
    }

    // 공백으로 쪼개진 순수 숫자 토큰 2~3개를 이어 붙여 정확히 length 자리가 되면 후보
    for (let i = 0; i < tokens.length; i += 1) {
      let acc = '';
      for (let j = i; j < Math.min(tokens.length, i + 3); j += 1) {
        if (!/^\d+$/.test(tokens[j])) break;
        acc += tokens[j];
        if (j > i && acc.length === length) {
          candidates.push({ code: acc, priority: keyword ? 2 : 3, order: order++ });
        }
        if (acc.length >= length) break;
      }
    }
  });

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.priority - b.priority || a.order - b.order);
  return candidates[0].code;
}
