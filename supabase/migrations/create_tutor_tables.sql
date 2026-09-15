-- =============================================
-- Migración: Tablas para funcionalidades del Tutor
-- =============================================

-- 1. Tabla de observaciones (agenda digital del tutor)
CREATE TABLE IF NOT EXISTS observaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  alumno_nombre TEXT NOT NULL,
  alumno_dni TEXT NOT NULL,
  grado TEXT,
  seccion TEXT,
  observacion TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'general',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por UUID REFERENCES perfiles(id),
  registrado_por_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observaciones_alumno_id ON observaciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_observaciones_grado ON observaciones(grado);
CREATE INDEX IF NOT EXISTS idx_observaciones_fecha ON observaciones(fecha);

ALTER TABLE observaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_pueden_leer_observaciones"
  ON observaciones FOR SELECT TO authenticated USING (true);

CREATE POLICY "tutores_directores_pueden_insertar_observaciones"
  ON observaciones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('director', 'tutor')
    )
  );

CREATE POLICY "tutores_directores_pueden_eliminar_observaciones"
  ON observaciones FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('director', 'tutor')
    )
  );

-- 2. Tabla de notas de comportamiento
CREATE TABLE IF NOT EXISTS notas_comportamiento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  alumno_nombre TEXT NOT NULL,
  alumno_dni TEXT NOT NULL,
  grado TEXT,
  seccion TEXT,
  bimestre INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  nota NUMERIC(3,1),
  observaciones TEXT,
  registrado_por UUID REFERENCES perfiles(id),
  registrado_por_nombre TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, bimestre, ano)
);

CREATE INDEX IF NOT EXISTS idx_notas_comportamiento_alumno_id ON notas_comportamiento(alumno_id);
CREATE INDEX IF NOT EXISTS idx_notas_comportamiento_grado ON notas_comportamiento(grado);
CREATE INDEX IF NOT EXISTS idx_notas_comportamiento_bimestre ON notas_comportamiento(bimestre, ano);

ALTER TABLE notas_comportamiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_pueden_leer_notas_comportamiento"
  ON notas_comportamiento FOR SELECT TO authenticated USING (true);

CREATE POLICY "tutores_directores_pueden_upsert_notas"
  ON notas_comportamiento FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('director', 'tutor')
    )
  );

CREATE POLICY "tutores_directores_pueden_actualizar_notas"
  ON notas_comportamiento FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('director', 'tutor')
    )
  );

-- 3. Tabla de llamadas de atención (de brigadieres)
CREATE TABLE IF NOT EXISTS llamadas_atencion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  alumno_nombre TEXT NOT NULL,
  alumno_dni TEXT NOT NULL,
  grado TEXT,
  seccion TEXT,
  motivo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por UUID REFERENCES perfiles(id),
  registrado_por_nombre TEXT,
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llamadas_atencion_alumno_id ON llamadas_atencion(alumno_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_atencion_grado ON llamadas_atencion(grado);
CREATE INDEX IF NOT EXISTS idx_llamadas_atencion_leido ON llamadas_atencion(leido);

ALTER TABLE llamadas_atencion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_pueden_leer_llamadas_atencion"
  ON llamadas_atencion FOR SELECT TO authenticated USING (true);

CREATE POLICY "brigadieres_pueden_insertar_llamadas"
  ON llamadas_atencion FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'brigadier'
    )
  );

CREATE POLICY "tutores_pueden_marcar_leido"
  ON llamadas_atencion FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('director', 'tutor')
    )
  );

-- 4. Campo firma del apoderado en tabla alumnos
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS firma_apoderado TEXT;
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS firma_apoderado_url TEXT;
