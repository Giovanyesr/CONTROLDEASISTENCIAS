-- ============================================================
-- CONFIGURACIÓN DE INTERVALOS DE ASISTENCIA
-- ============================================================

-- Tabla de configuración (una sola fila)
CREATE TABLE IF NOT EXISTS configuracion_asistencia (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  inicio TIME NOT NULL DEFAULT '07:00:00',
  limite_presente TIME NOT NULL DEFAULT '07:15:00',
  limite_tardanza TIME NOT NULL DEFAULT '07:45:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES perfiles(id)
);

-- Solo una fila permitida
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_unica ON configuracion_asistencia(id);

-- Insertar fila por defecto
INSERT INTO configuracion_asistencia (id, inicio, limite_presente, limite_tardanza)
VALUES (1, '07:00:00', '07:15:00', '07:45:00')
ON CONFLICT (id) DO NOTHING;

-- RLS: todos pueden leer, solo brigadieres pueden modificar
ALTER TABLE configuracion_asistencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS config_select_all ON configuracion_asistencia;
CREATE POLICY config_select_all ON configuracion_asistencia
  FOR SELECT USING (true);

DROP POLICY IF EXISTS config_update_brigadier ON configuracion_asistencia;
CREATE POLICY config_update_brigadier ON configuracion_asistencia
  FOR UPDATE USING (public.is_brigadier())
  WITH CHECK (public.is_brigadier());

-- ============================================================
-- ACTUALIZAR FUNCIÓN calcular_estado_asistencia
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
-- ACTUALIZAR FUNCIÓN registrar_asistencia (mensaje dinámico)
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
  v_inicio TIME;
  v_limite_tardanza TIME;
BEGIN
  v_hora_actual := CURRENT_TIME;
  v_estado := calcular_estado_asistencia(v_hora_actual);

  -- Obtener valores de configuración para el mensaje
  SELECT inicio, limite_tardanza
  INTO v_inicio, v_limite_tardanza
  FROM configuracion_asistencia
  WHERE id = 1;

  -- Validar horario
  IF v_estado IS NULL THEN
    RETURN jsonb_build_object(
      'exito', FALSE,
      'mensaje', format('Fuera del horario de registro (%s - %s)', v_inicio, v_limite_tardanza)
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
