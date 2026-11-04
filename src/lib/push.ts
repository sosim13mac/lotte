/**
 * FCM 푸시 등록.
 * - 웹(PWA): Firebase JS SDK 로 토큰 발급 → public/sw.js 가 push 이벤트를 받아 알림 표시
 * - Flutter 앱: 네이티브 FCM 토큰을 브리지(push-token)로 받아 등록
 */
import { IS_DEMO } from '@/lib/env';
import { isNativeApp, onNativeMessage, postToNative } from '@/lib/nativeBridge';
import { ensureNotificationPermission } from '@/lib/notify';
import { getRepo } from '@/lib/repo';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const TOKEN_KEY = 'zzolgit:push-token';

export const PUSH_CONFIGURED = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && VAPID_KEY,
);

export interface PushResult {
  ok: boolean;
  message?: string;
}

function remember(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 무시
  }
}

/** 네이티브 앱에 FCM 토큰 요청 */
function nativeToken(timeoutMs = 15_000): Promise<{ token: string; platform: 'android' | 'ios' }> {
  return new Promise((resolve, reject) => {
    const off = onNativeMessage((m) => {
      if (m.type !== 'push-token') return;
      off();
      clearTimeout(timer);
      resolve({ token: m.token, platform: m.platform });
    });
    const timer = setTimeout(() => {
      off();
      reject(new Error('앱에서 푸시 토큰을 받지 못했어요'));
    }, timeoutMs);
    postToNative({ type: 'request-push-token' });
  });
}

export async function enablePush(): Promise<PushResult> {
  try {
    if (isNativeApp()) {
      const { token, platform } = await nativeToken();
      await getRepo().registerPushToken(token, platform);
      remember(token);
      return { ok: true };
    }
    if (!(await ensureNotificationPermission())) return { ok: false, message: '알림 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.' };
    if (IS_DEMO) return { ok: true, message: '데모 모드: 알림 권한만 확인했어요' };
    if (!PUSH_CONFIGURED) return { ok: false, message: 'FCM 설정(NEXT_PUBLIC_FIREBASE_*)이 없어요' };

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const { getApps, initializeApp } = await import('firebase/app');
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) {
      return { ok: false, message: '이 브라우저는 웹 푸시를 지원하지 않아요 (iPhone 은 홈 화면에 추가한 뒤 가능)' };
    }
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    await getRepo().registerPushToken(token, 'web');
    remember(token);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '푸시를 켜지 못했어요' };
  }
}

/** 앱이 먼저 토큰을 보내주는 경우(앱 시작 시) 자동 등록 */
export function listenNativePushToken(): () => void {
  return onNativeMessage((m) => {
    if (m.type === 'push-token') {
      remember(m.token);
      void getRepo().registerPushToken(m.token, m.platform).catch(() => undefined);
    }
  });
}
