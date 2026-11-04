import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safeNext';

describe('로그인 후 이동 경로 (오픈 리다이렉트 방지)', () => {
  it('같은 사이트 상대 경로만 허용', () => {
    expect(safeNextPath('/logs')).toBe('/logs');
    expect(safeNextPath('/logs?round=1248')).toBe('/logs?round=1248');
  });
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', null, undefined])('%s → /', (v) => {
    expect(safeNextPath(v)).toBe('/');
  });
});
