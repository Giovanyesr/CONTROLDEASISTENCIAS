-- ============================================================
-- DÍAS NO LABORABLES (Feriados y Vacaciones)
-- Ejecutar en el Editor SQL de Supabase Dashboard
-- ============================================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS dias_no_laborables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('feriado', 'vacaciones')),
  descripcion VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fecha)
);

CREATE INDEX IF NOT EXISTS idx_dias_no_laborables_fecha ON dias_no_laborables(fecha);

-- RLS
ALTER TABLE dias_no_laborables ENABLE ROW LEVEL SECURITY;

CREATE POLICY dnl_select ON dias_no_laborables
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('brigadier', 'alumno'))
  );

CREATE POLICY dnl_insert ON dias_no_laborables
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

CREATE POLICY dnl_delete ON dias_no_laborables
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- INSERTAR FERIADOS 2025-2026
-- ============================================================

INSERT INTO dias_no_laborables (fecha, tipo, descripcion) VALUES
  ('2025-01-01', 'feriado', 'Año Nuevo'),
  ('2025-04-17', 'feriado', 'Jueves Santo'),
  ('2025-04-18', 'feriado', 'Viernes Santo'),
  ('2025-05-01', 'feriado', 'Día del Trabajo'),
  ('2025-06-29', 'feriado', 'San Pedro y San Pablo'),
  ('2025-07-28', 'feriado', 'Fiestas Patrias'),
  ('2025-07-29', 'feriado', 'Fiestas Patrias'),
  ('2025-08-06', 'feriado', 'Batalla de Junín'),
  ('2025-08-30', 'feriado', 'Santa Rosa de Lima'),
  ('2025-10-08', 'feriado', 'Combate de Angamos'),
  ('2025-11-01', 'feriado', 'Día de Todos los Santos'),
  ('2025-12-08', 'feriado', 'Inmaculada Concepción'),
  ('2025-12-25', 'feriado', 'Navidad'),
  ('2026-01-01', 'feriado', 'Año Nuevo'),
  ('2026-04-02', 'feriado', 'Jueves Santo'),
  ('2026-04-03', 'feriado', 'Viernes Santo'),
  ('2026-05-01', 'feriado', 'Día del Trabajo'),
  ('2026-06-29', 'feriado', 'San Pedro y San Pablo'),
  ('2026-07-28', 'feriado', 'Fiestas Patrias'),
  ('2026-07-29', 'feriado', 'Fiestas Patrias'),
  ('2026-08-06', 'feriado', 'Batalla de Junín'),
  ('2026-08-30', 'feriado', 'Santa Rosa de Lima'),
  ('2026-10-08', 'feriado', 'Combate de Angamos'),
  ('2026-11-01', 'feriado', 'Día de Todos los Santos'),
  ('2026-12-08', 'feriado', 'Inmaculada Concepción'),
  ('2026-12-25', 'feriado', 'Navidad')
ON CONFLICT (fecha) DO NOTHING;

-- ============================================================
-- INSERTAR VACACIONES BIMESTRALES 2026
-- ============================================================

-- Vacaciones I Bimestre (27 Abr - 1 May 2026)
INSERT INTO dias_no_laborables (fecha, tipo, descripcion) VALUES
  ('2026-04-27', 'vacaciones', 'Vacaciones I Bimestre'),
  ('2026-04-28', 'vacaciones', 'Vacaciones I Bimestre'),
  ('2026-04-29', 'vacaciones', 'Vacaciones I Bimestre'),
  ('2026-04-30', 'vacaciones', 'Vacaciones I Bimestre'),
  ('2026-05-01', 'vacaciones', 'Vacaciones I Bimestre')
ON CONFLICT (fecha) DO NOTHING;

-- Vacaciones II Bimestre (20 Jul - 24 Jul 2026)
INSERT INTO dias_no_laborables (fecha, tipo, descripcion) VALUES
  ('2026-07-20', 'vacaciones', 'Vacaciones II Bimestre'),
  ('2026-07-21', 'vacaciones', 'Vacaciones II Bimestre'),
  ('2026-07-22', 'vacaciones', 'Vacaciones II Bimestre'),
  ('2026-07-23', 'vacaciones', 'Vacaciones II Bimestre'),
  ('2026-07-24', 'vacaciones', 'Vacaciones II Bimestre')
ON CONFLICT (fecha) DO NOTHING;

-- Vacaciones III Bimestre (28 Sep - 2 Oct 2026)
INSERT INTO dias_no_laborables (fecha, tipo, descripcion) VALUES
  ('2026-09-28', 'vacaciones', 'Vacaciones III Bimestre'),
  ('2026-09-29', 'vacaciones', 'Vacaciones III Bimestre'),
  ('2026-09-30', 'vacaciones', 'Vacaciones III Bimestre'),
  ('2026-10-01', 'vacaciones', 'Vacaciones III Bimestre'),
  ('2026-10-02', 'vacaciones', 'Vacaciones III Bimestre')
ON CONFLICT (fecha) DO NOTHING;
