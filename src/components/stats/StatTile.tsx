import { cn } from '@/lib/cn';

/** 숫자가 주인공인 지표 타일 (label · value · sub) */
export function StatTile({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-3xl border border-ink-600 bg-ink-800 p-4 shadow-card', className)}>
      <p className="text-xs text-fog-400">{label}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[22px] font-bold leading-tight tracking-tight text-fog">
        {icon}
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-fog-500">{sub}</p>}
    </div>
  );
}
