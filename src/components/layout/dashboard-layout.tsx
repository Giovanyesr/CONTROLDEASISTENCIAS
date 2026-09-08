'use client';

import { Sidebar } from './sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Home } from 'lucide-react';
import Link from 'next/link';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  escaner: 'Escáner QR',
  estudiantes: 'Estudiantes',
  historial: 'Historial',
  justificaciones: 'Justificaciones',
  perfil: 'Mi Perfil',
  brigadieres: 'Brigadieres',
  'dias-no-laborables': 'Días No Laborables',
  roles: 'Gestión de usuarios',
  admin: 'Panel Admin',
};

const routeRoles: Record<string, string[]> = {
  escaner: ['brigadier'],
  estudiantes: ['admin', 'director', 'tutor', 'brigadier'],
  justificaciones: ['admin', 'director', 'tutor', 'brigadier'],
  brigadieres: ['brigadier'],
  'dias-no-laborables': ['admin'],
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const segment = pathname.split('/').filter(Boolean)[0];
  const requiredRoles = routeRoles[segment];

  useEffect(() => {
    if (!loading && user && requiredRoles && !requiredRoles.includes(user.rol)) {
      router.push('/dashboard');
    }
  }, [loading, user, requiredRoles, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-[#FAF8F5] to-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground/70 animate-breathe">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requiredRoles && !requiredRoles.includes(user.rol)) return null;

  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = breadcrumbMap[segment] || segment;
    const isLast = index === pathSegments.length - 1;
    return { href, label, isLast };
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border/80 bg-card/70 px-6 py-3 shadow-sm">
          <span className="text-sm font-semibold text-primary/80 tracking-wide mr-3 shrink-0">
            I.E. 30916 San Francisco de Asís
          </span>
          <span className="text-xs text-muted-foreground/30">|</span>
          <Link
            href="/dashboard"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.slice(1).map((crumb) => (
            <div key={crumb.href} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">/</span>
              {crumb.isLast ? (
                <span className="text-xs font-medium text-foreground">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-x-auto p-4 pb-20 lg:p-6 lg:pb-6">
          <div className="animate-fade-in-up" key={pathname}>
            {children}
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
