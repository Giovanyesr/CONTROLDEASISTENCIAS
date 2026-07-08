import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const ADMIN_DNIS = ['75185427', '30916'];

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, adminDni, nombres, apellidos, celular, genero, estado, grado, seccion, apoderado_nombre, apoderado_celular } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    // If admin fields are present, verify admin access
    if ((nombres !== undefined || apellidos !== undefined || estado !== undefined || grado !== undefined || seccion !== undefined) && !ADMIN_DNIS.includes(adminDni)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Perfiles updates
    const perfilesUpdates: Record<string, any> = {};
    if (celular !== undefined) perfilesUpdates.celular = celular || null;
    if (genero !== undefined) perfilesUpdates.genero = genero || null;
    if (nombres !== undefined) perfilesUpdates.nombres = nombres;
    if (apellidos !== undefined) perfilesUpdates.apellidos = apellidos;
    if (estado !== undefined) perfilesUpdates.estado = estado;

    if (Object.keys(perfilesUpdates).length > 0) {
      const { error } = await supabase
        .from('perfiles')
        .update(perfilesUpdates)
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Alumnos updates
    const alumnosUpdates: Record<string, any> = {};
    if (apoderado_nombre !== undefined) alumnosUpdates.apoderado_nombre = apoderado_nombre || null;
    if (apoderado_celular !== undefined) alumnosUpdates.apoderado_celular = apoderado_celular || null;
    if (grado !== undefined) alumnosUpdates.grado = grado;
    if (seccion !== undefined) alumnosUpdates.seccion = seccion;

    if (Object.keys(alumnosUpdates).length > 0) {
      const { error } = await supabase
        .from('alumnos')
        .update(alumnosUpdates)
        .eq('perfil_id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
