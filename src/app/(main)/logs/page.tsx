import type { Metadata } from 'next';
import { RequireLogin } from '@/components/RequireLogin';
import { LogsView } from './LogsView';

export const metadata: Metadata = { title: '티켓 로그' };

export default function LogsPage() {
  return <RequireLogin title="티켓 로그" reason="티켓을 저장하고 한 줄씩 열어보려면 로그인해 주세요.">
      <LogsView />
    </RequireLogin>;
}
