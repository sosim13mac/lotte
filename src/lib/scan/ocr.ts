import type { Worker } from 'tesseract.js';
import { binarize, cropBand, upscale, type Band } from './image';
import { extractStoreCode } from './storeCode';

/** Tesseract 자산은 scripts/copy-tesseract-assets.mjs 가 public/tesseract 에 복사 (CDN 미사용) */
const TESSERACT_BASE = '/tesseract';

type ProgressListener = (progress: number) => void;
const listeners = new Set<ProgressListener>();

let workerPromise: Promise<Worker> | null = null;

/** OCR 워커 (한 번 만들어 재사용) */
export function getOcrWorker(): Promise<Worker> {
  workerPromise ??= (async () => {
    const { createWorker, OEM, PSM } = await import('tesseract.js');
    const worker = await createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: `${TESSERACT_BASE}/worker.min.js`,
      corePath: `${TESSERACT_BASE}/core`,
      langPath: `${TESSERACT_BASE}/lang`,
      gzip: true,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') listeners.forEach((l) => l(m.progress));
      },
    });
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });
    return worker;
  })().catch((e) => {
    workerPromise = null;
    throw e;
  });
  return workerPromise;
}

export async function terminateOcrWorker() {
  const p = workerPromise;
  workerPromise = null;
  if (p) await (await p).terminate().catch(() => undefined);
}

async function recognize(canvas: HTMLCanvasElement, onProgress?: ProgressListener): Promise<string> {
  const worker = await getOcrWorker();
  if (onProgress) listeners.add(onProgress);
  try {
    const { data } = await worker.recognize(canvas);
    return data.text ?? '';
  } finally {
    if (onProgress) listeners.delete(onProgress);
  }
}

export interface StoreCodeOcrResult {
  storeCode: string | null;
  text: string;
}

/**
 * 판매점 코드 OCR: 지정 구간(기본 하단 30%) → 못 찾으면 사진 전체를 한 번 더.
 */
export async function readStoreCode(
  photo: HTMLCanvasElement,
  band: Band = { from: 0.7, to: 1 },
  onProgress?: ProgressListener,
): Promise<StoreCodeOcrResult> {
  const first = binarize(upscale(cropBand(photo, band, 1600), 1200));
  const text = await recognize(first, onProgress);
  const storeCode = extractStoreCode(text);
  if (storeCode) return { storeCode, text };

  const whole = binarize(upscale(cropBand(photo, { from: 0, to: 1 }, 1400), 1000));
  const text2 = await recognize(whole, onProgress);
  return { storeCode: extractStoreCode(text2), text: `${text}\n${text2}` };
}
