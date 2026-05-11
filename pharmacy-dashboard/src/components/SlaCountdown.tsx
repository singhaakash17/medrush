'use client';
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  slaTargetAt: string;
  placedAt: string;
  size?: 'sm' | 'md';
}

export function SlaCountdown({ slaTargetAt, size = 'sm' }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const target = new Date(slaTargetAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [slaTargetAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent   = remaining > 0 && remaining < 180;
  const isCritical = remaining > 0 && remaining < 60;
  const isBreach   = remaining === 0;

  if (isBreach) {
    return (
      <span className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-bold tracking-tight',
        'font-variant-numeric: tabular-nums',
        size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5',
        'bg-crimson-500 text-white animate-pulse',
      )}>
        <Timer size={11} strokeWidth={2.5} />
        SLA BREACH
      </span>
    );
  }

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full font-semibold border',
      'font-variant-numeric: tabular-nums',
      size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5',
      isCritical
        ? 'bg-crimson-50 text-crimson-700 border-crimson-200 animate-pulse'
        : isUrgent
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-navy-50 text-navy-600 border-navy-200',
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full shrink-0',
        isCritical ? 'bg-crimson-500 animate-ping' : isUrgent ? 'bg-amber-500' : 'bg-navy-600',
      )} />
      {`${mins}:${String(secs).padStart(2, '0')}`}
    </span>
  );
}
