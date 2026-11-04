import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex items-end justify-between gap-3 pb-4 pt-6', className)}>
      <div>
        <h1 className="font-display text-[26px] leading-tight text-fog">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fog-300">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
