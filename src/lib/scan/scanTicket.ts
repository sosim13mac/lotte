import { parseLottoQr, type ParsedLottoQr } from '@/lib/lotto/qr';
import { fileToCanvas } from './image';
import { readStoreCode } from './ocr';
import { detectTicketQr } from './qr';

export type ScanStage = 'loading' | 'qr' | 'ocr' | 'done';

export interface ScanResult {
  /** 파싱된 QR (회차 + 게임). 못 읽었으면 null */
  qr: ParsedLottoQr | null;
  /** QR 은 읽혔지만 로또 형식이 아닐 때 원문 */
  qrText: string | null;
  storeCode: string | null;
  ocrText: string;
}

/** 티켓 사진 1장 → QR(상단 40%) + 판매점 코드 OCR(하단 30%). 사진은 메모리에서만 처리하고 버립니다. */
export async function scanTicketPhoto(
  file: Blob,
  onStage?: (stage: ScanStage, progress?: number) => void,
): Promise<ScanResult> {
  onStage?.('loading');
  const photo = await fileToCanvas(file);

  onStage?.('qr');
  const qrText = await detectTicketQr(photo, { from: 0, to: 0.4 });
  const qr = parseLottoQr(qrText);

  onStage?.('ocr', 0);
  let storeCode: string | null = null;
  let ocrText = '';
  try {
    const ocr = await readStoreCode(photo, { from: 0.7, to: 1 }, (p) => onStage?.('ocr', p));
    storeCode = ocr.storeCode;
    ocrText = ocr.text;
  } catch (e) {
    console.warn('[scan] OCR 실패', e);
  }

  // 캔버스 메모리 해제
  photo.width = 0;
  photo.height = 0;

  onStage?.('done');
  return { qr, qrText, storeCode, ocrText };
}
