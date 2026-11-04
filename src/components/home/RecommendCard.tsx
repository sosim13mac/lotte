'use client';

import { Cake, Copy, Dices, Moon, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Ball } from '@/components/lotto/Ball';
import { cn } from '@/lib/cn';
import { birthdayNumber } from '@/lib/lotto/birthday';
import { GAME_LABELS } from '@/lib/lotto/constants';
import { matchDream } from '@/lib/lotto/dream';
import { evaluateQuality } from '@/lib/lotto/quality';
import type { RecommendResult } from '@/lib/lotto/recommend';
import { runRecommend } from '@/lib/lotto/runRecommend';
import { selectRecentWinningNumbers, useAppStore } from '@/store/useAppStore';

const DREAM_SUGGESTIONS = ['돼지', '용', '똥', '조상', '물', '돈', '호랑이', '불'];

const compact = (n: number) => (n >= 10_000 ? `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}만` : n.toLocaleString('ko-KR'));

/** 개인화 추천: 생일수 + 꿈 키워드로 이유를 붙인 랜덤 5게임 */
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

  const bday = profile?.birth_date ? birthdayNumber(profile.birth_date) : null;
  const dream = useMemo(() => matchDream(dreamText, dreamMap), [dreamText, dreamMap]);
  const recent = useMemo(() => selectRecentWinningNumbers({ draws, recentRounds }), [draws, recentRounds]);

  async function draw() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const started = Date.now();
      const r = await runRecommend({ birthDate: profile?.birth_date ?? null, dreamText, dreamMap });
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
        <p className="mt-1 text-sm text-fog-300">랜덤이지만, 번호마다 이유를 붙여드려요.</p>
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
          ? `'${dream.keyword}' 행운수 ${dream.numbers.join('·')} 중 하나를 꼭 넣을게요`
          : dreamText
            ? '매칭되는 꿈 키워드가 없어요. 생일수와 통계 필터만 적용돼요'
            : ''}
      </p>

      <button className="btn-gold mt-2 w-full" onClick={draw} disabled={busy}>
        {busy ? (
          '100만 개 조합 굴리는 중…'
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
                  <div className="mt-2 flex flex-wrap gap-1 pl-6">
                    {g.tags.map((t) => (
                      <span key={t} className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-fog-300">
                        #{t}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="num text-center text-[11px] text-fog-500">
            {compact(result.sampled)}개 조합 생성 → 필터 통과 {compact(result.passedFilters)} → 생일수·꿈 조건{' '}
            {compact(result.candidates)}개 중 5게임
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
