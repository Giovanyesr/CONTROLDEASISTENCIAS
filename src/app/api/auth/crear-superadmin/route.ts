import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { adminDni } = await request.json();

    if (!['75185427', '30916'].includes(adminDni)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const DNI = '30916';
    const EMAIL = `${DNI}@colegio.local`;
    const PASSWORD = '123456';
    const NOMBRES = 'Admin';
    const APELLIDOS = 'Sistema';

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('/rest/v1', '');

    // Check if user already exists
    const checkRes = await fetch(`${authUrl}/auth/v1/admin/users?filter%5Bemail%5D=eq.${encodeURIComponent(EMAIL)}`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` },
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'El usuario 30916 ya existe' }, { status: 409 });
      }
    }

    // Create auth user
    const authRes = await fetch(`${authUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { dni: DNI, nombres: NOMBRES, apellidos: APELLIDOS, rol: 'brigadier' },
      }),
    });

    if (!authRes.ok) {
      const err = await authRes.json();
      return NextResponse.json({ error: err.msg || 'Error creando usuario' }, { status: 409 });
    }

    const authUser = await authRes.json();
    const perfilId = authUser.id;
    const uuidQr = crypto.randomUUID();

    const { error: errPerfil } = await supabase.from('perfiles').insert({
      id: perfilId, dni: DNI, nombres: NOMBRES, apellidos: APELLIDOS,
      celular: null, foto_url: null, rol: 'brigadier', estado: 'activo', uuid_qr: uuidQr,
    });

    if (errPerfil) {
      await fetch(`${authUrl}/auth/v1/admin/users/${perfilId}`, {
        method: 'DELETE', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` },
      });
      return NextResponse.json({ error: errPerfil.message }, { status: 409 });
    }

    const { error: errAlumno } = await supabase.from('alumnos').insert({
      perfil_id: perfilId, grado: '5°', seccion: 'A',
      apoderado_nombre: 'Admin Sistema', apoderado_celular: null,
    });

    if (errAlumno) {
      await supabase.from('perfiles').delete().eq('id', perfilId);
      await fetch(`${authUrl}/auth/v1/admin/users/${perfilId}`, {
        method: 'DELETE', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` },
      });
      return NextResponse.json({ error: errAlumno.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, dni: DNI, password: PASSWORD });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
