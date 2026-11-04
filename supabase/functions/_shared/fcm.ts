/**
 * FCM HTTP v1 발송 (서비스 계정 JWT 를 WebCrypto 로 서명 — Deno / Node 공통, 외부 SDK 없음)
 * 환경변수 FCM_SERVICE_ACCOUNT = Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키(JSON) 내용
 */
export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** 알림을 누르면 열 앱 경로 (예: /logs) */
  url: string;
  tag?: string;
}

const enc = new TextEncoder();

export function base64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === 'string' ? enc.encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Google OAuth 용 RS256 JWT */
export async function createSignedJwt(sa: ServiceAccount, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned));
  return `${unsigned}.${base64url(sig)}`;
}

let cached: { token: string; exp: number } | null = null;

export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createSignedJwt(sa, now),
    }),
  });
  if (!res.ok) throw new Error(`FCM OAuth 실패 ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, exp: now + body.expires_in };
  return body.access_token;
}

/** FCM v1 메시지 본문 (웹·안드로이드·iOS 공통) */
export function buildFcmMessage(token: string, msg: PushMessage, appUrl?: string) {
  const link = appUrl ? new URL(msg.url, appUrl).toString() : undefined;
  return {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      data: { url: msg.url, tag: msg.tag ?? '' },
      webpush: {
        notification: { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: msg.tag },
        ...(link?.startsWith('https://') ? { fcm_options: { link } } : {}),
      },
      android: { priority: 'high', notification: { tag: msg.tag, click_action: 'FLUTTER_NOTIFICATION_CLICK' } },
      apns: { payload: { aps: { sound: 'default' } } },
    },
  };
}

export type SendResult = 'ok' | 'invalid-token' | 'error';

export async function sendPush(sa: ServiceAccount, token: string, msg: PushMessage, appUrl?: string): Promise<SendResult> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await getAccessToken(sa)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildFcmMessage(token, msg, appUrl)),
  });
  if (res.ok) return 'ok';
  const text = await res.text();
  // 앱 삭제/토큰 만료 → DB 에서 지워야 함
  if (res.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(text)) return 'invalid-token';
  console.warn('[fcm]', res.status, text.slice(0, 200));
  return 'error';
}

export function readServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    return sa.project_id && sa.client_email && sa.private_key ? sa : null;
  } catch {
    return null;
  }
}
