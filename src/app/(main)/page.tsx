import { Disclaimer } from '@/components/Disclaimer';
import { HomeScanSection } from '@/components/home/HomeScanSection';
import { LatestDrawCard } from '@/components/home/LatestDrawCard';
import { NextDrawCard } from '@/components/home/NextDrawCard';
import { QuickQualityCard } from '@/components/home/QuickQualityCard';
import { RecommendCard } from '@/components/home/RecommendCard';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  return (
    <div className="space-y-4 lg:grid lg:pt-6 lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
      <header className="flex items-center justify-between pb-1 pt-6 lg:hidden">
        <Logo className="text-[28px]" />
      </header>
      <NextDrawCard />
      <RecommendCard />
      <HomeScanSection />
      <QuickQualityCard />
      <div className="lg:col-span-2">
        <LatestDrawCard />
      </div>
      <Disclaimer className="pt-4 lg:col-span-2" />
    </div>
  );
}
