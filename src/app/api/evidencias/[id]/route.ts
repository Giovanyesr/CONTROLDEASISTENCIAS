import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: staff } = await auth.rpc('is_staff');
  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { id } = await params;
  const { data: evidencia } = await service.from('evidencias').select('id, url, justificacion_id').eq('id', id).maybeSingle();
  if (!evidencia) return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });

  if (staff !== true) {
    const { data: justificacion } = await service.from('justificaciones').select('alumno_id, asistencia:asistencias(alumno_id)').eq('id', evidencia.justificacion_id).maybeSingle();
    const relation = justificacion as any;
    const alumnoId = relation?.alumno_id || (Array.isArray(relation?.asistencia) ? relation.asistencia[0]?.alumno_id : relation?.asistencia?.alumno_id);
    if (alumnoId !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const path = evidencia.url.includes('/evidencias/') ? evidencia.url.split('/evidencias/')[1] : evidencia.url;
  const { data: signed, error } = await service.storage.from('evidencias').createSignedUrl(path, 300);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: 'Evidencia no disponible' }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
