-- ============================================================
-- SISTEMA DE CONTROL DE ASISTENCIA CON QR - ESQUEMA COMPLETO
-- Proyecto: nrobzkilckuhcsbqdgyc (migración consolidada)
-- Roles: alumno, brigadier, tutor, director, admin
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: perfiles
-- ============================================================
CREATE TABLE perfiles (
  id UUID PRIMARY KEY,
  dni VARCHAR(8) UNIQUE NOT NULL,
  nombres VARCHAR(150) NOT NULL,
  apellidos VARCHAR(150) NOT NULL,
  celular VARCHAR(15),
  foto_url TEXT,
  genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro')),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('alumno', 'brigadier', 'tutor', 'director', 'admin')),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  uuid_qr UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfiles_dni ON perfiles(dni);
CREATE INDEX idx_perfiles_rol ON perfiles(rol);
CREATE INDEX idx_perfiles_estado ON perfiles(estado);
CREATE INDEX idx_perfiles_uuid_qr ON perfiles(uuid_qr);

-- ============================================================
-- HELPERS DE ROL
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_brigadier()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'brigadier'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol IN ('admin', 'director', 'brigadier', 'tutor')
  );
$$;

-- ============================================================
-- TABLA: alumnos
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
-- TABLA: brigadieres
-- ============================================================
CREATE TABLE brigadieres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(perfil_id)
);

-- ============================================================
-- TABLA: asistencias (alumno_id y brigadier_id -> perfiles)
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
  usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
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
-- TABLA: sesiones (usuario_id único para onConflict)
-- ============================================================
CREATE TABLE sesiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  ultimo_acceso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id)
);

CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX idx_sesiones_activo ON sesiones(activo);

-- ============================================================
-- TABLA: días no laborables
-- ============================================================
CREATE TABLE dias_no_laborables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('feriado', 'vacaciones')),
  descripcion VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fecha)
);

CREATE INDEX idx_dias_no_laborables_fecha ON dias_no_laborables(fecha);

-- ============================================================
-- TABLA: configuración de asistencia (fila única id=1)
-- ============================================================
CREATE TABLE configuracion_asistencia (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  inicio TIME NOT NULL DEFAULT '07:00:00',
  limite_presente TIME NOT NULL DEFAULT '07:15:00',
  limite_tardanza TIME NOT NULL DEFAULT '07:45:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES perfiles(id)
);

INSERT INTO configuracion_asistencia (id, inicio, limite_presente, limite_tardanza)
VALUES (1, '07:00:00', '07:15:00', '07:45:00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABLA: tutor_asignaciones
-- ============================================================
CREATE TABLE tutor_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  grado TEXT NOT NULL,
  seccion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tutor_id, grado, seccion)
);

CREATE INDEX idx_tutor_asignaciones_tutor ON tutor_asignaciones(tutor_id);

-- ============================================================
-- FUNCIÓN: estado según configuración
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_estado_asistencia(hora_registro TIME)
RETURNS VARCHAR(30) AS $$
DECLARE
  v_inicio TIME;
  v_limite_presente TIME;
  v_limite_tardanza TIME;
BEGIN
  SELECT inicio, limite_presente, limite_tardanza
  INTO v_inicio, v_limite_presente, v_limite_tardanza
  FROM configuracion_asistencia
  WHERE id = 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF hora_registro >= v_inicio AND hora_registro <= v_limite_presente THEN
    RETURN 'presente';
  ELSIF hora_registro > v_limite_presente AND hora_registro <= v_limite_tardanza THEN
    RETURN 'tardanza';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: registrar auditoría automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  v_accion TEXT;
  v_detalle JSONB;
  v_usuario UUID;
BEGIN
  v_usuario := NULLIF(current_setting('app.usuario_id', TRUE), '')::UUID;
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
    v_usuario,
    v_accion,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_detalle
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- TRIGGERS DE updated_at
-- ============================================================
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
-- VISTA: resumen diario
-- ============================================================
CREATE OR REPLACE VIEW vista_resumen_diario AS
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
CREATE OR REPLACE VIEW vista_estadisticas_brigadier AS
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
CREATE OR REPLACE VIEW vista_dashboard AS
SELECT
  (SELECT COUNT(*) FROM perfiles WHERE rol = 'alumno' AND estado = 'activo') AS total_estudiantes,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'presente') AS presentes_hoy,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'tardanza') AS tardanzas_hoy,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'falta_justificada') AS faltas_justificadas_hoy,
  (SELECT COUNT(*) FROM asistencias WHERE fecha = CURRENT_DATE AND estado = 'falta_injustificada') AS faltas_injustificadas_hoy,
  (SELECT COUNT(*) FROM sesiones WHERE activo = TRUE AND ultimo_acceso >= NOW() - INTERVAL '15 minutes') AS brigadieres_conectados;

-- ============================================================
-- FUNCIÓN: registrar asistencia
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
  v_inicio TIME;
  v_limite_tardanza TIME;
BEGIN
  v_hora_actual := CURRENT_TIME;
  v_estado := calcular_estado_asistencia(v_hora_actual);

  SELECT inicio, limite_tardanza
  INTO v_inicio, v_limite_tardanza
  FROM configuracion_asistencia
  WHERE id = 1;

  IF v_estado IS NULL THEN
    RETURN jsonb_build_object(
      'exito', FALSE,
      'mensaje', format('Fuera del horario de registro (%s - %s)', v_inicio, v_limite_tardanza)
    );
  END IF;

  SELECT * INTO v_alumno FROM perfiles
  WHERE uuid_qr = p_alumno_uuid AND rol = 'alumno' AND estado = 'activo';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exito', FALSE,
      'mensaje', 'Estudiante no encontrado o inactivo'
    );
  END IF;

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
-- FUNCIÓN: registrar faltas diarias
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_faltas_diarias(p_brigadier_id UUID)
RETURNS TABLE(alumno_id UUID, nombres TEXT, apellidos TEXT, estado VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET timezone = 'America/Lima'
AS $$
DECLARE
  v_hoy DATE := CURRENT_DATE;
  v_hora_actual TIME := CURRENT_TIME;
  v_limite_tardanza TIME;
  v_config_existe BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM configuracion_asistencia WHERE id = 1) INTO v_config_existe;
  IF NOT v_config_existe THEN
    RAISE EXCEPTION 'No hay configuración de asistencia. Primero configure los intervalos.';
  END IF;

  SELECT limite_tardanza INTO v_limite_tardanza FROM configuracion_asistencia WHERE id = 1;

  IF v_hora_actual < v_limite_tardanza THEN
    RAISE EXCEPTION 'Aún no ha pasado el límite de tardanza (%). Espere hasta después de las % para cerrar la asistencia.', v_limite_tardanza, v_limite_tardanza;
  END IF;

  RETURN QUERY
  WITH faltantes AS (
    SELECT p.id, p.nombres, p.apellidos
    FROM perfiles p
    INNER JOIN alumnos a ON a.perfil_id = p.id
    WHERE p.rol = 'alumno'
      AND p.estado = 'activo'
      AND NOT EXISTS (
        SELECT 1 FROM asistencias asis
        WHERE asis.alumno_id = p.id
          AND asis.fecha = v_hoy
      )
  )
  INSERT INTO asistencias (alumno_id, brigadier_id, fecha, hora, estado, observaciones)
  SELECT f.id, p_brigadier_id, v_hoy, v_hora_actual, 'falta_injustificada', 'Falta automática - cierre de asistencia'
  FROM faltantes f
  RETURNING alumno_id,
    (SELECT p2.nombres FROM perfiles p2 WHERE p2.id = alumno_id)::TEXT,
    (SELECT p2.apellidos FROM perfiles p2 WHERE p2.id = alumno_id)::TEXT,
    'falta_injustificada'::VARCHAR;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE brigadieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias_no_laborables ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_asignaciones ENABLE ROW LEVEL SECURITY;

-- perfiles: ver propio o staff; actualizar propio; insertar staff
CREATE POLICY perfiles_select ON perfiles
  FOR SELECT USING (
    auth.uid() = id
    OR is_staff()
  );
CREATE POLICY perfiles_update_own ON perfiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY perfiles_insert_staff ON perfiles
  FOR INSERT WITH CHECK (is_staff());

-- alumnos
CREATE POLICY alumnos_select ON alumnos
  FOR SELECT USING (auth.uid() = perfil_id OR is_staff());
CREATE POLICY alumnos_insert ON alumnos
  FOR INSERT WITH CHECK (is_staff());
CREATE POLICY alumnos_update ON alumnos
  FOR UPDATE USING (auth.uid() = perfil_id OR is_staff());

-- brigadieres
CREATE POLICY brigadieres_select ON brigadieres
  FOR SELECT USING (auth.uid() = perfil_id OR is_staff());
CREATE POLICY brigadieres_insert ON brigadieres
  FOR INSERT WITH CHECK (is_staff());

-- asistencias
CREATE POLICY asistencias_select ON asistencias
  FOR SELECT USING (auth.uid() = alumno_id OR auth.uid() = brigadier_id OR is_staff());
CREATE POLICY asistencias_insert ON asistencias
  FOR INSERT WITH CHECK (is_staff());
CREATE POLICY asistencias_update ON asistencias
  FOR UPDATE USING (is_staff());

-- justificaciones
CREATE POLICY justificaciones_select ON justificaciones
  FOR SELECT USING (is_staff() OR EXISTS (
    SELECT 1 FROM asistencias WHERE asistencias.id = justificaciones.asistencia_id AND asistencias.alumno_id = auth.uid()
  ));
CREATE POLICY justificaciones_insert ON justificaciones
  FOR INSERT WITH CHECK (is_staff());

-- evidencias
CREATE POLICY evidencias_select ON evidencias
  FOR SELECT USING (is_staff() OR EXISTS (
    SELECT 1 FROM justificaciones
    JOIN asistencias ON asistencias.id = justificaciones.asistencia_id
    WHERE justificaciones.id = evidencias.justificacion_id AND asistencias.alumno_id = auth.uid()
  ));
CREATE POLICY evidencias_insert ON evidencias
  FOR INSERT WITH CHECK (is_staff());

-- auditoria: solo staff
CREATE POLICY auditoria_select ON auditoria
  FOR SELECT USING (is_staff());

-- sesiones
CREATE POLICY sesiones_select_own ON sesiones
  FOR SELECT USING (auth.uid() = usuario_id OR is_staff());
CREATE POLICY sesiones_insert_own ON sesiones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id OR is_staff());
CREATE POLICY sesiones_update_own ON sesiones
  FOR UPDATE USING (auth.uid() = usuario_id OR is_staff());

-- días no laborables
CREATE POLICY dnl_select ON dias_no_laborables
  FOR SELECT USING (is_staff() OR EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'alumno'
  ));
CREATE POLICY dnl_insert ON dias_no_laborables
  FOR INSERT WITH CHECK (is_staff());
CREATE POLICY dnl_delete ON dias_no_laborables
  FOR DELETE USING (is_staff());

-- configuración: leer todos, actualizar staff
CREATE POLICY config_select_all ON configuracion_asistencia
  FOR SELECT USING (true);
CREATE POLICY config_update_staff ON configuracion_asistencia
  FOR UPDATE USING (is_staff())
  WITH CHECK (is_staff());

-- tutor_asignaciones
CREATE POLICY tutor_asignaciones_admin ON tutor_asignaciones
  FOR ALL USING (is_admin());
CREATE POLICY tutor_asignaciones_tutor ON tutor_asignaciones
  FOR SELECT USING (tutor_id = auth.uid());