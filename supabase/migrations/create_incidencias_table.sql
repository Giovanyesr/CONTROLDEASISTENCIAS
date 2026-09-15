-- Tabla de incidencias de comportamiento
CREATE TABLE IF NOT EXISTS incidencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  alumno_nombre TEXT NOT NULL,
  alumno_dni TEXT NOT NULL,
  grado TEXT,
  tipo TEXT NOT NULL DEFAULT 'conducta',
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por UUID REFERENCES perfiles(id),
  registrado_por_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_incidencias_alumno_id ON incidencias(alumno_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_grado ON incidencias(grado);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON incidencias(fecha);
CREATE INDEX IF NOT EXISTS idx_incidencias_tipo ON incidencias(tipo);

-- RLS (Row Level Security)
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;

-- Politica: cualquier usuario autenticado puede leer
CREATE POLICY "usuarios_pueden_leer_incidencias"
  ON incidencias FOR SELECT
  TO authenticated
  USING (true);

-- Politica: directores, tutores y brigadieres pueden insertar
CREATE POLICY "directores_tutores_brigadieres_pueden_insertar"
  ON incidencias FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('director', 'tutor', 'brigadier')
    )
  );

-- Politica: solo directores pueden eliminar
CREATE POLICY "directores_pueden_eliminar"
  ON incidencias FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol = 'director'
    )
  );
