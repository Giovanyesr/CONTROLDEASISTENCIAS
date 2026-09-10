import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPeruDate } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    let asistencia_id = formData.get('asistencia_id') as string | null;
    const motivo = formData.get('motivo') as string | null;
    const file = formData.get('file') as File | null;

    if (!asistencia_id || !motivo?.trim()) {
      return NextResponse.json({ error: 'asistencia_id y motivo requeridos' }, { status: 400 });
    }

    const svc = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    let solicitudData: any = null;

    // La RPC crea la falta y la solicitud dentro de la misma transaccion.
    if (asistencia_id.startsWith('fecha:')) {
      const fecha = asistencia_id.replace('fecha:', '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > getPeruDate()) {
        return NextResponse.json({ error: 'La fecha de la falta no es válida' }, { status: 400 });
      }
      const { data, error } = await supabase.rpc('solicitar_justificacion_por_fecha', {
        p_fecha: fecha,
        p_motivo: motivo.trim(),
      });
      if (error || !data?.exito) {
        return NextResponse.json({ error: error?.message || data?.mensaje || 'No se pudo enviar la solicitud' }, { status: 400 });
      }
      asistencia_id = data.asistencia_id;
      solicitudData = data;
    }

    const { data, error } = solicitudData
      ? { data: solicitudData, error: null }
      : await supabase.rpc('solicitar_justificacion', {
          p_asistencia_id: asistencia_id,
          p_motivo: motivo.trim(),
        });

    if (error || !data?.exito) {
      return NextResponse.json({ error: error?.message || data?.mensaje || 'No se pudo enviar la solicitud' }, { status: 400 });
    }

    if (file && file.size > 0) {
      const { data: justs } = await supabase
        .from('justificaciones')
        .select('id')
        .eq('asistencia_id', asistencia_id)
        .eq('estado', 'pendiente')
        .maybeSingle();

      if (justs) {
        const ext = file.name.split('.').pop();
        const fileName = `evidencia-${justs.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await svc.storage
          .from('evidencias')
          .upload(fileName, file, { contentType: file.type });
        if (!uploadError) {
          await svc.from('evidencias').insert({
            justificacion_id: justs.id,
            nombre_archivo: file.name,
            url: fileName,
            tipo_mime: file.type,
            tamano_bytes: file.size,
          });
        }
      }
    }

    return NextResponse.json({ success: true, mensaje: data.mensaje });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
