import { describe, expect, it } from 'vitest';
import { BODY_MAX, REPLY_MAX, TITLE_MAX, isAdminEmail, validateInquiry, validateReply } from '@/lib/inquiry';

describe('문의 입력 검증', () => {
  const ok = { category: 'bug', title: '  지도가 안 열려요 ', body: ' 명당 지도에서 빈 화면이 나와요 ' };

  it('정상 입력은 앞뒤 공백을 제거해 통과', () => {
    expect(validateInquiry(ok)).toEqual({ ok: true, value: { category: 'bug', title: '지도가 안 열려요', body: '명당 지도에서 빈 화면이 나와요' } });
  });

  it('분류는 정해진 값만', () => {
    expect(validateInquiry({ ...ok, category: 'spam' }).ok).toBe(false);
    expect(validateInquiry({ ...ok, category: 'constructor' }).ok).toBe(false);
    expect(validateInquiry({ ...ok, category: undefined }).ok).toBe(false);
  });

  it('제목·내용은 비어 있거나 공백뿐이면 거부', () => {
    expect(validateInquiry({ ...ok, title: '   ' }).ok).toBe(false);
    expect(validateInquiry({ ...ok, body: '' }).ok).toBe(false);
    expect(validateInquiry({ ...ok, title: 123 }).ok).toBe(false);
  });

  it('길이 제한', () => {
    expect(validateInquiry({ ...ok, title: 'a'.repeat(TITLE_MAX) }).ok).toBe(true);
    expect(validateInquiry({ ...ok, title: 'a'.repeat(TITLE_MAX + 1) }).ok).toBe(false);
    expect(validateInquiry({ ...ok, body: 'a'.repeat(BODY_MAX) }).ok).toBe(true);
    expect(validateInquiry({ ...ok, body: 'a'.repeat(BODY_MAX + 1) }).ok).toBe(false);
  });

  it('답변 검증', () => {
    expect(validateReply('  확인했어요 ')).toEqual({ ok: true, value: '확인했어요' });
    expect(validateReply('   ').ok).toBe(false);
    expect(validateReply('a'.repeat(REPLY_MAX + 1)).ok).toBe(false);
  });
});

describe('운영자 판별', () => {
  it('ADMIN_EMAILS 목록에 있는 이메일만 (대소문자·공백 무시)', () => {
    expect(isAdminEmail('Boss@Example.com', ' boss@example.com , other@example.com ')).toBe(true);
    expect(isAdminEmail('other@example.com', 'boss@example.com,other@example.com')).toBe(true);
    expect(isAdminEmail('user@example.com', 'boss@example.com')).toBe(false);
  });

  it('목록이 비어 있거나 이메일이 없으면 아무도 운영자가 아니다', () => {
    expect(isAdminEmail('boss@example.com', '')).toBe(false);
    expect(isAdminEmail('boss@example.com', undefined)).toBe(false);
    expect(isAdminEmail(null, 'boss@example.com')).toBe(false);
    expect(isAdminEmail('boss@example.com', ' , ')).toBe(false);
  });
});
