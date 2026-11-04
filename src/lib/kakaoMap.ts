/** 카카오맵 SDK 로더. Kakao Developers > 앱 > 플랫폼 > Web 에 사이트 도메인을 등록해야 동작합니다. */
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

let loading: Promise<typeof kakao.maps> | null = null;

export function loadKakaoMaps(): Promise<typeof kakao.maps> {
  if (!KAKAO_JS_KEY) return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY 가 없어요'));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao.maps);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&autoload=false`;
    script.async = true;
    script.onload = () => (window.kakao ? window.kakao.maps.load(() => resolve(window.kakao!.maps)) : reject(new Error('카카오맵 SDK 오류')));
    script.onerror = () => {
      loading = null;
      reject(new Error('카카오맵을 불러오지 못했어요'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
