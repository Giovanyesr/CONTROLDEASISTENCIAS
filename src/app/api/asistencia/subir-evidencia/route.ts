import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const asistencia_id = formData.get('asistencia_id') as string | null;

    if (!file || !asistencia_id) {
      return NextResponse.json({ error: 'Archivo y asistencia_id requeridos' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const fileName = `evidencia-${asistencia_id}-${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('evidencias')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName);

    // Find the justificacion id for this asistencia
    const { data: justs } = await supabase
      .from('justificaciones')
      .select('id')
      .eq('asistencia_id', asistencia_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!justs || justs.length === 0) {
      return NextResponse.json({ error: 'Justificación no encontrada' }, { status: 404 });
    }

    const { error: insertError } = await supabase.from('evidencias').insert({
      justificacion_id: justs[0].id,
      nombre_archivo: file.name,
      url: urlData.publicUrl,
      tipo_mime: file.type,
      tamano_bytes: file.size,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
