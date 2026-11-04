/**
 * 법적 문구 가드: 화면 코드(src/)에 '당첨 확률 n%' 같은 표현이 들어가지 않도록 검사합니다.
 * 허용되는 확률 표현은 '1/8,145,060 으로 동일' 안내뿐입니다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISCLAIMER, ODDS_NOTICE } from '@/lib/lotto/constants';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(name) ? [p] : [];
  });
}

const FORBIDDEN: Array<[RegExp, string]> = [
  [/확률\s*[:은는이가]?\s*\d+(\.\d+)?\s*%/, '확률 n%'],
  [/\d+(\.\d+)?\s*%\s*(의\s*)?(당첨|확률)/, 'n% 당첨/확률'],
  [/당첨\s*확률/, '"당첨 확률" 표현'],
  [/당첨\s*률|적중\s*률/, '당첨률/적중률'],
  [/당첨\s*보장|필승|100\s*%\s*당첨/, '당첨 보장류 표현'],
];

describe('법적 문구 가드', () => {
  const sources = files('src').map((f) => [f, readFileSync(f, 'utf8')] as const);

  it.each(FORBIDDEN)('금지 표현 없음: %s', (re) => {
    const hits = sources.flatMap(([f, text]) =>
      text.split('\n').flatMap((line, i) => (re.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it('고지 문구가 요구사항과 같다', () => {
    expect(DISCLAIMER).toBe('본 앱은 통계 참고 도구이며 당첨을 보장하지 않습니다');
    expect(ODDS_NOTICE).toContain('1/8,145,060');
  });

  it('품질 점수 화면은 "품질 점수"로 표기한다', () => {
    const report = readFileSync('src/components/quality/QualityReport.tsx', 'utf8');
    expect(report).toContain('품질 점수');
  });
});
