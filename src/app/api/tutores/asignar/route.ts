import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isServerAdmin } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const { authorized } = await isServerAdmin();
    if (!authorized) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutor_id');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    let query = supabase.from('tutor_asignaciones').select('*');
    if (tutorId) query = query.eq('tutor_id', tutorId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Error al obtener asignaciones' }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { authorized } = await isServerAdmin();
    if (!authorized) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const body = await request.json();
    const { tutor_id, grado, seccion, asignaciones } = body;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    // Count existing assignments
    const { count } = await supabase
      .from('tutor_asignaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', tutor_id);

    const lista = asignaciones || (grado && seccion ? [{ grado, seccion }] : []);
    if (lista.length === 0) {
      return NextResponse.json({ error: 'grado y seccion requeridos' }, { status: 400 });
    }

    if ((count || 0) + lista.length > 3) {
      return NextResponse.json({ error: `El tutor ya tiene ${count} grado(s). Maximo 3 en total.` }, { status: 400 });
    }

    const rows = lista.map((a: any) => ({
      tutor_id,
      grado: a.grado.trim(),
      seccion: a.seccion.trim().toUpperCase(),
    }));

    const { error } = await supabase.from('tutor_asignaciones').insert(rows);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El tutor ya esta asignado a este grado/seccion' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Error al asignar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    const { authorized } = await isServerAdmin();
    if (!authorized) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { error } = await supabase.from('tutor_asignaciones').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
