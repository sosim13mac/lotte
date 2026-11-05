import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { LogoMark } from '@/components/LogoMark';

export const metadata: Metadata = { title: '오프라인' };

/** 서비스 워커가 네트워크 실패 시 보여주는 정적 페이지 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 px-8 text-center">
      <LogoMark size={96} />
      <Logo className="text-3xl" />
      <p className="font-display text-xl">인터넷 연결이 끊겼어요</p>
      <p className="text-sm text-fog-300">연결되면 다시 시도해 주세요. 등록한 티켓은 안전하게 저장되어 있어요.</p>
      <a href="/" className="btn-gold mt-4 px-6">
        다시 시도
      </a>
    </main>
  );
}
