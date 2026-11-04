'use client';

import { QualityChip } from '@/components/quality/QualityChip';
import { TicketScanner } from '@/components/scan/TicketScanner';

/** 티켓 사진 등록 + 등록된 게임별 품질 평가 */
export function HomeScanSection() {
  return <TicketScanner renderGameExtra={(game, index) => <QualityChip game={game} defaultOpen={index === 0} />} />;
}
