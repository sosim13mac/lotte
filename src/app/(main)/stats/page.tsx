import { ChartColumn } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';
import { PageHeader } from '@/components/PageHeader';

export default function StatsPage() {
  return (
    <>
      <PageHeader title="가계부" subtitle="구매·당첨 내역 자동 집계" />
      <ComingSoon Icon={ChartColumn} title="가계부 준비 중" description="티켓을 등록하면 손익·ROI·요일 히트맵이 자동으로 계산돼요." />
    </>
  );
}
