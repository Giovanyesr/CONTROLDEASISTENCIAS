import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    const { justificacion_id, decision, motivo_rechazo } = await request.json();

    if (!justificacion_id || !decision || !['aprobada', 'rechazada'].includes(decision)) {
      return NextResponse.json({ error: 'justificacion_id y decision (aprobada|rechazada) requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('revisar_justificacion', {
      p_justificacion_id: justificacion_id,
      p_decision: decision,
      p_motivo_rechazo: motivo_rechazo || null,
    });

    if (error || !data?.exito) {
      return NextResponse.json({ error: error?.message || data?.mensaje || 'No se pudo revisar la solicitud' }, { status: 403 });
    }

    return NextResponse.json({ success: true, mensaje: data.mensaje });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}