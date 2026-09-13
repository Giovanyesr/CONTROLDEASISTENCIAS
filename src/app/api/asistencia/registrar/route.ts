import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

export async function POST(request: Request) {
  const { supabase, user } = await getServerSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: esBrigadier, error: rolError } = await supabase.rpc('is_brigadier');
  if (rolError || esBrigadier !== true) {
    return NextResponse.json({ error: 'Solo brigadieres funcionales pueden registrar asistencia' }, { status: 403 });
  }

  let body: { uuid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  if (!body.uuid || typeof body.uuid !== 'string') {
    return NextResponse.json({ error: 'Código QR requerido' }, { status: 400 });
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const { data, error } = await supabase.rpc('registrar_asistencia_qr_fijo_segura', {
    p_alumno_uuid: body.uuid,
    p_brigadier_id: user.id,
    p_ip: ip,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: data?.exito ? 200 : 422 });
}
