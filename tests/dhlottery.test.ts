import { describe, expect, it } from 'vitest';
import { normalizeStoreCode, parseDrawJson, parsePrizeTable, parseTopStores } from '../supabase/functions/_shared/dhlottery';
import { latestDrawnRound } from '../supabase/functions/_shared/round';
import { latestDrawnRound as appLatest } from '@/lib/lotto/round';

describe('당첨번호 JSON', () => {
  it('성공 응답 파싱 (번호 정렬)', () => {
    const r = parseDrawJson({
      totSellamnt: 118628811000,
      returnValue: 'success',
      drwNoDate: '2026-10-31',
      firstWinamnt: 2079240000,
      drwtNo6: 42,
      drwtNo4: 28,
      firstPrzwnerCo: 12,
      drwtNo5: 33,
      bnusNo: 7,
      drwNo: 1248,
      drwtNo2: 12,
      drwtNo3: 19,
      drwtNo1: 3,
    });
    expect(r).toEqual({ round: 1248, drawDate: '2026-10-31', numbers: [3, 12, 19, 28, 33, 42], bonus: 7, firstPrize: 2079240000 });
  });

  it('추첨 전(fail) / 이상한 값은 null', () => {
    expect(parseDrawJson({ returnValue: 'fail' })).toBeNull();
    expect(parseDrawJson({ returnValue: 'success', drwNo: 1, drwNoDate: '2002-12-07', drwtNo1: 1, drwtNo2: 1, drwtNo3: 2, drwtNo4: 3, drwtNo5: 4, drwtNo6: 5, bnusNo: 6 })).toBeNull();
    expect(parseDrawJson(null)).toBeNull();
  });
});

describe('등위별 당첨금 표', () => {
  const html = `
<table class="tbl_data tbl_data_col">
<thead><tr><th scope="col">순위</th><th>등위별 총 당첨금액</th><th>당첨게임 수</th><th>1게임당 당첨금액</th><th>당첨기준</th><th>비고</th></tr></thead>
<tbody>
<tr>
  <td>1등</td>
  <td class="tar"><strong class="color_key1">24,950,880,000원</strong></td>
  <td>12</td>
  <td class="tar">2,079,240,000원</td>
  <td>당첨번호 <strong class="color_key1">6개</strong> 숫자일치</td>
  <td>1등<br>자동7<br>수동4<br>반자동1</td>
</tr>
<tr><td>2등</td><td class="tar"><strong>4,158,480,000원</strong></td><td>81</td><td class="tar">51,339,259원</td><td>당첨번호 5개 숫자일치<br>+&nbsp;보너스 숫자일치</td><td></td></tr>
<tr><td>3등</td><td class="tar"><strong>4,158,503,688원</strong></td><td>2,872</td><td class="tar">1,447,947원</td><td>당첨번호 5개 숫자일치</td><td></td></tr>
<tr><td>4등</td><td class="tar"><strong>7,234,250,000원</strong></td><td>144,685</td><td class="tar">50,000원</td><td>당첨번호 4개 숫자일치</td><td></td></tr>
<tr><td>5등</td><td class="tar"><strong>12,060,825,000원</strong></td><td>2,412,165</td><td class="tar">5,000원</td><td>당첨번호 3개 숫자일치</td><td></td></tr>
</tbody></table>`;

  it('1게임당 당첨금 [1등..5등]', () => {
    expect(parsePrizeTable(html)).toEqual([2_079_240_000, 51_339_259, 1_447_947, 50_000, 5_000]);
  });

  it('표가 없으면 전부 null', () => {
    expect(parsePrizeTable('<html>점검 중</html>')).toEqual([null, null, null, null, null]);
  });
});

describe('1·2등 배출점', () => {
  const html = `
<h4 class="title">1등 배출점</h4>
<table class="tbl_data tbl_data_col">
<thead><tr><th>번호</th><th>상호명</th><th>구분</th><th>소재지</th><th>위치보기</th></tr></thead>
<tbody>
<tr>
  <td>1</td><td>행운복권방</td><td>자동</td><td class="lt">서울 마포구 와우산로 94 1층</td>
  <td><a href="#" class="btn_search" onClick="javascript:showMapPage('1100101')">보기</a></td>
</tr>
<tr>
  <td>2</td><td>대박&amp;로또</td><td>반자동</td><td class="lt">부산 해운대구 해운대로 10</td>
  <td><a href="#" onClick="javascript:showMapPage('21100245')">보기</a></td>
</tr>
</tbody></table>
<h4 class="title">2등 배출점</h4>
<table class="tbl_data tbl_data_col">
<tbody>
<tr><td>1</td><td>별빛복권</td><td class="lt">서울 마포구 독막로 85</td><td><a href="#" onClick="javascript:showMapPage('1100105')">보기</a></td></tr>
</tbody></table>`;

  it('1등/2등을 구분해서 파싱', () => {
    expect(parseTopStores(html)).toEqual([
      { rank: 1, id: '1100101', name: '행운복권방', address: '서울 마포구 와우산로 94 1층', method: '자동' },
      { rank: 1, id: '21100245', name: '대박&로또', address: '부산 해운대구 해운대로 10', method: '반자동' },
      { rank: 2, id: '1100105', name: '별빛복권', address: '서울 마포구 독막로 85', method: null },
    ]);
  });

  it('판매점 코드는 숫자 7자리만 (형식이 다르면 null → 원본 ID 만 기록)', () => {
    expect(normalizeStoreCode('1100101')).toBe('1100101');
    expect(normalizeStoreCode('21100245')).toBeNull();
  });
});

it('Edge Function 회차 계산 = 앱 회차 계산', () => {
  for (const t of [Date.UTC(2026, 9, 31, 11, 34), Date.UTC(2026, 9, 31, 11, 35), Date.UTC(2026, 10, 4)]) {
    expect(latestDrawnRound(t)).toBe(appLatest(t));
  }
});
