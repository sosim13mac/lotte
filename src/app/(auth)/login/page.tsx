import type { Metadata } from 'next';
import { safeNextPath } from '@/lib/safeNext';
import { LoginView } from './LoginView';

export const metadata: Metadata = { title: '로그인' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return <LoginView next={safeNextPath(searchParams.next)} hasError={Boolean(searchParams.error)} />;
}
