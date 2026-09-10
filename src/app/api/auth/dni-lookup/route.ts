import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const { dni } = await request.json();

    const { supabase: authClient, user } = await getServerSession();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { data: staff } = await authClient.rpc('is_staff');
    const ownDni = user.email?.split('@')[0];
    if (staff !== true && ownDni !== dni) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    if (!dni || dni.length !== 8) {
      return NextResponse.json({ error: 'DNI inválido' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('id, dni, nombres, apellidos, celular, foto_url, genero, rol, estado, created_at, updated_at')
      .eq('dni', dni)
      .single();

    if (error || !perfil) {
      return NextResponse.json({ error: 'DNI no encontrado' }, { status: 404 });
    }

    return NextResponse.json(perfil);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
