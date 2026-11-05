import type { Metadata } from 'next';
import { SupportView } from './SupportView';

export const metadata: Metadata = { title: '문의/건의' };

export default function SupportPage() {
  return <SupportView />;
}
