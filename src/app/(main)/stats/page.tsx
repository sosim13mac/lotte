import type { Metadata } from 'next';
import { RequireLogin } from '@/components/RequireLogin';
import { StatsView } from './StatsView';

export const metadata: Metadata = { title: '가계부' };

export default function StatsPage() {
  return <RequireLogin title="가계부" reason="구매·당첨 기록을 모아 보여주는 가계부는 로그인 후 사용할 수 있어요.">
      <StatsView />
    </RequireLogin>;
}
