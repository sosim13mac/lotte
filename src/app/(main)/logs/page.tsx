import type { Metadata } from 'next';
import { LogsView } from './LogsView';

export const metadata: Metadata = { title: '티켓 로그' };

export default function LogsPage() {
  return <LogsView />;
}
