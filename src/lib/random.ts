/** 0 이상 1 미만 난수를 돌려주는 함수 (테스트에서 시드 고정용으로 주입) */
export type Rng = () => number;

/** 시드 고정 PRNG (mulberry32) */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 가능하면 crypto.getRandomValues 를 쓰는 기본 난수 */
export function defaultRng(): Rng {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(1024);
    let i = buf.length;
    return () => {
      if (i >= buf.length) {
        c.getRandomValues(buf);
        i = 0;
      }
      return buf[i++] / 4294967296;
    };
  }
  return Math.random;
}

/** [0, n) 정수 */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** 1..max 중 서로 다른 k 개 (정렬) */
export function pickNumbers(rng: Rng, k = 6, max = 45, include: readonly number[] = []): number[] {
  const chosen = new Set(include);
  while (chosen.size < k) chosen.add(randInt(rng, max) + 1);
  return [...chosen].sort((a, b) => a - b);
}
