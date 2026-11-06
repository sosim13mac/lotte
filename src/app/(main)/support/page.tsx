import type { Metadata } from 'next';
import { RequireLogin } from '@/components/RequireLogin';
import { SupportView } from './SupportView';

export const metadata: Metadata = { title: '문의/건의' };

export default function SupportPage() {
  return <RequireLogin title="문의 / 건의" reason="문의 내용과 답변은 본인 계정에 연결되어 로그인 후 작성할 수 있어요.">
      <SupportView />
    </RequireLogin>;
}
