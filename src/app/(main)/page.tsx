import { Disclaimer } from '@/components/Disclaimer';
import { HomeScanSection } from '@/components/home/HomeScanSection';
import { LatestDrawCard } from '@/components/home/LatestDrawCard';
import { NextDrawCard } from '@/components/home/NextDrawCard';
import { QuickQualityCard } from '@/components/home/QuickQualityCard';
import { RecommendCard } from '@/components/home/RecommendCard';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pb-1 pt-6">
        <Logo className="text-[28px]" />
      </header>
      <NextDrawCard />
      <RecommendCard />
      <HomeScanSection />
      <QuickQualityCard />
      <LatestDrawCard />
      <Disclaimer className="pt-4" />
    </div>
  );
}
