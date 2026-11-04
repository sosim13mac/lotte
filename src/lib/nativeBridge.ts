/**
 * Flutter WebView 래핑 대비 브리지.
 *
 * - 웹 → 앱: Flutter 쪽에서 JavaScriptChannel 'ZzolgitNative' 를 등록하면
 *   window.ZzolgitNative.postMessage(JSON 문자열) 로 메시지를 보냅니다.
 * - 앱 → 웹: 앱이 `window.dispatchEvent(new CustomEvent('zzolgit-native', { detail }))` 를 실행합니다.
 *
 * 메시지 종류
 * - { type: 'google-sign-in' }                         웹 → 앱: 네이티브 구글 로그인 요청
 *   (구글은 WebView 안 OAuth 를 차단하므로 앱에서 로그인 후 ID 토큰을 돌려받습니다)
 * - { type: 'google-id-token', idToken, nonce? }       앱 → 웹
 * - { type: 'push-token', token, platform }            앱 → 웹: 네이티브 FCM 토큰
 */
export type NativeMessage =
  | { type: 'google-sign-in' }
  | { type: 'google-id-token'; idToken: string; nonce?: string }
  | { type: 'google-sign-in-error'; message: string }
  | { type: 'push-token'; token: string; platform: 'android' | 'ios' }
  | { type: 'request-push-token' };

interface NativeChannel {
  postMessage(message: string): void;
}

declare global {
  interface Window {
    ZzolgitNative?: NativeChannel;
  }
}

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && typeof window.ZzolgitNative?.postMessage === 'function';
}

export function postToNative(message: NativeMessage): boolean {
  if (!isNativeApp()) return false;
  window.ZzolgitNative!.postMessage(JSON.stringify(message));
  return true;
}

export function onNativeMessage(handler: (message: NativeMessage) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const message = typeof detail === 'string' ? safeParse(detail) : detail;
    if (message && typeof message.type === 'string') handler(message as NativeMessage);
  };
  window.addEventListener('zzolgit-native', listener);
  return () => window.removeEventListener('zzolgit-native', listener);
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
