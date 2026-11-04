import type jsQRType from 'jsqr';
import { cropBand, type Band } from './image';

/** 브라우저 BarcodeDetector (Shape Detection API) 최소 타입 */
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

let nativeDetector: Promise<BarcodeDetectorLike | null> | null = null;

/** 지원 브라우저(Android Chrome, Safari 17+ 등)에서만 네이티브 감지기 사용 */
function getNativeDetector(): Promise<BarcodeDetectorLike | null> {
  nativeDetector ??= (async () => {
    const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Ctor) return null;
    try {
      const formats = (await Ctor.getSupportedFormats?.()) ?? ['qr_code'];
      if (!formats.includes('qr_code')) return null;
      return new Ctor({ formats: ['qr_code'] });
    } catch {
      return null;
    }
  })();
  return nativeDetector;
}

let jsQRModule: Promise<typeof jsQRType> | null = null;
const loadJsQR = () => (jsQRModule ??= import('jsqr').then((m) => m.default));

async function detectOnCanvas(canvas: HTMLCanvasElement, thorough: boolean): Promise<string | null> {
  const native = await getNativeDetector();
  if (native) {
    try {
      const found = await native.detect(canvas);
      if (found[0]?.rawValue) return found[0].rawValue;
    } catch {
      // 일부 기기에서 실패 → jsQR 로 계속
    }
  }
  const jsQR = await loadJsQR();
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(data, width, height, { inversionAttempts: thorough ? 'attemptBoth' : 'dontInvert' });
  return code?.data || null;
}

/**
 * QR 디텍트: 지정 구간(기본 상단 40%)을 여러 해상도로 시도 → 실패하면 사진 전체.
 * 반환: QR 원문 텍스트
 */
export async function detectTicketQr(photo: HTMLCanvasElement, band: Band = { from: 0, to: 0.4 }): Promise<string | null> {
  const attempts: Array<{ band: Band; width: number; thorough: boolean }> = [
    { band, width: 1000, thorough: false },
    { band, width: 1600, thorough: true },
    { band, width: 700, thorough: true },
    { band: { from: 0, to: 1 }, width: 1200, thorough: true },
  ];
  for (const a of attempts) {
    const text = await detectOnCanvas(cropBand(photo, a.band, a.width), a.thorough);
    if (text) return text;
  }
  return null;
}
