import type { Metadata } from 'next';
import { safeNextPath } from '@/lib/safeNext';
import { OnboardingView } from './OnboardingView';

export const metadata: Metadata = { title: '시작하기' };

export default function OnboardingPage({ searchParams }: { searchParams: { next?: string } }) {
  return <OnboardingView next={safeNextPath(searchParams.next)} />;
}
