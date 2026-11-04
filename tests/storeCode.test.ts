import { describe, expect, it } from 'vitest';
import { extractStoreCode } from '@/lib/scan/storeCode';

describe('판매점 코드 추출', () => {
  it('키워드가 있는 줄의 7자리를 우선', () => {
    const text = '금액 5000\n발행 1234567\n판매점 : 1100101\n';
    expect(extractStoreCode(text)).toBe('1100101');
  });

  it('OCR 혼동 문자 보정 (O→0, l→1, S→5)', () => {
    expect(extractStoreCode('STORE l1OO1O5')).toBe('1100105');
  });

  it('더 긴 숫자열(바코드)의 일부는 제외', () => {
    expect(extractStoreCode('37588224108126257396\n7654321')).toBe('7654321');
  });

  it('공백으로 끊긴 숫자 이어 붙이기', () => {
    expect(extractStoreCode('No 110 0101')).toBe('1100101');
  });

  it('날짜·시간은 후보가 아님', () => {
    expect(extractStoreCode('2026/10/31 15:20:37')).toBeNull();
  });

  it('없으면 null', () => {
    expect(extractStoreCode('Lotto 6/45')).toBeNull();
  });
});

import { estimatePurchaseDate } from '@/lib/scan/purchaseDate';

describe('구매 시각 추정', () => {
  const now = new Date('2026-11-04T18:00:00+09:00');

  it('OCR 발행일시가 회차와 맞으면 사용', () => {
    const r = estimatePurchaseDate(1248, '발행일 : 2026/10/31 (토) 15:20:37', now);
    expect(r).toEqual({ iso: new Date('2026-10-31T15:20:37+09:00').toISOString(), estimated: false });
  });

  it('이번 회차 티켓이면 지금', () => {
    expect(estimatePurchaseDate(1249, '', now)).toEqual({ iso: now.toISOString(), estimated: false });
  });

  it('지난 회차면 추첨일 정오로 추정', () => {
    const r = estimatePurchaseDate(1247, '', now);
    expect(r.estimated).toBe(true);
    expect(r.iso).toBe(new Date('2026-10-24T12:00:00+09:00').toISOString());
  });
});
