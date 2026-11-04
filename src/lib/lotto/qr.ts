/**
 * 동행복권 로또 6/45 티켓 QR 파서.
 *
 * QR 은 보통 `http://m.dhlottery.co.kr/?v=1248q031219283342m...1434117808` 처럼
 * v 파라미터에 [회차 4자리] + ([영문 1자 + 두 자리 숫자 6개] x 게임 수) + [일련번호] 를 담고 있습니다.
 * 영문자는 자동/수동 구분이라 저장하지 않고, 사용하지 않은 줄(000000000000)은 건너뜁니다.
 */
export interface ParsedLottoQr {
  round: number;
  games: number[][];
  /** QR 원문 텍스트 (DB 에 저장되는 유일한 '사진 유래' 데이터) */
  raw: string;
}

const GAME_RE = /([a-z])(\d{12})/giy;

function isValidGame(nums: number[]): boolean {
  return nums.length === 6 && new Set(nums).size === 6 && nums.every((n) => Number.isInteger(n) && n >= 1 && n <= 45);
}

function extractPayload(text: string): string | null {
  const fromParam = /[?&]v=([0-9a-z]+)/i.exec(text);
  if (fromParam) return fromParam[1];
  if (/^\d{4}[a-z]\d{12}/i.test(text)) return text; // URL 없이 값만 있는 경우
  return null;
}

export function parseLottoQr(text: string | null | undefined): ParsedLottoQr | null {
  if (!text) return null;
  const raw = text.trim();
  const payload = extractPayload(raw);
  if (!payload) return null;

  const round = Number(payload.slice(0, 4));
  if (!Number.isInteger(round) || round < 1) return null;

  const games: number[][] = [];
  GAME_RE.lastIndex = 4;
  let m: RegExpExecArray | null;
  while ((m = GAME_RE.exec(payload))) {
    const digits = m[2];
    const nums = [0, 2, 4, 6, 8, 10].map((i) => Number(digits.slice(i, i + 2)));
    if (nums.every((n) => n === 0)) continue; // 비어 있는 줄
    if (!isValidGame(nums)) return null;
    games.push(nums.sort((a, b) => a - b));
  }

  if (games.length < 1 || games.length > 5) return null;
  return { round, games, raw };
}
