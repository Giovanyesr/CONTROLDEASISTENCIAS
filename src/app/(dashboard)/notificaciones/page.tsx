'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, BellOff, Inbox, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';

export default function NotificacionesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    load();

    const canal = supabase
      .channel('mis-notificaciones')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [user, supabase]);

  const marcarLeida = async (id: string) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodas = async () => {
    const pendientes = items.filter(n => !n.leida);
    if (pendientes.length === 0) return;
    const ids = pendientes.map(n => n.id);
    await supabase.from('notificaciones').update({ leida: true }).in('id', ids);
    setItems(prev => prev.map(n => n.leida ? n : { ...n, leida: true }));
    toast.success('Notificaciones marcadas como leídas');
  };

  const pendientes = items.filter(n => !n.leida).length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Notificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendientes > 0 ? `Tienes ${pendientes} sin leer.` : 'No tienes notificaciones pendientes.'}
          </p>
        </div>
        {pendientes > 0 && (
          <Button variant="outline" className="gap-2 rounded-lg self-start sm:self-auto" onClick={marcarTodas}>
            <CheckCheck className="h-4 w-4" /> Marcar todas como leídas
          </Button>
        )}
      </div>

      <Card className="shadow-card">
        {loading ? (
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-lg" />)}
          </CardContent>
        ) : items.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <BellOff className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Sin notificaciones</p>
              <p className="mt-1 text-sm text-muted-foreground">Aquí aparecerán tus avisos importantes.</p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="divide-y divide-border/60 p-0">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.leida && marcarLeida(n.id)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40 ${n.leida ? '' : 'bg-primary/[0.04]'}`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${n.leida ? 'bg-muted' : 'bg-primary/10'}`}>
                  <Bell className={`h-4 w-4 ${n.leida ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{n.titulo}</p>
                    {!n.leida && <Badge className="rounded-md bg-primary text-primary-foreground text-[10px]">Nuevo</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.mensaje}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
