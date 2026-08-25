'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
 
export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready,        setReady]        = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
 
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, []);
 
  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading AirTrack...</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        currentPath={pathname}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopNav onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}