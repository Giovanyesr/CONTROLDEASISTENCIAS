import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('configuracion_asistencia')
    .select('inicio, limite_presente, limite_tardanza')
    .eq('id', 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { inicio, limite_presente, limite_tardanza } = await request.json();

  if (!inicio || !limite_presente || !limite_tardanza) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  if (!timeRegex.test(inicio) || !timeRegex.test(limite_presente) || !timeRegex.test(limite_tardanza)) {
    return NextResponse.json({ error: 'Formato de hora inválido (use HH:mm:ss)' }, { status: 400 });
  }

  const { error } = await supabase
    .from('configuracion_asistencia')
    .update({ inicio, limite_presente, limite_tardanza, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Intervalos actualizados correctamente' });
}
