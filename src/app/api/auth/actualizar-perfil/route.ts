import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, celular, apoderado_celular } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    if (celular !== undefined) {
      const { error } = await supabase
        .from('perfiles')
        .update({ celular: celular || null })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (apoderado_celular !== undefined) {
      const { error } = await supabase
        .from('alumnos')
        .update({ apoderado_celular: apoderado_celular || null })
        .eq('perfil_id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
