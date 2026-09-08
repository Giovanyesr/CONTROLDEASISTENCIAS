import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
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
      if (!primerBrigadier) {
        return NextResponse.json({ error: 'No hay brigadieres registrados' }, { status: 400 });
      }
      brigadierId = primerBrigadier.id;
    } else {
      const cookieStore = await cookies();
      const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: () => {},
          },
        }
      );
      const { data: { user: authUser } } = await supabaseAuth.auth.getUser();
      if (!authUser) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', authUser.id)
        .single();
      if (!perfil || perfil.rol !== 'brigadier') {
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

    return NextResponse.json({
      message: `Se registraron ${data?.length || 0} faltas automáticas`,
      faltas: data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
