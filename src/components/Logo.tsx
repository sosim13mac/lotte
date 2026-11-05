import { cn } from '@/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-display tracking-tight', className)}>
      <span className="text-gold">로또</span>
      <span className="text-fog">당</span>
    </span>
  );
}
