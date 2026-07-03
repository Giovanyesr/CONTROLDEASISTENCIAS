import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, dni, nombres, apellidos, celular, grado, seccion, apoderado_nombre, apoderado_celular, password } = body;

    if (!id || !dni || !nombres || !apellidos || !grado || !seccion) {
      return NextResponse.json({ error: 'Campos obligatorios faltantes' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { error: errPerfil } = await supabase.from('perfiles').update({
      dni, nombres, apellidos, celular: celular || null,
    }).eq('id', id);

    if (errPerfil) {
      return NextResponse.json({ error: errPerfil.message }, { status: 409 });
    }

    const { error: errAlumno } = await supabase.from('alumnos').update({
      grado, seccion,
      apoderado_nombre: apoderado_nombre || null,
      apoderado_celular: apoderado_celular || null,
    }).eq('perfil_id', id);

    if (errAlumno) {
      return NextResponse.json({ error: errAlumno.message }, { status: 409 });
    }

    if (password && password.length >= 6) {
      const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('/rest/v1', '');
      await fetch(`${authUrl}/auth/v1/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ password }),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
