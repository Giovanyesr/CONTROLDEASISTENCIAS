-- ============================================================
-- SISTEMA DE CONTROL DE ASISTENCIA CON QR - ESQUEMA COMPLETO
-- ============================================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: perfiles (unifica alumnos y brigadieres)
-- ============================================================
CREATE TABLE perfiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni VARCHAR(8) UNIQUE NOT NULL,
  nombres VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  celular VARCHAR(15),
  foto_url TEXT,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('alumno', 'brigadier')),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  uuid_qr UUID UNIQUE DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfiles_dni ON perfiles(dni);
CREATE INDEX idx_perfiles_rol ON perfiles(rol);
CREATE INDEX idx_perfiles_estado ON perfiles(estado);
CREATE INDEX idx_perfiles_uuid_qr ON perfiles(uuid_qr);

-- ============================================================
-- TABLA: alumnos (datos específicos de estudiantes)
-- ============================================================
CREATE TABLE alumnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  grado VARCHAR(20) NOT NULL,
  seccion VARCHAR(10) NOT NULL,
  apoderado_nombre VARCHAR(200),
  apoderado_celular VARCHAR(15),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(perfil_id)
);

CREATE INDEX idx_alumnos_grado ON alumnos(grado);
CREATE INDEX idx_alumnos_seccion ON alumnos(seccion);
CREATE INDEX idx_alumnos_grado_seccion ON alumnos(grado, seccion);

-- ============================================================
-- TABLA: brigadieres (datos específicos de brigadieres)
-- ============================================================
CREATE TABLE brigadieres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(perfil_id)
);

-- ============================================================
-- TABLA: asistencias
-- ============================================================
CREATE TABLE asistencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alumno_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  brigadier_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT CURRENT_TIME,
  estado VARCHAR(30) NOT NULL CHECK (estado IN ('presente', 'tardanza', 'falta_justificada', 'falta_injustificada')),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(alumno_id, fecha)
);

CREATE INDEX idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX idx_asistencias_alumno ON asistencias(alumno_id);
CREATE INDEX idx_asistencias_brigadier ON asistencias(brigadier_id);
CREATE INDEX idx_asistencias_estado ON asistencias(estado);
CREATE INDEX idx_asistencias_fecha_estado ON asistencias(fecha, estado);
CREATE INDEX idx_asistencias_alumno_fecha ON asistencias(alumno_id, fecha);

-- ============================================================
-- TABLA: justificaciones
-- ============================================================
CREATE TABLE justificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asistencia_id UUID NOT NULL REFERENCES asistencias(id) ON DELETE CASCADE,
  brigadier_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(30) NOT NULL,
  estado_nuevo VARCHAR(30) NOT NULL,
  motivo TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_justificaciones_asistencia ON justificaciones(asistencia_id);
CREATE INDEX idx_justificaciones_brigadier ON justificaciones(brigadier_id);
CREATE INDEX idx_justificaciones_fecha ON justificaciones(fecha);

-- ============================================================
-- TABLA: evidencias
-- ============================================================
CREATE TABLE evidencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  justificacion_id UUID NOT NULL REFERENCES justificaciones(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamano_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidencias_justificacion ON evidencias(justificacion_id);

-- ============================================================
-- TABLA: auditoria
-- ============================================================
CREATE TABLE auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  accion VARCHAR(100) NOT NULL,
  tabla_afectada VARCHAR(50),
  registro_id UUID,
  detalle JSONB,
  direccion_ip VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_accion ON auditoria(accion);
CREATE INDEX idx_auditoria_fecha ON auditoria(created_at);
CREATE INDEX idx_auditoria_tabla ON auditoria(tabla_afectada);

-- ============================================================
-- TABLA: sesiones (para seguimiento de brigadieres conectados)
-- ============================================================
CREATE TABLE sesiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  ultimo_acceso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX idx_sesiones_activo ON sesiones(activo);

-- ============================================================
-- FUNCIÓN: calcular estado según hora
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_estado_asistencia(hora_registro TIME)
RETURNS VARCHAR(30) AS $$
BEGIN
  IF hora_registro >= '07:00:00' AND hora_registro <= '07:15:00' THEN
    RETURN 'presente';
  ELSIF hora_registro > '07:15:00' AND hora_registro <= '07:45:00' THEN
    RETURN 'tardanza';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- FUNCIÓN: registrar auditoría automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  v_accion TEXT;
  v_detalle JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_accion := 'CREAR';
    v_detalle := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'UPDATE' THEN
    v_accion := 'ACTUALIZAR';
    v_detalle := jsonb_build_object(
      'anterior', row_to_json(OLD)::JSONB,
      'nuevo', row_to_json(NEW)::JSONB
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_accion := 'ELIMINAR';
    v_detalle := row_to_json(OLD)::JSONB;
  END IF;

  INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, detalle)
  VALUES (
    COALESCE(current_setting('app.usuario_id', TRUE)::UUID, '00000000-0000-0000-0000-000000000000'),
    v_accion,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_detalle
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS DE AUDITORÍA
-- ============================================================
CREATE TRIGGER trg_auditoria_asistencias
  AFTER INSERT OR UPDATE OR DELETE ON asistencias
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER trg_auditoria_justificaciones
  AFTER INSERT OR UPDATE OR DELETE ON justificaciones
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER trg_auditoria_alumnos
  AFTER INSERT OR UPDATE OR DELETE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER trg_auditoria_brigadieres
  AFTER INSERT OR UPDATE OR DELETE ON brigadieres
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

-- ============================================================
-- FUNCIÓN: actualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated_at_perfiles
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_updated_at_alumnos
  BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_updated_at_brigadieres
  BEFORE UPDATE ON brigadieres
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_updated_at_asistencias
  BEFORE UPDATE ON asistencias
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================
-- VISTA: resumen diario de asistencia
-- ============================================================
CREATE VIEW vista_resumen_diario AS
SELECT
  p.id,
  p.dni,
  p.nombres,
  p.apellidos,
  a.grado,
  a.seccion,
  asis.fecha,
  asis.hora,
  asis.estado,
  asis.observaciones,
  b.nombres AS brigadier_nombre,
  b.apellidos AS brigadier_apellido,
  j.estado_nuevo AS ultimo_estado_justificado,
  j.motivo AS motivo_justificacion
FROM perfiles p
JOIN alumnos a ON a.perfil_id = p.id
LEFT JOIN LATERAL (
  SELECT * FROM asistencias
  WHERE alumno_id = p.id
  ORDER BY fecha DESC, hora DESC
  LIMIT 1
) asis ON true
LEFT JOIN perfiles b ON b.id = asis.brigadier_id
LEFT JOIN LATERAL (
  SELECT * FROM justificaciones
  WHERE asistencia_id = asis.id
  ORDER BY created_at DESC
  LIMIT 1
) j ON true
WHERE p.rol = 'alumno';

-- ============================================================
-- VISTA: estadísticas de brigadier
-- ============================================================
CREATE VIEW vista_estadisticas_brigadier AS
SELECT
  p.id AS brigadier_id,
  p.nombres,
  p.apellidos,
  p.dni,
  COUNT(DISTINCT a.id) AS total_registros,
  COUNT(DISTINCT a.fecha) AS dias_activos,
  COUNT(DISTINCT CASE WHEN a.fecha >= CURRENT_DATE - INTERVAL '7 days' THEN a.id END) AS registros_semana,
  COUNT(DISTINCT CASE WHEN a.fecha >= CURRENT_DATE - INTERVAL '30 days' THEN a.id END) AS registros_mes
FROM perfiles p
LEFT JOIN asistencias a ON a.brigadier_id = p.id
WHERE p.rol = 'brigadier'
GROUP BY p.id, p.nombres, p.apellidos, p.dni;

-- ============================================================
-- VISTA: dashboard en tiempo real
-- ============================================================
CREATE VIEW vista_dashboard AS
SELECT
  (SELECT COUNT(*) FROM perfiles WHERE rol = 'alumno' AND estado = 'activo') AS total_estudiantes,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'presente') AS presentes_hoy,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'tardanza') AS tardanzas_hoy,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'falta_justificada') AS faltas_justificadas_hoy,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'falta_injustificada') AS faltas_injustificadas_hoy,
  (SELECT COUNT(*) FROM sesiones WHERE activo = TRUE AND ultimo_acceso >= NOW() - INTERVAL '15 minutes') AS brigadieres_conectados;

-- ============================================================
-- FUNCIÓN: registrar asistencia (con validaciones)
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_asistencia(
  p_alumno_uuid UUID,
  p_brigadier_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_hora_actual TIME;
  v_estado VARCHAR(30);
  v_alumno RECORD;
  v_asistencia_existente RECORD;
  v_resultado JSONB;
BEGIN
  v_hora_actual := CURRENT_TIME;
  v_estado := calcular_estado_asistencia(v_hora_actual);

  -- Validar horario
  IF v_estado IS NULL THEN
    RETURN jsonb_build_object(
      'exito', FALSE,
      'mensaje', 'Fuera del horario de registro (07:00 - 07:45)'
    );
  END IF;

  -- Buscar alumno por UUID QR
  SELECT * INTO v_alumno FROM perfiles
  WHERE uuid_qr = p_alumno_uuid AND rol = 'alumno' AND estado = 'activo';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exito', FALSE,
      'mensaje', 'Estudiante no encontrado o inactivo'
    );
  END IF;

  -- Verificar si ya tiene asistencia hoy
  SELECT * INTO v_asistencia_existente FROM asistencias
  WHERE alumno_id = v_alumno.id AND fecha = CURRENT_DATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'exito', FALSE,
      'mensaje', 'El estudiante ya tiene asistencia registrada hoy',
      'asistencia_existente', jsonb_build_object(
        'hora', v_asistencia_existente.hora,
        'fecha', v_asistencia_existente.fecha,
        'estado', v_asistencia_existente.estado
      )
    );
  END IF;

  -- Registrar asistencia
  INSERT INTO asistencias (alumno_id, brigadier_id, fecha, hora, estado)
  VALUES (v_alumno.id, p_brigadier_id, CURRENT_DATE, v_hora_actual, v_estado);

  RETURN jsonb_build_object(
    'exito', TRUE,
    'mensaje', 'Asistencia registrada correctamente',
    'estudiante', jsonb_build_object(
      'nombres', v_alumno.nombres,
      'apellidos', v_alumno.apellidos,
      'dni', v_alumno.dni
    ),
    'asistencia', jsonb_build_object(
      'hora', v_hora_actual,
      'fecha', CURRENT_DATE,
      'estado', v_estado
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: justificar asistencia
-- ============================================================
CREATE OR REPLACE FUNCTION justificar_asistencia(
  p_asistencia_id UUID,
  p_brigadier_id UUID,
  p_estado_nuevo VARCHAR(30),
  p_motivo TEXT
) RETURNS JSONB AS $$
DECLARE
  v_estado_anterior VARCHAR(30);
BEGIN
  SELECT estado INTO v_estado_anterior FROM asistencias WHERE id = p_asistencia_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', FALSE, 'mensaje', 'Asistencia no encontrada');
  END IF;

  INSERT INTO justificaciones (asistencia_id, brigadier_id, estado_anterior, estado_nuevo, motivo)
  VALUES (p_asistencia_id, p_brigadier_id, v_estado_anterior, p_estado_nuevo, p_motivo);

  UPDATE asistencias SET estado = p_estado_nuevo WHERE id = p_asistencia_id;

  RETURN jsonb_build_object(
    'exito', TRUE,
    'mensaje', 'Justificación registrada correctamente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLA: días no laborables (feriados y vacaciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS dias_no_laborables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('feriado', 'vacaciones')),
  descripcion VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fecha)
);

CREATE INDEX IF NOT EXISTS idx_dias_no_laborables_fecha ON dias_no_laborables(fecha);
