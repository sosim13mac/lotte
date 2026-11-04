import type { Metadata } from 'next';
import { StatsView } from './StatsView';

export const metadata: Metadata = { title: '가계부' };

export default function StatsPage() {
  return <StatsView />;
}
