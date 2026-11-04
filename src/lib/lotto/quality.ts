/**
 * 번호 '품질 점수' 0~100 (가중 평균). 당첨 가능성과 무관한 지표입니다.
 *
 * - 밸런스 40%: 홀짝 3:3 만점, 합계 140~170 만점
 * - 희소성 40%: 1~31 에만 몰리면(생일 조합) 감점, 1·2·3·4·5·6 같은 인기 패턴 감점
 * - 중복회피 20%: 최근 20회 1등 번호와 3개 이상 겹치면 감점
 *
 * 화면에는 반드시 "품질 점수" 로만 표기하고, 확률처럼 보이는 표현을 쓰지 않습니다.
 */
import { gameStats, type GameStats } from './analysis';

export const QUALITY_WEIGHTS = { balance: 0.4, rarity: 0.4, dupAvoid: 0.2 } as const;
export const SUM_SWEET_SPOT = { min: 140, max: 170 } as const;

export type NoteTone = 'plus' | 'minus' | 'info';
export interface QualityNote {
  tone: NoteTone;
  text: string;
  /** 감점 크기 (코멘트 우선순위용) */
  weight: number;
}

export interface QualityResult {
  score: number;
  breakdown: { balance: number; rarity: number; dupAvoid: number };
  stats: GameStats;
  notes: QualityNote[];
  /** 규칙 기반 AI 코멘트 */
  comment: string;
  label: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const ODD_EVEN_SCORE: Record<number, number> = { 0: 0, 1: 30, 2: 70, 3: 100, 4: 70, 5: 30, 6: 0 };

function balanceScore(s: GameStats, notes: QualityNote[]): number {
  const oe = ODD_EVEN_SCORE[s.odd];
  if (oe === 100) notes.push({ tone: 'plus', text: '홀짝 3:3 완벽한 균형', weight: 0 });
  else {
    const skewed = s.odd <= 1 || s.odd >= 5;
    notes.push({ tone: 'minus', text: `홀짝 ${s.odd}:${s.even}${skewed ? ' 쏠림' : ''}`, weight: (100 - oe) * 0.2 });
  }

  const dist = s.sum < SUM_SWEET_SPOT.min ? SUM_SWEET_SPOT.min - s.sum : s.sum > SUM_SWEET_SPOT.max ? s.sum - SUM_SWEET_SPOT.max : 0;
  const sumScore = clamp(100 - dist * 2);
  if (dist === 0) notes.push({ tone: 'plus', text: `합계 ${s.sum} (140~170 구간)`, weight: 0 });
  else
    notes.push({
      tone: 'minus',
      text: `합계 ${s.sum} (140~170보다 ${s.sum < SUM_SWEET_SPOT.min ? '낮음' : '높음'})`,
      weight: (100 - sumScore) * 0.2,
    });
  return clamp((oe + sumScore) / 2);
}

function rarityScore(game: number[], s: GameStats, notes: QualityNote[]): number {
  let score = 100;
  const penalize = (amount: number, text: string) => {
    score -= amount;
    notes.push({ tone: 'minus', text, weight: amount * 0.4 });
  };

  const max = game[game.length - 1];
  if (max <= 12) penalize(50, '모두 1~12 (월·일 숫자로 많이 고르는 구간)');
  else if (max <= 31) penalize(35, '모두 1~31 (생일 조합과 겹치기 쉬움)');
  else notes.push({ tone: 'plus', text: '32~45 번호 포함', weight: 0 });

  const gaps = game.slice(1).map((n, i) => n - game[i]);
  const isProgression = gaps.every((g) => g === gaps[0]);
  if (s.maxRun >= 3 || isProgression) {
    const runPenalty = { 3: 15, 4: 30, 5: 45, 6: 60 }[Math.min(6, s.maxRun)] ?? 0;
    const apPenalty = isProgression && gaps[0] > 1 ? 40 : 0;
    if (apPenalty >= runPenalty) penalize(apPenalty, `${gaps[0]} 간격 등차수열 (인기 패턴)`);
    else penalize(runPenalty, `연속 번호 ${s.maxRun}개 (인기 패턴)`);
  }

  for (const k of [3, 4, 5, 6, 7]) {
    if (game.every((n) => n % k === 0) && !(isProgression && gaps[0] === k)) {
      penalize(30, `모두 ${k}의 배수 (인기 패턴)`);
      break;
    }
  }

  const lastDigits = new Map<number, number>();
  game.forEach((n) => lastDigits.set(n % 10, (lastDigits.get(n % 10) ?? 0) + 1));
  const sameEnding = Math.max(...lastDigits.values());
  if (sameEnding >= 4) penalize(20, `끝수가 같은 번호 ${sameEnding}개`);

  // 로또 용지는 7칸 격자 → 세로줄/가로줄 모양은 많이 마킹되는 패턴
  const cols = new Set(game.map((n) => (n - 1) % 7));
  const rows = new Set(game.map((n) => Math.floor((n - 1) / 7)));
  if (cols.size === 1) penalize(30, '용지에서 세로 한 줄 모양');
  else if (rows.size === 1) penalize(30, '용지에서 가로 한 줄 모양');

  return clamp(score);
}

function dupAvoidScore(game: number[], recentWinning: readonly (readonly number[])[], notes: QualityNote[]): number {
  if (!recentWinning.length) {
    notes.push({ tone: 'info', text: '최근 당첨번호 데이터가 없어 중복회피는 만점 처리', weight: 0 });
    return 100;
  }
  const overlaps = recentWinning.map((w) => game.filter((n) => w.includes(n)).length);
  const maxOverlap = Math.max(...overlaps);
  const heavy = overlaps.filter((o) => o >= 3).length;
  const base = maxOverlap <= 2 ? 100 : ({ 3: 60, 4: 30, 5: 10 }[maxOverlap] ?? 0);
  const score = clamp(base - Math.max(0, heavy - 1) * 10);
  if (maxOverlap >= 3)
    notes.push({
      tone: 'minus',
      text: `최근 ${recentWinning.length}회 1등 번호와 최대 ${maxOverlap}개 겹침${heavy > 1 ? ` (${heavy}회차)` : ''}`,
      weight: (100 - score) * 0.2,
    });
  else notes.push({ tone: 'plus', text: `최근 ${recentWinning.length}회 1등 번호와 겹침 ${maxOverlap}개 이하`, weight: 0 });
  return score;
}

export function qualityLabel(score: number): string {
  if (score >= 85) return '아주 좋은 밸런스';
  if (score >= 70) return '좋은 밸런스';
  if (score >= 50) return '무난한 편';
  return '흔한 패턴과 닮음';
}

/** 숫자 조합으로 문장 고르기 (같은 번호엔 항상 같은 코멘트) */
function pickPhrase(seed: number, phrases: string[]): string {
  return phrases[seed % phrases.length];
}

const ADVICE: Array<[RegExp, string]> = [
  [/1~12|1~31/, '32~45 사이 번호를 한두 개 섞으면 희소성 점수가 올라가요.'],
  [/연속 번호|등차수열|배수|세로 한 줄|가로 한 줄/, '많은 사람이 고르는 모양이라, 패턴을 살짝 비틀어 보는 걸 추천해요.'],
  [/끝수/, '끝자리를 다양하게 섞으면 더 고른 조합이 돼요.'],
  [/합계 \d+ \(140~170보다 낮음\)/, '큰 번호를 하나 섞으면 합계가 140~170 구간에 가까워져요.'],
  [/합계 \d+ \(140~170보다 높음\)/, '작은 번호를 하나 섞으면 합계가 140~170 구간에 가까워져요.'],
  [/홀짝/, '홀수와 짝수를 3:3에 가깝게 맞추면 밸런스 점수가 올라가요.'],
  [/1등 번호와/, '최근 1등 번호와 많이 겹쳐요. 한두 개를 바꿔 차별화해 보세요.'],
];

function buildComment(game: number[], score: number, notes: QualityNote[]): string {
  const seed = game.reduce((a, n) => a * 31 + n, 7) >>> 0;
  const opening =
    score >= 85
      ? pickPhrase(seed, ['밸런스와 희소성이 모두 탄탄한 조합이에요.', '흠잡을 곳이 거의 없는 고른 조합이에요.'])
      : score >= 70
        ? pickPhrase(seed, ['전반적으로 균형 잡힌 조합이에요.', '꽤 고르게 잘 짜인 조합이에요.'])
        : score >= 50
          ? pickPhrase(seed, ['무난하지만 손볼 곳이 조금 보여요.', '나쁘지 않은데, 한 군데만 다듬으면 좋겠어요.'])
          : pickPhrase(seed, ['많은 사람이 고르는 패턴과 닮은 조합이에요.', '인기 패턴 쪽으로 기운 조합이에요.']);

  const worst = notes.filter((n) => n.tone === 'minus').sort((a, b) => b.weight - a.weight)[0];
  let advice = worst ? ADVICE.find(([re]) => re.test(worst.text))?.[1] : undefined;
  if (advice && score >= 85) advice = `굳이 하나 꼽자면, ${advice}`;
  const closing = score >= 85 ? ' 다만 점수와 상관없이 1등 확률은 모든 조합이 1/8,145,060으로 같아요.' : '';
  return `${opening}${advice ? ` ${advice}` : ''}${closing}`;
}

/**
 * @param game 6개 번호
 * @param recentWinning 최근 20회 1등 번호
 */
export function evaluateQuality(game: readonly number[], recentWinning: readonly (readonly number[])[] = []): QualityResult {
  const sorted = [...game].sort((a, b) => a - b);
  const stats = gameStats(sorted);
  const notes: QualityNote[] = [];
  const balance = balanceScore(stats, notes);
  const rarity = rarityScore(sorted, stats, notes);
  const dupAvoid = dupAvoidScore(sorted, recentWinning.slice(0, 20), notes);
  const score = clamp(
    balance * QUALITY_WEIGHTS.balance + rarity * QUALITY_WEIGHTS.rarity + dupAvoid * QUALITY_WEIGHTS.dupAvoid,
  );
  return {
    score,
    breakdown: { balance, rarity, dupAvoid },
    stats,
    notes,
    comment: buildComment(sorted, score, notes),
    label: qualityLabel(score),
  };
}
