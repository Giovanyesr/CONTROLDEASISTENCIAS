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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { authorized } = await isServerAdmin();
    if (!authorized) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const body = await request.json();
    const { tutor_id, grado, seccion } = body;

    if (!tutor_id || !grado || !seccion) {
      return NextResponse.json({ error: 'tutor_id, grado y seccion requeridos' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { error } = await supabase.from('tutor_asignaciones').insert({
      tutor_id,
      grado: grado.trim(),
      seccion: seccion.trim().toUpperCase(),
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El tutor ya está asignado a este grado/sección' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
