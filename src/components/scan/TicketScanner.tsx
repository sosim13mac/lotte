'use client';

import { Camera, ImagePlus, Lock, PencilLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ManualTicketForm, type FallbackReason, type TicketDraft } from '@/components/scan/ManualTicketForm';
import { SavedTicketCard } from '@/components/scan/SavedTicketCard';
import { ScanProgress } from '@/components/scan/ScanProgress';
import { DuplicateTicketError, getRepo, type Ticket } from '@/lib/repo';
import { estimatePurchaseDate } from '@/lib/scan/purchaseDate';
import type { ScanStage } from '@/lib/scan/scanTicket';
import { useAppStore } from '@/store/useAppStore';

type Phase =
  | { kind: 'idle' }
  | { kind: 'processing'; stage: ScanStage; progress?: number }
  | { kind: 'saved'; ticket: Ticket; auto: boolean; estimatedDate?: boolean }
  | { kind: 'fallback'; reason: FallbackReason; draft?: TicketDraft }
  | { kind: 'error'; message: string };

/**
 * 티켓 사진 업로드 → QR(상단 40%) + 판매점 코드 OCR(하단 30%) → 성공 시 자동 저장, 실패 시 수동 입력.
 * 사진은 브라우저 메모리에서만 처리하고 어디에도 업로드·저장하지 않습니다.
 */
export function TicketScanner({
  renderGameExtra,
}: {
  /** 저장된 티켓의 게임별 부가 정보 (품질 점수 등) */
  renderGameExtra?: (game: number[], index: number) => React.ReactNode;
}) {
  const addTicket = useAppStore((s) => s.addTicket);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // 홈 화면 바로가기(/?scan=1) 로 들어오면 스캐너로 스크롤
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('scan') === '1') {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPhase({ kind: 'processing', stage: 'loading' });
    try {
      const { scanTicketPhoto } = await import('@/lib/scan/scanTicket');
      const result = await scanTicketPhoto(file, (stage, progress) => setPhase({ kind: 'processing', stage, progress }));

      if (!result.qr) {
        setPhase({ kind: 'fallback', reason: 'qr', draft: { storeCode: result.storeCode } });
        return;
      }

      const { round, games, raw } = result.qr;
      const purchase = estimatePurchaseDate(round, result.ocrText);
      const store = result.storeCode ? await getRepo().findStore(result.storeCode).catch(() => null) : null;
      const draft: TicketDraft = {
        round,
        games,
        qrRaw: raw,
        purchaseDate: purchase.iso,
        storeCode: result.storeCode,
        storeName: store?.name ?? null,
      };

      if (!result.storeCode) {
        setPhase({ kind: 'fallback', reason: 'store', draft });
        return;
      }

      // QR + 판매점 코드 모두 성공 → 자동 저장 (amount = 게임 수 x 1,000원)
      const ticket = await addTicket({
        round,
        games,
        qr_raw: raw,
        purchase_date: purchase.iso,
        store_code: result.storeCode,
        store_name: store?.name ?? null,
      });
      setPhase({ kind: 'saved', ticket, auto: true, estimatedDate: purchase.estimated });
    } catch (e) {
      if (e instanceof DuplicateTicketError) setPhase({ kind: 'error', message: '이미 등록된 티켓이에요. 티켓로그에서 확인해 보세요.' });
      else setPhase({ kind: 'error', message: e instanceof Error ? e.message : '사진을 처리하지 못했어요' });
    } finally {
      if (cameraRef.current) cameraRef.current.value = '';
      if (albumRef.current) albumRef.current.value = '';
    }
  }

  const reset = () => setPhase({ kind: 'idle' });

  return (
    <section ref={sectionRef} id="scan" className="card scroll-mt-4">
      <div className="mb-4">
        <h2 className="section-title">티켓 등록 · 품질 평가</h2>
        <p className="mt-1 text-sm text-fog-300">사진 한 장이면 QR과 판매점 코드를 읽어 자동 저장하고, 번호 품질도 평가해요.</p>
      </div>

      {phase.kind === 'idle' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-gold h-20 flex-col gap-1" onClick={() => cameraRef.current?.click()}>
              <Camera className="h-6 w-6" />
              촬영하기
            </button>
            <button className="btn-ghost h-20 flex-col gap-1" onClick={() => albumRef.current?.click()}>
              <ImagePlus className="h-6 w-6" />
              앨범에서 선택
            </button>
          </div>
          <button
            className="mt-3 flex w-full items-center justify-center gap-1 text-sm text-fog-300 hover:text-fog"
            onClick={() => setPhase({ kind: 'fallback', reason: 'manual' })}
          >
            <PencilLine className="h-4 w-4" /> 번호 직접 입력
          </button>
        </>
      )}

      {phase.kind === 'processing' && <ScanProgress stage={phase.stage} progress={phase.progress} />}

      {phase.kind === 'saved' && (
        <SavedTicketCard ticket={phase.ticket} auto={phase.auto} estimatedDate={phase.estimatedDate} onAgain={reset}>
          {renderGameExtra}
        </SavedTicketCard>
      )}

      {phase.kind === 'fallback' && (
        <ManualTicketForm
          draft={phase.draft}
          reason={phase.reason}
          onCancel={reset}
          onSaved={(ticket) => setPhase({ kind: 'saved', ticket, auto: false })}
        />
      )}

      {phase.kind === 'error' && (
        <div className="space-y-3">
          <p role="alert" className="rounded-2xl bg-gain/10 px-4 py-3 text-sm text-gain">
            {phase.message}
          </p>
          <button className="btn-ghost w-full" onClick={reset}>
            다시 하기
          </button>
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-1 text-[11px] text-fog-500">
        <Lock className="h-3 w-3" /> 사진은 기기 안에서만 분석하고 저장하지 않아요 (QR 텍스트·판매점 코드만 저장)
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="scan-camera"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={albumRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="scan-album"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </section>
  );
}
