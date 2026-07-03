-- ============================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE brigadieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias_no_laborables ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS: perfiles
-- ============================================================
-- Los usuarios pueden ver su propio perfil
CREATE POLICY perfiles_select_own ON perfiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier'
    )
  );

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY perfiles_update_own ON perfiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Solo brigadieres pueden insertar perfiles
CREATE POLICY perfiles_insert_brigadier ON perfiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- POLÍTICAS: alumnos
-- ============================================================
CREATE POLICY alumnos_select ON alumnos
  FOR SELECT USING (
    auth.uid() = perfil_id
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

CREATE POLICY alumnos_insert ON alumnos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

CREATE POLICY alumnos_update ON alumnos
  FOR UPDATE USING (
    auth.uid() = perfil_id
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- POLÍTICAS: brigadieres
-- ============================================================
CREATE POLICY brigadieres_select ON brigadieres
  FOR SELECT USING (
    auth.uid() = perfil_id
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

CREATE POLICY brigadieres_insert ON brigadieres
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- POLÍTICAS: asistencias
-- ============================================================
CREATE POLICY asistencias_select ON asistencias
  FOR SELECT USING (
    auth.uid() = alumno_id
    OR auth.uid() = brigadier_id
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

CREATE POLICY asistencias_insert ON asistencias
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

CREATE POLICY asistencias_update ON asistencias
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- POLÍTICAS: justificaciones
-- ============================================================
CREATE POLICY justificaciones_select ON justificaciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('brigadier', 'alumno'))
  );

CREATE POLICY justificaciones_insert ON justificaciones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- POLÍTICAS: evidencias
-- ============================================================
CREATE POLICY evidencias_select ON evidencias
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('brigadier', 'alumno'))
  );

CREATE POLICY evidencias_insert ON evidencias
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- POLÍTICAS: auditoria (solo lectura para brigadieres)
-- ============================================================
CREATE POLICY auditoria_select ON auditoria
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'brigadier')
  );

-- ============================================================
-- POLÍTICAS: sesiones
-- ============================================================
CREATE POLICY sesiones_select_own ON sesiones
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY sesiones_insert_own ON sesiones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY sesiones_update_own ON sesiones
  FOR UPDATE USING (auth.uid() = usuario_id);

-- ============================================================
-- POLÍTICAS: días no laborables (lectura para todos, escritura solo brigadieres)
-- ============================================================
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
-- CONFIGURACIÓN: buckets de almacenamiento
-- ============================================================
-- Bucket: evidencias (para archivos de justificación)
-- Bucket: fotos (para fotos de perfil)
-- Bucket: qr (para códigos QR generados)
-- NOTA: Crear manualmente desde la interfaz de Supabase Storage
-- y configurar políticas de acceso público solo para lectura.
