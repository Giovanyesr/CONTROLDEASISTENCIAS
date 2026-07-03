import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const { alumno_id, fecha, motivo, brigadier_id } = await request.json();

    if (!alumno_id || !fecha || !motivo) {
      return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const brigadier = brigadier_id || alumno_id;

    // Check if there's already a record for this date
    const { data: existing } = await supabase
      .from('asistencias')
      .select('id, estado')
      .eq('alumno_id', alumno_id)
      .eq('fecha', fecha)
      .maybeSingle();

    let asistenciaId: string;
    let estadoAnterior: string;

    if (existing) {
      asistenciaId = existing.id;
      estadoAnterior = existing.estado;
      await supabase
        .from('asistencias')
        .update({ estado: 'falta_justificada', observaciones: motivo })
        .eq('id', asistenciaId);
    } else {
      // No record exists - create it already justified
      asistenciaId = randomUUID();
      estadoAnterior = 'falta_injustificada';

      const { error: errAsis } = await supabase.from('asistencias').insert({
        id: asistenciaId,
        alumno_id,
        brigadier_id: brigadier,
        fecha,
        hora: '00:00:00',
        estado: 'falta_justificada',
        observaciones: motivo,
      });

      if (errAsis) {
        return NextResponse.json({ error: errAsis.message }, { status: 409 });
      }
    }

    // Always create justification record
    const { error: errJust } = await supabase.from('justificaciones').insert({
      asistencia_id: asistenciaId,
      brigadier_id: brigadier,
      estado_anterior: estadoAnterior,
      estado_nuevo: 'falta_justificada',
      motivo,
    });

    if (errJust) {
      return NextResponse.json({ error: errJust.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, asistencia_id: asistenciaId });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
