import { NextResponse } from 'next/server';
import { isServerAdmin } from '@/lib/server-auth';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  try {
    const { authorized } = await isServerAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { data: perfiles } = await supabase.from('perfiles').select('rol, estado');

    const counts: Record<string, number> = { admin: 0, director: 0, tutor: 0, brigadier: 0, alumno: 0 };
    let alumnosActivos = 0;
    for (const p of perfiles || []) {
      counts[p.rol] = (counts[p.rol] || 0) + 1;
      if (p.rol === 'alumno' && p.estado === 'activo') alumnosActivos++;
    }

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const { data: hoyAsist } = await supabase
      .from('asistencias')
      .select('estado')
      .eq('fecha', hoy);

    const asistenciaHoy: Record<string, number> = { presentes: 0, tardanzas: 0, faltas_justificadas: 0, faltas_injustificadas: 0 };
    for (const a of hoyAsist || []) {
      if (asistenciaHoy[a.estado] !== undefined) asistenciaHoy[a.estado]++;
    }

    const { count: totalAsistencias } = await supabase
      .from('asistencias')
      .select('*', { count: 'exact', head: true });

    const { count: tutorAsignaciones } = await supabase
      .from('tutor_asignaciones')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      counts,
      alumnosActivos,
      asistenciaHoy,
      totalAsistencias: totalAsistencias || 0,
      tutorAsignaciones: tutorAsignaciones || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
