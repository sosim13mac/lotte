import { Ticket } from 'lucide-react';
import { ComingSoon } from '@/components/ComingSoon';
import { PageHeader } from '@/components/PageHeader';

export default function LogsPage() {
  return (
    <>
      <PageHeader title="티켓 로그" subtitle="내가 산 로또를 쫄깃하게 열어봐요" />
      <ComingSoon Icon={Ticket} title="쫄깃 오픈 준비 중" description="가려진 번호를 한 줄씩 열고, 당첨번호를 눌러 내 번호를 찾아보는 화면이에요." />
    </>
  );
}
