'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  ClipboardList, Package, TrendingUp, Zap,
  Circle, Settings, LogOut,
} from 'lucide-react';

const NAV = [
  {
    href: '/dashboard/orders',
    icon: ClipboardList,
    label: 'Orders',
    badge: 'live',
  },
  {
    href: '/dashboard/inventory',
    icon: Package,
    label: 'Inventory',
  },
  {
    href: '/dashboard/earnings',
    icon: TrendingUp,
    label: 'Earnings',
  },
];

const BOTTOM_NAV = [
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-navy-900 text-white select-none">

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600
                          flex items-center justify-center shadow-glow-emerald">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-black tracking-tight leading-none">MedRush</div>
            <div className="text-[10px] text-white/40 mt-0.5 font-medium">Pharmacy Portal</div>
          </div>
        </div>
      </div>

      {/* ── Pharmacy Info ─────────────────────────────────────── */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-2xl bg-white/5 border border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-navy-600 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">AP</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">Apollo Pharmacy</div>
            <div className="text-[10px] text-white/40 truncate mt-0.5">Indiranagar, Bengaluru</div>
          </div>
          <div className="ml-auto shrink-0">
            <span className="flex items-center gap-1">
              <Circle size={7} className="text-emerald-400 fill-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-semibold">OPEN</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        <p className="section-title px-3 text-white/25 mb-2">Menu</p>
        {NAV.map((item) => {
          const active = path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-navy-600 text-white shadow-glow-navy'
                  : 'text-white/50 hover:text-white hover:bg-white/8',
              )}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              <span className="flex-1">{item.label}</span>
              {item.badge === 'live' && (
                <span className="flex items-center gap-1 text-[10px] font-semibold
                                 text-emerald-400 bg-emerald-400/10 rounded-full px-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom ───────────────────────────────────────────── */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/8 pt-3">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                         font-medium text-white/40 hover:text-white hover:bg-white/8 transition-all"
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                           font-medium text-white/40 hover:text-crimson-400 hover:bg-crimson-500/10
                           transition-all">
          <LogOut size={17} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
