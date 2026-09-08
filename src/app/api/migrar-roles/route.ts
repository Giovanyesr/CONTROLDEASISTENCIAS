import { NextResponse } from 'next/server';

const ADMIN_DNIS = ['75185427', '30916', '00030916'];

export async function POST(request: Request) {
  try {
    const { adminDni } = await request.json();
    if (!ADMIN_DNIS.includes(adminDni)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const sql = `CREATE TABLE IF NOT EXISTS tutor_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  grado TEXT NOT NULL,
  seccion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tutor_id, grado, seccion)
);
ALTER TABLE tutor_asignaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins ven todas las asignaciones" ON tutor_asignaciones;
CREATE POLICY "Admins ven todas las asignaciones" ON tutor_asignaciones FOR SELECT USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'director')));
DROP POLICY IF EXISTS "Tutores ven sus asignaciones" ON tutor_asignaciones;
CREATE POLICY "Tutores ven sus asignaciones" ON tutor_asignaciones FOR SELECT USING (tutor_id = auth.uid());
DROP POLICY IF EXISTS "Admins gestionan asignaciones" ON tutor_asignaciones;
CREATE POLICY "Admins gestionan asignaciones" ON tutor_asignaciones FOR ALL USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON perfiles;
CREATE POLICY "Usuarios ven su propio perfil o admins/directores ven todo" ON perfiles FOR SELECT USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'director'))
);
UPDATE perfiles SET rol = 'admin' WHERE dni IN ('75185427', '30916', '00030916') AND rol != 'admin';`;

    // Try the Supabase Management API database/query endpoint
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (mgmtRes.ok) {
      return NextResponse.json({ success: true, method: 'mgmt-api' });
    }

    const mgmtErr = await mgmtRes.text();

    // Fallback: try the REST API sql endpoint
    const restRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'params=sql',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (restRes.ok) {
      return NextResponse.json({ success: true, method: 'rest-sql' });
    }

    const restErr = await restRes.text();

    return NextResponse.json({
      error: 'No se pudo ejecutar la migración automáticamente',
      details: {
        mgmtApi: mgmtErr.substring(0, 200),
        restApi: restErr.substring(0, 200),
      },
      suggestion: 'Ejecuta el SQL manualmente en el SQL Editor de Supabase (https://supabase.com/dashboard/project/stbqlulxmorzpivxbeoa/sql/new)',
      sql,
    }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
