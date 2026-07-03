import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { dni } = await request.json();

    if (!dni || dni.length !== 8) {
      return NextResponse.json({ error: 'DNI inválido' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('dni', dni)
      .single();

    if (error || !perfil) {
      return NextResponse.json({ error: 'DNI no encontrado' }, { status: 404 });
    }

    return NextResponse.json(perfil);
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
