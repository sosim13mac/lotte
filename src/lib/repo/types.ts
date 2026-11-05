import type { InquiryCategory } from '@/lib/inquiry';
import type { LedgerStats } from '@/lib/ledger';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

export type Profile = Tables['users']['Row'];
export type WinningDraw = Tables['winning_draws']['Row'];
export type Store = Tables['stores']['Row'];

/** tickets 행 (games 를 number[][] 로 좁힌 형태) */
export type Ticket = Omit<Tables['tickets']['Row'], 'games'> & { games: number[][] };

/** 역대 당첨번호 분석 데이터 요약 (본번호 6개 기준, 보너스 제외) */
export interface DrawStatsSummary {
  /** 집계한 회차 수 */
  total: number;
  /** 홀수가 k개인 회차 수 (index = k, 0~6; 짝수는 6-k) */
  oddDist: number[];
  /** 저구간(1~22)이 k개인 회차 수 (index = k, 0~6; 고구간(23~45)은 6-k) */
  lowDist: number[];
  /** 합계: 평균/최소/최대와 20 단위 구간별 회차 수 */
  sum: { avg: number; min: number; max: number; buckets: { from: number; to: number; count: number }[] };
  /** 번호 평균의 평균 */
  meanAvg: number;
}

export interface Inquiry {
  id: string;
  /** 문의가 들어온 앱 (로또당 = lottedang) */
  app_name: string;
  category: InquiryCategory;
  title: string;
  body: string;
  status: 'open' | 'answered';
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  /** 운영자가 전체 목록을 볼 때만 채워짐 */
  author_email?: string | null;
}

export interface InquiryList {
  items: Inquiry[];
  /** 운영자(ADMIN_EMAILS)인지 — 서버가 판단 */
  isAdmin: boolean;
}

export interface NewInquiry {
  category: InquiryCategory;
  title: string;
  body: string;
}

export interface DrawCoverage {
  count: number;
  from: number | null;
  to: number | null;
}

export interface DreamEntry {
  keyword: string;
  numbers: number[];
}

export interface NewTicket {
  round: number;
  purchase_date?: string;
  store_code?: string | null;
  store_name?: string | null;
  games: number[][];
  /** QR 원문 텍스트 (사진은 저장하지 않음) */
  qr_raw?: string | null;
}

export type ProfilePatch = Partial<
  Pick<Profile, 'birth_date' | 'monthly_budget' | 'notify_geofence' | 'notify_favorite_win' | 'notify_draw_result'>
>;

export interface StoreQuery {
  bounds?: { swLat: number; swLng: number; neLat: number; neLng: number };
  hotOnly?: boolean;
  limit?: number;
}

export type PushPlatform = 'web' | 'android' | 'ios';
export type TicketPatch = Partial<
  Pick<Ticket, 'opened_at' | 'store_code' | 'store_name' | 'round' | 'games' | 'purchase_date'>
>;

export class DuplicateTicketError extends Error {
  constructor() {
    super('이미 등록된 티켓이에요');
    this.name = 'DuplicateTicketError';
  }
}

/** 데이터 접근 계층. Neon 구현과 데모(localStorage) 구현이 같은 인터페이스를 가집니다. */
export interface Repo {
  readonly kind: 'neon' | 'demo';
  /** 로그인하지 않았으면 null */
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  listTickets(): Promise<Ticket[]>;
  insertTicket(input: NewTicket): Promise<Ticket>;
  updateTicket(id: string, patch: TicketPatch): Promise<void>;
  deleteTicket(id: string): Promise<void>;
  /** rounds 를 주면 해당 회차만, 아니면 최신순 limit 개 */
  listDraws(opts?: { rounds?: number[]; limit?: number }): Promise<WinningDraw[]>;
  listDreamMap(): Promise<DreamEntry[]>;
  /** 저장된 당첨 회차 범위 (판매점 1·2등 횟수는 이 범위 안에서만 집계됨) */
  getDrawCoverage(): Promise<DrawCoverage>;
  /** 내 문의 목록 (all=true 는 운영자만 가능: 전체 문의) */
  listInquiries(opts?: { all?: boolean }): Promise<InquiryList>;
  createInquiry(input: NewInquiry): Promise<Inquiry>;
  deleteInquiry(id: string): Promise<void>;
  /** 운영자 답변 (운영자만 가능) */
  replyInquiry(id: string, reply: string): Promise<Inquiry>;
  /** 역대 당첨번호의 홀짝·저고·합계·평균 분포 (저장된 회차가 없으면 null) */
  getDrawStats(): Promise<DrawStatsSummary | null>;
  /** 가계부 집계 (Neon: get_ledger_stats 함수 / 데모: 같은 규칙의 TS 계산) */
  getLedgerStats(): Promise<LedgerStats>;
  /** 판매점 코드 → 판매점 (명당 DB 에 없으면 null) */
  findStore(code: string): Promise<Store | null>;
  /** 지도 범위 안 판매점 */
  listStores(query?: StoreQuery): Promise<Store[]>;
  listFavoriteStores(): Promise<Store[]>;
  setFavoriteStore(code: string, on: boolean): Promise<void>;
  /** FCM 토큰 등록 (같은 기기 토큰은 현재 계정으로 이동) */
  registerPushToken(token: string, platform: PushPlatform): Promise<void>;
  unregisterPushToken(token: string): Promise<void>;
  signOut(): Promise<void>;
}
