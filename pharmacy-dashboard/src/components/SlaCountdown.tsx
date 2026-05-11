'use client';
import { useEffect, useState } from 'react';

interface Props {
  slaTargetAt: string;
  placedAt: string;
}

export function SlaCountdown({ slaTargetAt, placedAt }: Props) {
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
  const isUrgent = remaining < 180;
  const isBreach = remaining === 0;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums
      ${isBreach ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${isBreach ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-sky-400'}`} />
      {isBreach ? 'SLA BREACH' : `${mins}:${String(secs).padStart(2, '0')}`}
    </div>
  );
}
