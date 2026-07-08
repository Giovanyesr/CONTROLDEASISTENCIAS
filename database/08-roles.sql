-- Migración: roles del sistema (director, tutor, admin) + tabla de asignación de tutores

-- 1. Crear tabla de asignación tutor -> grado/sección
CREATE TABLE IF NOT EXISTS tutor_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  grado TEXT NOT NULL,
  seccion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tutor_id, grado, seccion)
);

-- 2. RLS para tutor_asignaciones
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

-- 3. Actualizar RLS de perfiles para que directores y admins vean todos los perfiles
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON perfiles;
CREATE POLICY "Usuarios ven su propio perfil o admins/directores ven todo" ON perfiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'director'))
  );

-- 4. Actualizar a los super-admins existentes (75185427 y 30916) al nuevo rol 'admin'
UPDATE perfiles SET rol = 'admin' WHERE dni IN ('75185427', '30916') AND rol != 'admin';
