import type { LucideIcon } from 'lucide-react';

export function ComingSoon({ Icon, title, description }: { Icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="card mt-2 flex flex-col items-center gap-3 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
        <Icon className="h-7 w-7" />
      </span>
      <p className="font-display text-lg">{title}</p>
      <p className="max-w-[260px] text-sm text-fog-300">{description}</p>
    </div>
  );
}
