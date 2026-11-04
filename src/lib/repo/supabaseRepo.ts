import type { LedgerStats } from '@/lib/ledger';
import { GAME_PRICE } from '@/lib/lotto/constants';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { normalizeGames } from './normalize';
import { DuplicateTicketError, type Repo, type Store, type Ticket } from './types';

type TicketRow = Database['public']['Tables']['tickets']['Row'];

const toTicket = (row: TicketRow): Ticket => ({ ...row, games: normalizeGames(row.games) });

export function createSupabaseRepo(): Repo {
  const sb = getBrowserSupabase();

  async function requireUserId(): Promise<string> {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('로그인이 필요해요');
    return id;
  }

  return {
    kind: 'supabase',

    async getProfile() {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return null;
      const { data, error } = await sb.from('users').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (data) return data;
      // 가입 트리거가 없던 시절의 계정 대비
      const { data: created, error: insertError } = await sb
        .from('users')
        .insert({ id: user.id, email: user.email ?? null })
        .select('*')
        .single();
      if (insertError) throw insertError;
      return created;
    },

    async updateProfile(patch) {
      const id = await requireUserId();
      const { data, error } = await sb.from('users').update(patch).eq('id', id).select('*').single();
      if (error) throw error;
      return data;
    },

    async listTickets() {
      const { data, error } = await sb
        .from('tickets')
        .select('*')
        .order('purchase_date', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data.map(toTicket);
    },

    async insertTicket(input) {
      const { data, error } = await sb
        .from('tickets')
        .insert({
          round: input.round,
          purchase_date: input.purchase_date ?? new Date().toISOString(),
          store_code: input.store_code || null,
          store_name: input.store_name || null,
          games: input.games,
          amount: input.games.length * GAME_PRICE,
          qr_raw: input.qr_raw ?? null,
        })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') throw new DuplicateTicketError();
        throw error;
      }
      return toTicket(data);
    },

    async updateTicket(id, patch) {
      const { error } = await sb.from('tickets').update(patch).eq('id', id);
      if (error) throw error;
    },

    async deleteTicket(id) {
      const { error } = await sb.from('tickets').delete().eq('id', id);
      if (error) throw error;
    },

    async listDraws(opts = {}) {
      let query = sb.from('winning_draws').select('*').order('round', { ascending: false });
      if (opts.rounds?.length) query = query.in('round', opts.rounds);
      else query = query.limit(opts.limit ?? 20);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async listDreamMap() {
      const { data, error } = await sb.from('dream_map').select('keyword, numbers');
      if (error) throw error;
      return data;
    },

    async getLedgerStats() {
      const { data, error } = await sb.rpc('get_ledger_stats');
      if (error) throw error;
      return data as unknown as LedgerStats;
    },

    async findStore(code) {
      const { data, error } = await sb.from('stores').select('*').eq('code', code).maybeSingle();
      if (error) throw error;
      return data;
    },

    async listStores(query = {}) {
      let q = sb.from('stores').select('*').not('lat', 'is', null);
      if (query.bounds) {
        const b = query.bounds;
        q = q.gte('lat', b.swLat).lte('lat', b.neLat).gte('lng', b.swLng).lte('lng', b.neLng);
      }
      if (query.hotOnly) q = q.eq('is_hot', true);
      const { data, error } = await q
        .order('first_win_count', { ascending: false })
        .limit(query.limit ?? 300);
      if (error) throw error;
      return data;
    },

    async listFavoriteStores() {
      const { data, error } = await sb
        .from('favorite_stores')
        .select('created_at, stores(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as Array<{ stores: Store | null }>).map((r) => r.stores).filter((s): s is Store => Boolean(s));
    },

    async setFavoriteStore(code, on) {
      if (on) {
        const { error } = await sb.from('favorite_stores').upsert({ store_code: code }, { onConflict: 'user_id,store_code', ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await sb.from('favorite_stores').delete().eq('store_code', code);
        if (error) throw error;
      }
    },

    async registerPushToken(token, platform) {
      const { error } = await sb.rpc('register_push_token', { p_token: token, p_platform: platform });
      if (error) throw error;
    },

    async unregisterPushToken(token) {
      const { error } = await sb.from('push_tokens').delete().eq('token', token);
      if (error) throw error;
    },

    async signOut() {
      await sb.auth.signOut();
    },
  };
}
