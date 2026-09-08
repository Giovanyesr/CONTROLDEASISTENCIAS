'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useNotificaciones() {
  const { user } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const cargar = async () => {
      const { count } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);
      setNoLeidas(count || 0);
    };

    cargar();

    const canal = supabase
      .channel('notif-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` }, () => cargar())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` }, () => cargar())
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [user]);

  return noLeidas;
}