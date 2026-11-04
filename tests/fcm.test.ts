import { describe, expect, it } from 'vitest';
import { base64url, buildFcmMessage, createSignedJwt, readServiceAccount } from '../supabase/functions/_shared/fcm';

async function makeServiceAccount() {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;
  return { sa: { project_id: 'zzolgit', client_email: 'push@zzolgit.iam.gserviceaccount.com', private_key: pem }, publicKey };
}

describe('FCM', () => {
  it('서비스 계정으로 RS256 JWT 를 서명하고 공개키로 검증된다', async () => {
    const { sa, publicKey } = await makeServiceAccount();
    const jwt = await createSignedJwt(sa, 1_800_000_000);
    const [h, c, sig] = jwt.split('.');
    const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(claims).toMatchObject({ iss: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: 1_800_000_000, exp: 1_800_003_600 });
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, Buffer.from(sig, 'base64url'), new TextEncoder().encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });

  it('JSON 에 이스케이프된 줄바꿈(\\n)이 있는 키도 처리', async () => {
    const { sa } = await makeServiceAccount();
    const raw = JSON.stringify(sa); // private_key 의 개행이 \n 으로 직렬화됨
    const parsed = readServiceAccount(raw)!;
    await expect(createSignedJwt(parsed)).resolves.toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(readServiceAccount('{"oops":1}')).toBeNull();
  });

  it('메시지: 알림 + 이동 경로, https 앱 주소가 있을 때만 웹 링크', () => {
    const m = buildFcmMessage('tok', { title: 't', body: 'b', url: '/logs', tag: 'x' }, 'https://zzolgit.app');
    expect(m.message.data).toEqual({ url: '/logs', tag: 'x' });
    expect(m.message.webpush.fcm_options).toEqual({ link: 'https://zzolgit.app/logs' });
    expect('fcm_options' in buildFcmMessage('tok', { title: 't', body: 'b', url: '/' }).message.webpush).toBe(false);
  });

  it('base64url', () => {
    expect(base64url('ab?>')).toBe('YWI_Pg');
  });
});
