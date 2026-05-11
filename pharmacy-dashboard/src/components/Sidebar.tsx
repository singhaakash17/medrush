'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const NAV = [
  { href: '/dashboard/orders',    icon: '📋', label: 'Orders' },
  { href: '/dashboard/inventory', icon: '💊', label: 'Inventory' },
  { href: '/dashboard/earnings',  icon: '💰', label: 'Earnings' },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 min-h-screen bg-[#0c4a6e] text-white flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="text-xl font-black tracking-tight">MedRush</div>
        <div className="text-xs text-sky-300 mt-0.5">Pharmacy Partner Portal</div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
              path.startsWith(item.href)
                ? 'bg-sky-500 text-white'
                : 'text-sky-200 hover:bg-white/10',
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 text-xs text-sky-400">
        Bengaluru · Active
      </div>
    </aside>
  );
}
