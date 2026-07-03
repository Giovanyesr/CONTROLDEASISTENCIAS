'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, QrCode, Users, History, FileCheck, UserCircle, ShieldCheck, CalendarOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['alumno', 'brigadier'] },
  { href: '/escaner', label: 'Escáner', icon: QrCode, roles: ['brigadier'] },
  { href: '/estudiantes', label: 'Estudiantes', icon: Users, roles: ['brigadier'] },
  { href: '/historial', label: 'Historial', icon: History, roles: ['alumno', 'brigadier'] },
  { href: '/justificaciones', label: 'Justificar', icon: FileCheck, roles: ['brigadier'] },
  { href: '/perfil', label: 'Perfil', icon: UserCircle, roles: ['alumno', 'brigadier'] },
  { href: '/brigadieres', label: 'Brigadieres', icon: ShieldCheck, roles: ['brigadier'] },
  { href: '/dias-no-laborables', label: 'No Laborables', icon: CalendarOff, roles: ['brigadier'] },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E0D5C0] bg-white/95 backdrop-blur-lg lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {top.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-200 active:scale-90',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
              <span>{item.label}</span>
              {active && <span className="h-0.5 w-4 rounded-full bg-primary mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
