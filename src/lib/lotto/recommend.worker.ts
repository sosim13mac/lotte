/// 개인화 추천을 메인 스레드 밖에서 실행 (100만 개 조합 생성)
import { recommend, type RecommendInput } from './recommend';

self.onmessage = (event: MessageEvent<{ input: RecommendInput; samples?: number }>) => {
  try {
    const result = recommend(event.data.input, { samples: event.data.samples });
    self.postMessage({ ok: true, result });
  } catch (e) {
    self.postMessage({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
