import { describe, expect, it } from 'vitest';
import { parseLottoQr } from '@/lib/lotto/qr';

describe('로또 QR 파싱', () => {
  it('URL 형식, 5게임 + 일련번호', () => {
    const r = parseLottoQr(
      'http://m.dhlottery.co.kr/?v=0912q041016182632q031014213742m030810141844q040718283538s0107091532371434117808',
    );
    expect(r).not.toBeNull();
    expect(r!.round).toBe(912);
    expect(r!.games).toEqual([
      [4, 10, 16, 18, 26, 32],
      [3, 10, 14, 21, 37, 42],
      [3, 8, 10, 14, 18, 44],
      [4, 7, 18, 28, 35, 38],
      [1, 7, 9, 15, 32, 37],
    ]);
  });

  it('qr.do?method=winQr 형식, 번호가 정렬되지 않아도 정렬해서 반환', () => {
    const r = parseLottoQr('https://m.dhlottery.co.kr/qr.do?method=winQr&v=1248m421203193328q0102030405061234567890');
    expect(r!.round).toBe(1248);
    expect(r!.games[0]).toEqual([3, 12, 19, 28, 33, 42]);
    expect(r!.games).toHaveLength(2);
  });

  it('빈 줄(000000000000)은 건너뜀', () => {
    const r = parseLottoQr('?v=1248q010203040506n0000000000001234');
    expect(r!.games).toEqual([[1, 2, 3, 4, 5, 6]]);
  });

  it('잘못된 번호(46, 중복)는 거부', () => {
    expect(parseLottoQr('?v=1248q010203040546')).toBeNull();
    expect(parseLottoQr('?v=1248q010203040505')).toBeNull();
  });

  it('로또 QR 이 아니면 null', () => {
    expect(parseLottoQr('https://example.com')).toBeNull();
    expect(parseLottoQr('')).toBeNull();
    expect(parseLottoQr('?v=1248')).toBeNull();
  });
});
