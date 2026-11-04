/**
 * 사진 처리 유틸 (브라우저 전용).
 * 사진은 기기 메모리 안에서만 다루고, 서버로 보내거나 저장하지 않습니다.
 */

/** 세로 비율 구간 (0~1). 예: 상단 40% → { from: 0, to: 0.4 } */
export interface Band {
  from: number;
  to: number;
}

/** 파일 → 긴 변 maxSide 이하로 줄인 캔버스 (EXIF 회전은 <img> 디코딩이 반영) */
export async function fileToCanvas(file: Blob, maxSide = 2000): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 세로 구간을 잘라 너비 maxWidth 이하로 맞춘 새 캔버스 */
export function cropBand(src: HTMLCanvasElement, band: Band, maxWidth = src.width): HTMLCanvasElement {
  const sy = Math.round(src.height * band.from);
  const sh = Math.max(1, Math.round(src.height * (band.to - band.from)));
  const scale = Math.min(1, maxWidth / src.width);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(src.width * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, sy, src.width, sh, 0, 0, out.width, out.height);
  return out;
}

/** 확대 (작은 글씨 OCR 정확도 향상) */
export function upscale(src: HTMLCanvasElement, minWidth: number): HTMLCanvasElement {
  if (src.width >= minWidth) return src;
  const scale = minWidth / src.width;
  const out = document.createElement('canvas');
  out.width = Math.round(src.width * scale);
  out.height = Math.round(src.height * scale);
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/** 흑백 + Otsu 이진화 (감열지 영수증의 흐린 글씨 대비 강화) */
export function binarize(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const gray = new Uint8ClampedArray(d.length / 4);
  const hist = new Array<number>(256).fill(0);
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    gray[p] = g;
    hist[gray[p]] += 1;
  }
  const threshold = otsu(hist, gray.length);
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    const v = gray[p] > threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function otsu(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}
