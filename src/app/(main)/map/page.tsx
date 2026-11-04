import { MapPin } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';
import { PageHeader } from '@/components/PageHeader';

export default function MapPage() {
  return (
    <>
      <PageHeader title="명당 지도" subtitle="주변 로또 판매점과 1등 배출점" />
      <ComingSoon Icon={MapPin} title="지도 준비 중" description="카카오맵으로 주변 판매점과 명당을 보여주고, 지나갈 때 알려드릴게요." />
    </>
  );
}
