/** 문의/건의 게시판 공용 상수 · 입력 검증 (브라우저 · 서버 · 테스트 공용) */

export const INQUIRY_CATEGORIES = { inquiry: '문의', suggestion: '건의', bug: '오류 신고' } as const;
export type InquiryCategory = keyof typeof INQUIRY_CATEGORIES;

/** inquiries.app_name — 이 앱에서 들어온 문의의 앱 식별자 (다른 앱과 테이블을 공유할 때 구분) */
export const APP_NAME = 'lottedang';

export const TITLE_MAX = 60;
export const BODY_MAX = 2000;
export const REPLY_MAX = 2000;
/** 도배 방지: 한 사용자가 1시간 동안 작성할 수 있는 글 수 */
export const INQUIRY_HOURLY_LIMIT = 5;

export type InquiryInputResult =
  | { ok: true; value: { category: InquiryCategory; title: string; body: string } }
  | { ok: false; error: string };

export function validateInquiry(input: { category?: unknown; title?: unknown; body?: unknown }): InquiryInputResult {
  const category = input.category;
  if (typeof category !== 'string' || !Object.prototype.hasOwnProperty.call(INQUIRY_CATEGORIES, category)) {
    return { ok: false, error: '분류를 선택해 주세요' };
  }
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) return { ok: false, error: '제목을 입력해 주세요' };
  if (title.length > TITLE_MAX) return { ok: false, error: `제목은 ${TITLE_MAX}자까지 쓸 수 있어요` };
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) return { ok: false, error: '내용을 입력해 주세요' };
  if (body.length > BODY_MAX) return { ok: false, error: `내용은 ${BODY_MAX}자까지 쓸 수 있어요` };
  return { ok: true, value: { category: category as InquiryCategory, title, body } };
}

export function validateReply(reply: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = typeof reply === 'string' ? reply.trim() : '';
  if (!text) return { ok: false, error: '답변 내용을 입력해 주세요' };
  if (text.length > REPLY_MAX) return { ok: false, error: `답변은 ${REPLY_MAX}자까지 쓸 수 있어요` };
  return { ok: true, value: text };
}

/** ADMIN_EMAILS(쉼표 구분) 안에 있는 이메일인지 — 대소문자 무시 */
export function isAdminEmail(email: string | null | undefined, adminEmails: string | undefined): boolean {
  if (!email || !adminEmails) return false;
  const list = adminEmails.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
