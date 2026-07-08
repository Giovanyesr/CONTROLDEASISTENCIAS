import { NextResponse } from 'next/server';

const ADMIN_DNIS = ['75185427', '30916'];

export async function POST(request: Request) {
  try {
    const { adminDni } = await request.json();
    if (!ADMIN_DNIS.includes(adminDni)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const headers = {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    const sql = `
      CREATE TABLE IF NOT EXISTS tutor_asignaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tutor_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
        grado TEXT NOT NULL,
        seccion TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(tutor_id, grado, seccion)
      );

      ALTER TABLE tutor_asignaciones ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admins ven todas las asignaciones" ON tutor_asignaciones;
      CREATE POLICY "Admins ven todas las asignaciones" ON tutor_asignaciones
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'director'))
        );

      DROP POLICY IF EXISTS "Tutores ven sus asignaciones" ON tutor_asignaciones;
      CREATE POLICY "Tutores ven sus asignaciones" ON tutor_asignaciones
        FOR SELECT USING (tutor_id = auth.uid());

      DROP POLICY IF EXISTS "Admins gestionan asignaciones" ON tutor_asignaciones;
      CREATE POLICY "Admins gestionan asignaciones" ON tutor_asignaciones
        FOR ALL USING (
          EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
        );

      DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON perfiles;
      CREATE POLICY "Usuarios ven su propio perfil o admins/directores ven todo" ON perfiles
        FOR SELECT USING (
          id = auth.uid()
          OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'director'))
        );

      UPDATE perfiles SET rol = 'admin' WHERE dni IN ('75185427', '30916') AND rol != 'admin';
    `;

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
