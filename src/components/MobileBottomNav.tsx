'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, QrCode, Users, History, FileCheck, UserCircle, ShieldCheck, CalendarOff, LogOut, UserCog, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/escaner', label: 'Escáner', icon: QrCode, roles: ['brigadier'] },
  { href: '/estudiantes', label: 'Estudiantes', icon: Users, roles: ['admin', 'director', 'tutor', 'brigadier'] },
  { href: '/historial', label: 'Historial', icon: History, roles: ['director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/justificaciones', label: 'Justificar', icon: FileCheck, roles: ['admin', 'director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/notificaciones', label: 'Notif.', icon: Bell, roles: ['admin', 'director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/perfil', label: 'Perfil', icon: UserCircle, roles: ['admin', 'director', 'tutor', 'brigadier', 'alumno'] },
  { href: '/dias-no-laborables', label: 'No Laborables', icon: CalendarOff, roles: ['admin'] },
  { href: '/roles', label: 'Roles', icon: UserCog, roles: ['admin'] },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visible = items.filter((i) => i.roles.includes(user?.rol || ''));

  // Show max 5 items; pick the most relevant ones
  const priority: Record<string, number> = {
    escaner: 1,
    dashboard: 2,
    estudiantes: 3,
    historial: 4,
    perfil: 5,
    justificaciones: 6,
    brigadieres: 7,
    'dias-no-laborables': 8,
  };
  const top = visible.sort((a, b) => (priority[a.href.slice(1)] ?? 99) - (priority[b.href.slice(1)] ?? 99)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-white/90 backdrop-blur-xl lg:hidden safe-area-bottom shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-1 py-0.5">
        {top.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-200 active:scale-90',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground/60 hover:text-foreground'
              )}
            >
              <div className={cn(
                'flex items-center justify-center rounded-lg p-1 transition-all duration-200',
                active && 'bg-primary/10'
              )}>
                <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
              </div>
              <span>{item.label}</span>
              {active && <span className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-primary" />}
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-200 active:scale-90 text-muted-foreground/40 hover:text-red-500"
          title="Cerrar Sesión"
        >
          <div className="flex items-center justify-center rounded-lg p-1 transition-all duration-200">
            <LogOut className="h-5 w-5" />
          </div>
          <span>Salir</span>
        </button>
      </div>
    </nav>
  );
}
