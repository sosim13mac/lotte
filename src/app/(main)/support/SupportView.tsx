'use client';

import { ChevronDown, MessageSquare, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/cn';
import { formatDateTimeKST } from '@/lib/format';
import { BODY_MAX, INQUIRY_CATEGORIES, REPLY_MAX, TITLE_MAX, validateInquiry, type InquiryCategory } from '@/lib/inquiry';
import { getRepo, type Inquiry } from '@/lib/repo';
import { useAppStore } from '@/store/useAppStore';

const CATEGORY_KEYS = Object.keys(INQUIRY_CATEGORIES) as InquiryCategory[];

/** 문의/건의 게시판: 작성자 본인과 운영자만 볼 수 있는 비공개 게시판 */
export function SupportView() {
  const showToast = useAppStore((s) => s.showToast);
  const [category, setCategory] = useState<InquiryCategory>('inquiry');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(
    async (nextScope: 'mine' | 'all') => {
      setLoading(true);
      setLoadError(null);
      try {
        const r = await getRepo().listInquiries({ all: nextScope === 'all' });
        setItems(r.items);
        setIsAdmin(r.isAdmin);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : '목록을 불러오지 못했어요');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(scope);
  }, [load, scope]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const v = validateInquiry({ category, title, body });
    if (!v.ok) {
      showToast(v.error, 'warning');
      return;
    }
    setSending(true);
    try {
      await getRepo().createInquiry(v.value);
      setTitle('');
      setBody('');
      showToast('접수했어요. 답변이 달리면 여기서 확인할 수 있어요');
      setScope('mine');
      await load('mine');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '등록하지 못했어요', 'warning');
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    try {
      await getRepo().deleteInquiry(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setConfirmDelete(null);
      showToast('삭제했어요');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '삭제하지 못했어요', 'warning');
    }
  }

  return (
    <div className="pb-8">
      <PageHeader title="문의 / 건의" subtitle="궁금한 점이나 개선 의견을 남겨 주세요" />

      <form onSubmit={submit} className="card space-y-3">
        <div className="flex gap-1.5" role="group" aria-label="분류">
          {CATEGORY_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={category === k}
              onClick={() => setCategory(k)}
              className={cn('chip', category === k && 'bg-gold/20 font-bold text-gold-deep')}
            >
              {INQUIRY_CATEGORIES[k]}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="inq-title" className="label">
            제목
          </label>
          <input id="inq-title" className="input" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="한 줄로 요약해 주세요" />
        </div>
        <div>
          <label htmlFor="inq-body" className="label">
            내용
          </label>
          <textarea
            id="inq-body"
            className="input min-h-[140px] resize-y py-3"
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="오류 신고라면 어떤 화면에서 무엇을 했는지 함께 적어 주세요"
          />
          <p className="num mt-1 text-right text-[11px] text-fog-500">
            {body.length} / {BODY_MAX}
          </p>
        </div>
        <p className="text-[11px] leading-relaxed text-fog-500">
          작성한 글은 작성자 본인과 운영자만 볼 수 있어요. 비밀번호, 주민등록번호, 카드번호 같은 민감한 정보는 적지 마세요. 개인정보 처리 안내는{' '}
          <Link href="/privacy" className="text-gold-deep underline">
            개인정보 처리방침
          </Link>
          에서 볼 수 있어요.
        </p>
        <button type="submit" disabled={sending} className="btn-gold w-full">
          <Send className="h-4 w-4" /> {sending ? '보내는 중…' : '보내기'}
        </button>
      </form>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-gold-deep" /> {scope === 'all' ? '전체 문의' : '내 문의'}
        </h2>
        {isAdmin && (
          <div className="flex gap-1.5" role="group" aria-label="보기 범위">
            {(['mine', 'all'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)} className={cn('chip', scope === s && 'bg-gold/20 font-bold text-gold-deep')}>
                {s === 'mine' ? '내 글' : '운영자: 전체'}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="py-8 text-center text-sm text-fog-400">불러오는 중…</p>}
      {loadError && <p className="py-4 text-center text-sm text-gain">{loadError}</p>}
      {!loading && !loadError && items.length === 0 && (
        <p className="card py-8 text-center text-sm text-fog-400">{scope === 'all' ? '접수된 문의가 없어요' : '아직 남긴 문의가 없어요'}</p>
      )}

      <ul className="space-y-2">
        {items.map((it) => (
          <InquiryItem
            key={it.id}
            item={it}
            open={openId === it.id}
            onToggle={() => setOpenId(openId === it.id ? null : it.id)}
            admin={scope === 'all'}
            confirming={confirmDelete === it.id}
            onDelete={() => remove(it.id)}
            onReplied={(row) => setItems((prev) => prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)))}
          />
        ))}
      </ul>
    </div>
  );
}

function InquiryItem({
  item,
  open,
  onToggle,
  admin,
  confirming,
  onDelete,
  onReplied,
}: {
  item: Inquiry;
  open: boolean;
  onToggle: () => void;
  admin: boolean;
  confirming: boolean;
  onDelete: () => void;
  onReplied: (row: Inquiry) => void;
}) {
  const showToast = useAppStore((s) => s.showToast);
  const [reply, setReply] = useState(item.reply ?? '');
  const [saving, setSaving] = useState(false);
  const answered = item.status === 'answered';

  async function saveReply() {
    setSaving(true);
    try {
      const row = await getRepo().replyInquiry(item.id, reply);
      onReplied(row);
      showToast('답변을 등록했어요');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '답변을 등록하지 못했어요', 'warning');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="card p-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span className="chip shrink-0">{INQUIRY_CATEGORIES[item.category]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.title}</span>
          <span className="num block text-[11px] text-fog-400">
            {formatDateTimeKST(item.created_at)}
            {admin && item.author_email ? ` · ${item.author_email}` : ''}
          </span>
        </span>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', answered ? 'bg-gold/20 text-gold-deep' : 'bg-ink-700 text-fog-400')}>
          {answered ? '답변 완료' : '답변 대기'}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-fog-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-ink-600 px-4 py-3">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fog-300">{item.body}</p>

          {answered && item.reply && (
            <div className="rounded-2xl bg-gold/10 p-3">
              <p className="text-[11px] font-bold text-gold-deep">운영자 답변{item.replied_at ? ` · ${formatDateTimeKST(item.replied_at)}` : ''}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-fog">{item.reply}</p>
            </div>
          )}

          {admin ? (
            <div>
              <label htmlFor={`reply-${item.id}`} className="label">
                답변 {answered ? '수정' : '작성'}
              </label>
              <textarea
                id={`reply-${item.id}`}
                className="input min-h-[96px] resize-y py-3"
                value={reply}
                maxLength={REPLY_MAX}
                onChange={(e) => setReply(e.target.value)}
              />
              <button type="button" className="btn-gold btn-sm mt-2 w-full" onClick={saveReply} disabled={saving || !reply.trim()}>
                {saving ? '저장 중…' : '답변 등록'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={onDelete} className={cn('btn-ghost btn-sm w-full', confirming && 'text-gain')}>
              <Trash2 className="h-4 w-4" /> {confirming ? '정말 삭제할까요? 한 번 더 누르면 삭제돼요' : '삭제'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
