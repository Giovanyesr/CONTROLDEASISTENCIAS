import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const { usuario_id, nuevo_rol } = await request.json();

    if (!usuario_id || !nuevo_rol || !['alumno', 'brigadier'].includes(nuevo_rol)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { error: errAuth } = await supabase.auth.admin.updateUserById(usuario_id, {
      user_metadata: { rol: nuevo_rol },
    });
    if (errAuth) return NextResponse.json({ error: errAuth.message }, { status: 500 });

    const { error: errPerfil } = await supabase
      .from('perfiles')
      .update({ rol: nuevo_rol })
      .eq('id', usuario_id);

    if (errPerfil) return NextResponse.json({ error: errPerfil.message }, { status: 500 });

    return NextResponse.json({ success: true, rol: nuevo_rol });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
