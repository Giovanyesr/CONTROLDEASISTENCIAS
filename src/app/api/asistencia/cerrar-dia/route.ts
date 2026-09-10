import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { getPeruDate } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
    }
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const isCron = cronSecret && authHeader === cronSecret;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    let brigadierId: string;

    if (isCron) {
      const { data: primerBrigadier } = await supabase
        .from('perfiles')
        .select('id')
        .eq('rol', 'brigadier')
        .eq('estado', 'activo')
        .limit(1)
        .single();
      let automaticoId = primerBrigadier?.id;
      if (!automaticoId) {
        const { data: funcional } = await supabase
          .from('roles_funcionales')
          .select('perfil_id')
          .eq('rol', 'brigadier')
          .eq('activo', true)
          .limit(1)
          .maybeSingle();
        automaticoId = funcional?.perfil_id;
      }
      if (!automaticoId) {
        return NextResponse.json({ error: 'No hay brigadieres registrados' }, { status: 400 });
      }
      brigadierId = automaticoId;
    } else {
      const { supabase: authClient, user: authUser } = await getServerSession();
      if (!authUser) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const { data: brigadier } = await authClient.rpc('is_brigadier');
      if (brigadier !== true) {
        return NextResponse.json({ error: 'Solo brigadieres pueden cerrar la asistencia' }, { status: 403 });
      }
      brigadierId = authUser.id;
    }

    const { data, error } = await supabase.rpc('registrar_faltas_diarias', {
      p_brigadier_id: brigadierId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('cierres_diarios').upsert({
      fecha: getPeruDate(),
      ejecutado_por: isCron ? null : brigadierId,
      automatico: Boolean(isCron),
      resultado: data?.length ? 'completado' : 'sin_faltas',
      faltas_generadas: data?.length || 0,
    }, { onConflict: 'fecha' });

    return NextResponse.json({
      message: `Se registraron ${data?.length || 0} faltas automáticas`,
      faltas: data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
