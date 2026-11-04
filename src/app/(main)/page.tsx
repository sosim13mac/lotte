import { Disclaimer } from '@/components/Disclaimer';
import { LatestDrawCard } from '@/components/home/LatestDrawCard';
import { NextDrawCard } from '@/components/home/NextDrawCard';
import { Logo } from '@/components/Logo';
import { TicketScanner } from '@/components/scan/TicketScanner';

export default function HomePage() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pb-1 pt-6">
        <Logo className="text-[28px]" />
      </header>
      <NextDrawCard />
      <TicketScanner />
      <LatestDrawCard />
      <Disclaimer className="pt-4" />
    </div>
  );
}
