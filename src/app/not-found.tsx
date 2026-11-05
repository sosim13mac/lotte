import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LogoMark } from '@/components/LogoMark';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 px-8 text-center">
      <LogoMark size={96} />
      <Logo className="text-3xl" />
      <p className="font-display text-xl">페이지를 찾을 수 없어요</p>
      <Link href="/" className="btn-gold mt-4 px-6">
        홈으로
      </Link>
    </main>
  );
}
