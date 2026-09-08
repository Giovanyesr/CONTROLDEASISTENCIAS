import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const ADMIN_DNIS = ['75185427', '30916', '00030916'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminDni, dni, nombres, apellidos, celular, genero, rol, grado, seccion, apoderado_nombre, apoderado_celular, password } = body;

    if (!ADMIN_DNIS.includes(adminDni)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (!dni || dni.length !== 8 || !nombres || !apellidos || !rol || !password || password.length < 6) {
      return NextResponse.json({ error: 'Campos obligatorios: dni, nombres, apellidos, rol, password (6+ caracteres)' }, { status: 400 });
    }
    if (!['admin', 'director', 'tutor', 'brigadier', 'alumno'].includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if ((rol === 'tutor' || rol === 'brigadier' || rol === 'alumno') && (!grado || !seccion)) {
      return NextResponse.json({ error: 'Grado y sección requeridos para este rol' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('/rest/v1', '');
    const authRes = await fetch(`${authUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        email: `${dni}@colegio.local`,
        password,
        email_confirm: true,
        user_metadata: { dni, nombres, apellidos, rol },
      }),
    });

    if (!authRes.ok) {
      const authErr = await authRes.json();
      return NextResponse.json({ error: authErr.msg || 'Error al crear usuario' }, { status: 409 });
    }

    const authUser = await authRes.json();
    const perfil_id = authUser.id;
    const uuid_qr = crypto.randomUUID();

    const { error: errPerfil } = await supabase.from('perfiles').insert({
      id: perfil_id,
      dni,
      nombres,
      apellidos,
      celular: celular || null,
      genero: genero || null,
      foto_url: null,
      rol,
      estado: 'activo',
      uuid_qr,
    });

    if (errPerfil) {
      await fetch(`${authUrl}/auth/v1/admin/users/${perfil_id}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      });
      return NextResponse.json({ error: errPerfil.message }, { status: 409 });
    }

    // Only create alumno record for roles that need grade/section
    if (['tutor', 'brigadier', 'alumno'].includes(rol)) {
      const { error: errAlumno } = await supabase.from('alumnos').insert({
        perfil_id,
        grado: grado!.trim(),
        seccion: seccion!.trim().toUpperCase(),
        apoderado_nombre: apoderado_nombre || null,
        apoderado_celular: apoderado_celular || null,
      });

      if (errAlumno) {
        await supabase.from('perfiles').delete().eq('id', perfil_id);
        await fetch(`${authUrl}/auth/v1/admin/users/${perfil_id}`, {
          method: 'DELETE',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        });
        return NextResponse.json({ error: errAlumno.message }, { status: 409 });
      }
    }

    // If tutor, also create a record in tutor_asignaciones
    if (rol === 'tutor' && grado && seccion) {
      await supabase.from('tutor_asignaciones').insert({
        tutor_id: perfil_id,
        grado: grado.trim(),
        seccion: seccion.trim().toUpperCase(),
      }).then(({ error }) => {
        if (error && error.code !== '23505') {
          console.error('Error al asignar tutor:', error);
        }
      });
    }

    return NextResponse.json({ id: perfil_id, uuid_qr });
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
