'use client';

import { createClient } from '@/lib/supabase/client';
import type { Perfil, Rol } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const loadProfile = async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) => {
    // 1. Try direct DB query by auth ID (works when IDs match or is a brigadier)
    const { data: byId } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (byId) { setUser(byId); return byId; }

    // 2. Look up by DNI via server-side API (bypasses RLS with service_role)
    if (authUser.email) {
      const dni = authUser.email.split('@')[0];
      if (dni?.length === 8) {
        try {
          const res = await fetch('/api/auth/dni-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni }),
          });
          if (res.ok) {
            const perfil = await res.json() as Perfil;
            setUser(perfil);
            return perfil;
          }
        } catch {}
      }
    }

    // 3. Fallback: build profile from auth user metadata
    const meta = authUser.user_metadata ?? {};
    if (meta.dni) {
      const perfil: Perfil = {
        id: authUser.id,
        dni: meta.dni as string,
        nombres: (meta.nombres as string) ?? (meta.full_name as string) ?? authUser.email?.split('@')[0] ?? '',
        apellidos: (meta.apellidos as string) ?? '',
        celular: null,
        foto_url: null,
        genero: null,
        rol: ((meta.rol ?? meta.role) as Rol | undefined) ?? 'alumno',
        estado: 'activo',
        uuid_qr: '',
        created_at: '',
        updated_at: '',
      };
      setUser(perfil);
      return perfil;
    }

    setUser(null);
    return null;
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await loadProfile(authUser);
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (dni: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${dni}@colegio.local`,
      password,
    });

    if (error || !data.user) throw new Error('Credenciales inválidas');

    const perfil = await loadProfile(data.user);
    await supabase.from('sesiones').upsert({
      usuario_id: data.user.id,
      ultimo_acceso: new Date().toISOString(),
      activo: true,
    }, { onConflict: 'usuario_id' });

    router.push(perfil?.rol === 'admin' ? '/admin' : '/dashboard');
    router.refresh();
  };

  const logout = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.from('sesiones').update({ activo: false }).eq('usuario_id', authUser.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const recoveryPassword = async (dni: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      `${dni}@colegio.local`,
      { redirectTo: `${window.location.origin}/auth/callback` }
    );

    if (error) throw error;
  };

  const refreshProfile = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await loadProfile(authUser);
    }
  };

  return { user, loading, login, logout, recoveryPassword, refreshProfile };
}
