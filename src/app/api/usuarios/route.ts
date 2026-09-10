import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isServerAdmin } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const { authorized } = await isServerAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rol = searchParams.get('rol');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    let query = supabase.from('perfiles').select('*, alumno:alumnos(*), roles_funcionales(rol, activo)').order('apellidos', { ascending: true });
    if (rol) query = query.eq('rol', rol);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
