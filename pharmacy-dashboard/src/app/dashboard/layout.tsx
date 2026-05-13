import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-50">
      <div className="sticky top-0 h-screen shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
