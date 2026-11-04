import { recommend, type RecommendInput, type RecommendResult } from './recommend';

type WorkerReply = { ok: true; result: RecommendResult } | { ok: false; error: string };

/** Web Worker 에서 추천 실행 (지원하지 않으면 메인 스레드) */
export function runRecommend(input: RecommendInput, samples = 1_000_000): Promise<RecommendResult> {
  if (typeof Worker === 'undefined') {
    return new Promise((resolve) => setTimeout(() => resolve(recommend(input, { samples })), 0));
  }
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./recommend.worker.ts', import.meta.url));
    } catch {
      resolve(recommend(input, { samples }));
      return;
    }
    worker.onmessage = (e: MessageEvent<WorkerReply>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.result);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || '추천 계산에 실패했어요'));
    };
    worker.postMessage({ input, samples });
  });
}
