import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { CONTACT_EMAIL, OPERATOR_NAME, PRIVACY_EFFECTIVE_DATE } from '@/lib/legal';

export const metadata: Metadata = { title: '개인정보 처리방침' };

const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="font-display text-lg text-fog">
      {n}. {title}
    </h2>
    <div className="mt-2 space-y-2 text-sm leading-relaxed text-fog-300">{children}</div>
  </section>
);

const Table = ({ head, rows }: { head: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto rounded-2xl border border-ink-600">
    <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
      <thead className="bg-ink-700/60 text-fog">
        <tr>
          {head.map((h) => (
            <th key={h} className="px-3 py-2 font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]} className="border-t border-ink-600 align-top">
            {r.map((c, i) => (
              <td key={i} className={i === 0 ? 'px-3 py-2 font-medium text-fog' : 'px-3 py-2'}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * 개인정보 처리방침 (로그인 없이 볼 수 있는 공개 페이지).
 * 서비스가 실제로 저장하는 항목(db/neon/schema.sql)과 외부 연동(Neon · Google · Kakao · FCM)을 기준으로 작성했습니다.
 * 기능이나 수집 항목이 바뀌면 이 문서도 함께 고치세요.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[760px] px-6 pb-16 pt-8">
      <Link href="/" className="inline-block">
        <Logo className="text-2xl" />
      </Link>
      <h1 className="mt-6 font-display text-[28px] leading-tight text-fog">개인정보 처리방침</h1>
      <p className="mt-2 text-sm text-fog-400">시행일: {PRIVACY_EFFECTIVE_DATE}</p>
      <p className="mt-4 text-sm leading-relaxed text-fog-300">
        로또당(이하 “서비스”)은 「개인정보 보호법」 등 관련 법령을 지키며, 이용자의 개인정보를 소중히 다룹니다. 이 방침은 서비스가 어떤 정보를 왜 모으고, 어떻게 보관·파기하는지,
        이용자가 어떤 권리를 가지는지를 알려드립니다.
      </p>

      <Section n={1} title="수집하는 개인정보 항목">
        <Table
          head={['구분', '수집 항목', '수집 시점']}
          rows={[
            ['이메일 회원가입·로그인', '이메일, 비밀번호(암호화하여 저장), 이름(이메일 앞부분으로 자동 설정)', '회원가입 시 (필수)'],
            ['Google 로그인', '이메일, 이름, 프로필 이미지 주소, Google 계정 식별자, 로그인 인증 토큰', 'Google 로그인 이용 시 (선택)'],
            ['연령 확인', '생년월일 (만 19세 미만 이용 제한 및 생일수 계산)', '최초 이용 시 (필수)'],
            [
              '티켓 로그·가계부',
              '로또 티켓 정보(회차, 구매일시, 판매점 코드·이름, 게임 번호, 구매 금액, QR 원문 텍스트, 당첨금 정산 결과, 결과를 열어 본 시각), 단골 판매점, 월 예산, 알림 설정',
              '이용자가 등록·설정할 때',
            ],
            ['푸시 알림', '푸시 토큰, 기기 구분(웹/안드로이드/iOS)', '알림을 켰을 때 (선택)'],
            ['문의/건의', '제목, 내용, 분류, 운영자 답변, 작성·답변 시각', '문의를 작성할 때 (선택)'],
            ['자동 수집', '로그인 세션 정보(세션 토큰, 접속 IP 주소, 브라우저 정보), 서비스 이용에 필요한 쿠키', '로그인 시'],
          ]}
        />
      </Section>

      <Section n={2} title="개인정보의 이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별과 로그인 상태 유지, 부정 이용 방지</li>
          <li>만 19세 미만 이용 제한 (「복권 및 복권기금법」), 생일수 기반 번호 구성</li>
          <li>티켓 등록·당첨 정산, 자동 가계부와 통계 제공</li>
          <li>단골 판매점 당첨 소식, 회차 결과, 예산 알림 발송</li>
          <li>문의·건의 접수와 답변, 서비스 개선</li>
        </ul>
      </Section>

      <Section n={3} title="서버에 저장하지 않는 정보">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b className="text-fog">티켓 사진 원본:</b> 사진은 이용자의 기기(브라우저) 안에서만 QR·판매점 코드를 읽는 데 쓰이며 서버로 보내거나 저장하지 않습니다. 서버에는 QR 텍스트와 판매점 코드만
            저장됩니다.
          </li>
          <li>
            <b className="text-fog">위치 정보:</b> 주변 판매점 표시와 ‘지나가는 길 알림’을 위해 기기의 위치를 사용하지만 서버에 저장하지 않습니다. 지도를 볼 때 화면에 보이는 지도 범위(좌표 범위)가 판매점
            조회를 위해 서버로 전달될 수 있으며, 저장하지 않습니다.
          </li>
        </ul>
      </Section>

      <Section n={4} title="보유 및 이용 기간">
        <p>
          개인정보는 회원 탈퇴 또는 삭제 요청 시까지 보관하고, 목적이 달성되면 지체 없이 파기합니다. 다만 관계 법령에 따라 보존해야 하는 정보는 해당 기간 동안 별도로 보관합니다. 계정이 삭제되면 그 계정의 티켓,
          단골점, 푸시 토큰, 문의 내용도 함께 삭제됩니다.
        </p>
      </Section>

      <Section n={5} title="개인정보 처리 위탁 및 국외 이전">
        <p>서비스는 안정적인 운영을 위해 아래 사업자의 서비스를 이용합니다. 이용자의 정보는 암호화된 통신(HTTPS/TLS)으로 전송됩니다.</p>
        <Table
          head={['받는 자 (이용 서비스)', '국가', '이전 항목', '이용 목적 · 보유 기간']}
          rows={[
            ['Neon (데이터베이스 호스팅, AWS 싱가포르 리전)', '싱가포르', '제1항의 서비스 저장 정보 전체', '데이터 저장·관리 · 목적 달성(회원 탈퇴·삭제 요청) 시까지'],
            ['서비스 호스팅 사업자 (웹 서버 운영)', '배포 환경에 따름', '서비스 이용 중 전송되는 요청 정보(접속 IP 등)', '웹 서비스 제공 · 서버 운영 기간'],
            ['Google LLC (Google 로그인, Firebase 푸시 알림)', '미국 등', 'Google 로그인 정보, 푸시 토큰과 알림 문구', '로그인 인증·푸시 발송 · 해당 기능 이용 기간 (기능을 켠 경우에만)'],
            ['Kakao Corp. (카카오맵)', '대한민국', '지도 이용 시 접속 IP 주소, 브라우저 정보', '지도 표시 · 카카오 정책에 따름 (지도 화면을 이용한 경우에만)'],
          ]}
        />
        <p>이용자는 국외 이전을 거부할 수 있으나, 이 경우 로그인 등 서비스 이용이 제한될 수 있습니다. 거부하려면 아래 문의 창구로 요청해 주세요.</p>
      </Section>

      <Section n={6} title="제3자 제공">
        <p>서비스는 이용자의 개인정보를 제1항의 목적 범위를 넘어 제3자에게 제공하지 않습니다. 이용자가 동의한 경우나 법령에 따라 수사기관 등이 적법한 절차로 요청한 경우는 예외입니다.</p>
      </Section>

      <Section n={7} title="개인정보 파기 절차와 방법">
        <p>보관 기간이 끝났거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구할 수 없는 방법으로 삭제합니다.</p>
      </Section>

      <Section n={8} title="이용자의 권리와 행사 방법">
        <ul className="list-disc space-y-1 pl-5">
          <li>이용자는 언제든지 자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요청할 수 있습니다.</li>
          <li>설정 화면에서 생년월일, 월 예산, 알림 설정을 바꾸고 단골점·푸시 알림을 해제할 수 있으며, 티켓 로그에서 티켓을 삭제할 수 있습니다.</li>
          <li>
            계정 삭제와 그 밖의 요청은{' '}
            <Link href="/support" className="text-gold-deep underline">
              문의/건의 게시판
            </Link>
            {CONTACT_EMAIL ? ` 또는 ${CONTACT_EMAIL}` : ''}로 알려 주세요. 본인 확인 후 지체 없이 조치합니다.
          </li>
        </ul>
      </Section>

      <Section n={9} title="아동의 개인정보">
        <p>
          복권은 만 19세 미만이 구매할 수 없으므로 서비스도 만 19세 이상만 이용할 수 있습니다. 생년월일 확인으로 만 19세 미만의 이용을 제한하며, 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.
        </p>
      </Section>

      <Section n={10} title="쿠키와 브라우저 저장소">
        <ul className="list-disc space-y-1 pl-5">
          <li>로그인 상태를 유지하기 위해 세션 쿠키를 사용합니다. 브라우저에서 쿠키를 차단하면 로그인이 되지 않습니다.</li>
          <li>알림·지도 기능의 간단한 설정 값(예: 지나가는 길 알림 켜짐 여부)은 브라우저 저장소에 보관되며, 로그아웃 후에도 남을 수 있습니다. 브라우저 설정에서 삭제할 수 있습니다.</li>
        </ul>
      </Section>

      <Section n={11} title="안전성 확보 조치">
        <ul className="list-disc space-y-1 pl-5">
          <li>비밀번호는 복호화할 수 없는 방식으로 암호화하여 저장합니다.</li>
          <li>모든 통신은 HTTPS(TLS)로 암호화됩니다.</li>
          <li>이용자는 본인의 데이터만 조회·수정할 수 있도록 서버에서 접근을 제한하며, 데이터베이스 접속 정보는 서버 환경에서만 관리합니다.</li>
          <li>문의 내용은 작성자 본인과 서비스 운영자만 볼 수 있습니다.</li>
        </ul>
      </Section>

      <Section n={12} title="개인정보 보호 문의처">
        <ul className="list-disc space-y-1 pl-5">
          {OPERATOR_NAME && <li>운영자: {OPERATOR_NAME}</li>}
          {CONTACT_EMAIL && <li>이메일: {CONTACT_EMAIL}</li>}
          <li>
            앱 내 창구:{' '}
            <Link href="/support" className="text-gold-deep underline">
              문의/건의 게시판
            </Link>{' '}
            (로그인 필요)
          </li>
        </ul>
        <p>개인정보 침해에 대한 신고·상담은 아래 기관에 문의할 수 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보침해 신고센터: privacy.kisa.or.kr · 국번없이 118</li>
          <li>개인정보 분쟁조정위원회: kopico.go.kr · 1833-6972</li>
          <li>대검찰청: spo.go.kr · 국번없이 1301</li>
          <li>경찰청 사이버수사국: ecrm.police.go.kr · 국번없이 182</li>
        </ul>
      </Section>

      <Section n={13} title="방침의 변경">
        <p>이 방침의 내용이 바뀌면 시행일과 함께 이 페이지에 알립니다.</p>
      </Section>

      <p className="mt-10 text-center text-[11px] text-fog-500">본 앱은 통계 참고 도구이며 당첨을 보장하지 않습니다.</p>
    </main>
  );
}
