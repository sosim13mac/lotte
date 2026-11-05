'use client';

import { BarChart3, Cake, ChevronDown, Copy, Dices, Moon, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Ball } from '@/components/lotto/Ball';
import { cn } from '@/lib/cn';
import { birthdayNumber } from '@/lib/lotto/birthday';
import { GAME_LABELS } from '@/lib/lotto/constants';
import { matchDream } from '@/lib/lotto/dream';
import { sumBucketOf } from '@/lib/lotto/drawStats';
import { evaluateQuality } from '@/lib/lotto/quality';
import type { GameRole, RecommendResult } from '@/lib/lotto/recommend';
import { runRecommend } from '@/lib/lotto/runRecommend';
import { getRepo, type DrawStatsSummary } from '@/lib/repo';
import { selectRecentWinningNumbers, useAppStore } from '@/store/useAppStore';

const DREAM_SUGGESTIONS = ['돼지', '용', '똥', '조상', '물', '돈', '호랑이', '불'];

/** 분포에서 가장 많이 나온 비율 3개: "3:3 389회 · 2:4 301회 · 4:2 280회" (앞 숫자가 홀수/저구간 개수) */
function ratioTop(dist: readonly number[]): string {
  const top = dist
    .map((count, k) => ({ k, count }))
    .sort((a, b) => b.count - a.count || a.k - b.k)
    .slice(0, 3);
  return top.map(({ k, count }) => `${k}:${6 - k} ${count}회`).join(' · ');
}

const compact = (n: number) => (n >= 10_000 ? `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}만` : n.toLocaleString('ko-KR'));

const ROLE_LABEL: Record<GameRole, string> = {
  birthday: '생년월일 기반',
  dream: '꿈 해몽 기반',
  stats: '당첨번호 통계 기반',
  balance: '균형 조합',
};

/** 개인화 추천: 생년월일·꿈·최근 당첨번호 통계를 근거로 구성한 5게임 (게임·번호마다 근거 표시) */
export function RecommendCard() {
  const profile = useAppStore((s) => s.profile);
  const dreamMap = useAppStore((s) => s.dreamMap);
  const draws = useAppStore((s) => s.draws);
  const recentRounds = useAppStore((s) => s.recentRounds);

  const [dreamText, setDreamText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [drawStats, setDrawStats] = useState<DrawStatsSummary | null>(null);

  // 역대 당첨번호의 홀짝·저고·합계·평균 분포 (DB 에 회차마다 기록된 분석 데이터)
  useEffect(() => {
    getRepo()
      .getDrawStats()
      .then(setDrawStats)
      .catch(() => setDrawStats(null));
  }, []);

  const bday = profile?.birth_date ? birthdayNumber(profile.birth_date) : null;
  const dream = useMemo(() => matchDream(dreamText, dreamMap), [dreamText, dreamMap]);
  const recent = useMemo(() => selectRecentWinningNumbers({ draws, recentRounds }), [draws, recentRounds]);

  async function draw() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const started = Date.now();
      const r = await runRecommend({ birthDate: profile?.birth_date ?? null, dreamText, dreamMap, recentDraws: recent });
      // 너무 빨리 끝나도 굴리는 맛은 보여주기
      const wait = 700 - (Date.now() - started);
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : '번호를 뽑지 못했어요');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    const text = result.games.map((g, i) => `${GAME_LABELS[i]}: ${g.numbers.join(' ')}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="card">
      <div className="mb-4">
        <h2 className="section-title">오늘의 쫄깃 번호</h2>
        <p className="mt-1 text-sm text-fog-300">
          {recent.length >= 5
            ? `생년월일과 최근 ${recent.length}회 당첨번호 통계를 분석해 구성해요.`
            : '생년월일과 번호 균형을 분석해 구성해요.'}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-ink-700/60 px-3 py-2.5 text-sm">
        <Cake className="h-4 w-4 text-gold-deep" />
        <span className="text-fog-300">생일수</span>
        <Ball n={bday} hidden={!bday} size="xs" />
        <span className="ml-auto text-xs text-fog-500">(년+월+일) % 45 + 1</span>
      </div>

      <label htmlFor="dream" className="label mt-3 flex items-center gap-1.5">
        <Moon className="h-4 w-4 text-gold-deep" /> 간밤의 꿈 <span className="text-fog-500">(선택)</span>
      </label>
      <input
        id="dream"
        className="input"
        placeholder="예: 황금 돼지꿈 꿨어요"
        value={dreamText}
        maxLength={40}
        onChange={(e) => setDreamText(e.target.value)}
      />
      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
        {DREAM_SUGGESTIONS.map((k) => (
          <button
            key={k}
            type="button"
            className={cn('chip shrink-0', dream?.keyword === k && 'bg-gold/20 text-gold-deep')}
            onClick={() => setDreamText(`${k}꿈`)}
          >
            {k}
          </button>
        ))}
      </div>
      <p className="mt-2 min-h-[20px] text-xs text-fog-400">
        {dream
          ? `'${dream.keyword}' 행운수 ${dream.numbers.join('·')} 를 1~2게임에 반영할게요`
          : dreamText
            ? '매칭되는 꿈 키워드가 없어요. 생년월일과 통계 분석만 적용돼요'
            : ''}
      </p>

      <button className="btn-gold mt-2 w-full" onClick={draw} disabled={busy}>
        {busy ? (
          '100만 개 조합 분석하는 중…'
        ) : result ? (
          <>
            <RotateCcw className="h-4 w-4" /> 다시 뽑기
          </>
        ) : (
          <>
            <Dices className="h-5 w-5" /> 번호 뽑기
          </>
        )}
      </button>

      {busy && (
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="animate-floaty" style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }}>
              <Ball hidden size="sm" />
            </span>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-gain">{error}</p>}

      {result && !busy && (
        <div className="mt-4 space-y-2">
          {result.analysis && (
            <div className="rounded-2xl bg-ink-700/40 p-3 text-xs text-fog-300">
              <p className="flex items-center gap-1.5 font-bold text-fog">
                <BarChart3 className="h-4 w-4 text-gold-deep" /> 분석 근거 · 최근 {result.analysis.window}회 당첨번호
              </p>
              <p className="num mt-1.5">
                자주 나온 번호 <b className="text-fog">{result.analysis.hot.join(' · ')}</b>
              </p>
              <p className="num mt-0.5">
                오래 안 나온 번호 <b className="text-fog">{result.analysis.cold.join(' · ')}</b>
              </p>
              <p className="mt-1.5 text-fog-400">
                {[
                  result.birthdayNumber !== null && `생년월일 수 ${result.birthdayNumber}은 ${result.roleCounts.birthday}게임`,
                  result.dream && `꿈 행운수는 ${result.roleCounts.dream}게임`,
                ]
                  .filter(Boolean)
                  .join(', ')}
                {result.birthdayNumber !== null || result.dream ? '에만 넣고, 나머지는 ' : ''}위 통계를 섞어 구성했어요
              </p>
            </div>
          )}
          {drawStats && (
            <div className="rounded-2xl bg-ink-700/40 p-3 text-xs text-fog-300">
              <p className="flex items-center gap-1.5 font-bold text-fog">
                <BarChart3 className="h-4 w-4 text-gold-deep" /> 역대 {drawStats.total}회 당첨번호 분포
              </p>
              <p className="num mt-1.5">
                홀짝 <b className="text-fog">{ratioTop(drawStats.oddDist)}</b>
              </p>
              <p className="num mt-0.5">
                저고(1~22 / 23~45) <b className="text-fog">{ratioTop(drawStats.lowDist)}</b>
              </p>
              <p className="num mt-0.5">
                합계 평균 <b className="text-fog">{drawStats.sum.avg}</b> (최소 {drawStats.sum.min} ~ 최대 {drawStats.sum.max}) · 번호 평균{' '}
                <b className="text-fog">{drawStats.meanAvg}</b>
              </p>
            </div>
          )}
          <ul className="space-y-2">
            {result.games.map((g, i) => {
              const q = evaluateQuality(g.numbers, recent);
              return (
                <li key={g.numbers.join('-')} className="rounded-2xl bg-ink-700/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center text-xs font-bold text-fog-400">{GAME_LABELS[i]}</span>
                    <div className="flex flex-1 gap-1">
                      {g.numbers.map((n) => (
                        <Ball key={n} n={n} size="sm" />
                      ))}
                    </div>
                    <span className="num shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold-deep">
                      품질 {q.score}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold-deep">{ROLE_LABEL[g.role]}</span>
                    {g.tags.map((t) => (
                      <span key={t} className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-fog-300">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <details className="group mt-2 pl-6">
                    <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-fog-400 hover:text-fog-300">
                      번호별 분석 보기
                      <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                    </summary>
                    <p className="num mt-1.5 text-[11px] text-fog-300">
                      홀 {g.stats.odd} · 짝 {g.stats.even} · 저(1~22) {g.stats.low} · 고(23~45) {g.stats.high} · 합계 {g.stats.sum} · 평균{' '}
                      {(g.stats.sum / 6).toFixed(1)}
                    </p>
                    {drawStats && (
                      <ul className="num mt-1 space-y-0.5 text-[11px] text-fog-400">
                        <li>
                          홀짝 {g.stats.odd}:{g.stats.even} → 역대 {drawStats.oddDist[g.stats.odd]}회
                        </li>
                        <li>
                          저고 {g.stats.low}:{g.stats.high} → 역대 {drawStats.lowDist[g.stats.low]}회
                        </li>
                        <li>
                          합계 {sumBucketOf(drawStats, g.stats.sum).from}~{sumBucketOf(drawStats, g.stats.sum).to} 구간 → 역대{' '}
                          {sumBucketOf(drawStats, g.stats.sum).count}회
                        </li>
                      </ul>
                    )}
                    <ul className="num mt-2 grid grid-cols-1 gap-1 text-[11px] text-fog-300">
                      {g.notes.map(({ n, note }) => (
                        <li key={n} className="flex items-center gap-2">
                          <Ball n={n} size="xs" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
          <p className="num text-center text-[11px] text-fog-500">
            {compact(result.sampled)}개 조합 생성 → 균형 필터 통과 {compact(result.passedFilters)}
            {result.analysis ? ` → 통계 조건 부합 ${compact(result.candidates)}개` : ''} 중 {result.games.length}게임
          </p>
          <button className="btn-ghost btn-sm w-full" onClick={copy}>
            <Copy className="h-4 w-4" /> {copied ? '복사했어요' : '번호 복사'}
          </button>
          <Disclaimer className="pt-1" />
        </div>
      )}
    </section>
  );
}
