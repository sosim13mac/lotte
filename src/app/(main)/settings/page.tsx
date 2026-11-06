import { RequireLogin } from '@/components/RequireLogin';
import { SettingsView } from './SettingsView';

export default function SettingsPage() {
  return <RequireLogin title="설정" reason="생년월일·알림·단골점 설정은 로그인 후 사용할 수 있어요.">
      <SettingsView />
    </RequireLogin>;
}
