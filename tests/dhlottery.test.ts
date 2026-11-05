import { describe, expect, it } from 'vitest';
import { normalizeStoreCode, parseDrawJson, parseTopStores } from '@/lib/crawler/dhlottery';

const drawJson = {
  resultCode: null,
  resultMessage: null,
  data: {
    list: [
      {
        ltEpsd: 1248,
        tm1WnNo: 42,
        tm2WnNo: 16,
        tm3WnNo: 27,
        tm4WnNo: 18,
        tm5WnNo: 38,
        tm6WnNo: 36,
        bnsWnNo: 22,
        ltRflYmd: '20261031',
        rnk1WnAmt: 1933658450,
        rnk2WnAmt: 53122485,
        rnk3WnAmt: 1480597,
        rnk4WnAmt: 50000,
        rnk5WnAmt: 5000,
      },
      { ltEpsd: 1247, tm1WnNo: 8, tm2WnNo: 14, tm3WnNo: 21, tm4WnNo: 22, tm5WnNo: 42, tm6WnNo: 45, bnsWnNo: 24, ltRflYmd: '20261024', rnk1WnAmt: 1 },
    ],
  },
};

describe('당첨번호 JSON (selectPstLt645Info)', () => {
  it('요청한 회차만 골라 번호를 정렬하고 날짜·당첨금을 읽는다', () => {
    expect(parseDrawJson(drawJson, 1248)).toEqual({
      round: 1248,
      drawDate: '2026-10-31',
      numbers: [16, 18, 27, 36, 38, 42],
      bonus: 22,
      prizes: [1933658450, 53122485, 1480597, 50000, 5000],
    });
  });

  it('목록에 없는 회차(추첨 전)·빈 응답·HTML 은 null', () => {
    expect(parseDrawJson(drawJson, 1300)).toBeNull();
    expect(parseDrawJson({ data: { list: [] } }, 1248)).toBeNull();
    expect(parseDrawJson(null, 1248)).toBeNull();
  });

  it('번호가 비정상이면 null (중복, 범위 밖, 보너스가 본번호와 같음)', () => {
    const bad = (patch: Record<string, unknown>) => ({ data: { list: [{ ...drawJson.data.list[0], ...patch }] } });
    expect(parseDrawJson(bad({ tm1WnNo: 16 }), 1248)).toBeNull();
    expect(parseDrawJson(bad({ tm1WnNo: 46 }), 1248)).toBeNull();
    expect(parseDrawJson(bad({ bnsWnNo: 16 }), 1248)).toBeNull();
    expect(parseDrawJson(bad({ ltRflYmd: '' }), 1248)).toBeNull();
  });

  it('당첨금이 비어 있으면 해당 등수만 null', () => {
    const r = parseDrawJson({ data: { list: [{ ...drawJson.data.list[0], rnk2WnAmt: null, rnk3WnAmt: '' }] } }, 1248);
    expect(r?.prizes).toEqual([1933658450, null, null, 50000, 5000]);
  });
});

describe('1·2등 배출점 JSON (selectLtWnShp)', () => {
  const stores = {
    data: {
      total: 4,
      list: [
        { wnShpRnk: 1, ltShpId: '11100959', shpNm: '로또킹', shpAddr: '서울 영등포구 영중로 2 1층', shpLat: 37.516741, shpLot: 126.90673 },
        { wnShpRnk: 1, ltShpId: '51100000', shpNm: '인터넷 복권판매사이트', shpAddr: '동행복권(dhlottery.co.kr)', shpLat: 37.48, shpLot: 127.01 },
        { wnShpRnk: 2, ltShpId: '11100558', shpNm: '묵동식품', shpAddr: '서울 중랑구 동일로 919', shpLat: null, shpLot: null },
        { wnShpRnk: 3, ltShpId: '11100001', shpNm: '3등은 제외', shpAddr: '-' },
      ],
    },
  };

  it('1·2등만, 온라인 판매사이트는 제외하고 좌표를 읽는다', () => {
    expect(parseTopStores(stores)).toEqual([
      { rank: 1, id: '11100959', name: '로또킹', address: '서울 영등포구 영중로 2 1층', lat: 37.516741, lng: 126.90673 },
      { rank: 2, id: '11100558', name: '묵동식품', address: '서울 중랑구 동일로 919', lat: null, lng: null },
    ]);
  });

  it('빈 응답은 빈 배열', () => {
    expect(parseTopStores(null)).toEqual([]);
    expect(parseTopStores({ data: {} })).toEqual([]);
  });

  it('판매점 코드는 숫자 7~8자리만 (형식이 다르면 null → 원본 ID 만 기록)', () => {
    expect(normalizeStoreCode('1100101')).toBe('1100101');
    expect(normalizeStoreCode('11100959')).toBe('11100959');
    expect(normalizeStoreCode('123456')).toBeNull();
    expect(normalizeStoreCode('211002451')).toBeNull();
  });
});
