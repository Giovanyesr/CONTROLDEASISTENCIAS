import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isServerAdmin } from '@/lib/server-auth';

export async function PUT(request: Request) {
  try {
    const { usuario_id, activo } = await request.json();
    const { authorized } = await isServerAdmin();
    if (!usuario_id || typeof activo !== 'boolean' || !authorized) {
      return NextResponse.json({ error: 'No autorizado o parámetros inválidos' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { error } = await supabase.from('roles_funcionales').upsert({
      perfil_id: usuario_id,
      rol: 'brigadier',
      activo,
    }, { onConflict: 'perfil_id,rol' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, activo });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
