import { Ball } from '@/components/lotto/Ball';
import { Logo } from '@/components/Logo';

export function Splash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="animate-floaty" style={{ animationDelay: `${i * 0.18}s` }}>
            <Ball hidden size="md" />
          </span>
        ))}
      </div>
      <Logo className="text-3xl" />
      {message && <p className="text-sm text-fog-300">{message}</p>}
    </div>
  );
}
