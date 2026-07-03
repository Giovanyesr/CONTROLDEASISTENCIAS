-- Función: registrar faltas de todos los alumnos que no tienen asistencia hoy
-- Se invoca manualmente (brigadier) o mediante cron después del limite_tardanza

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
  -- Verificar que exista configuración
  SELECT EXISTS(SELECT 1 FROM configuracion_asistencia WHERE id = 1) INTO v_config_existe;
  IF NOT v_config_existe THEN
    RAISE EXCEPTION 'No hay configuración de asistencia. Primero configure los intervalos.';
  END IF;

  -- Obtener el límite de tardanza
  SELECT limite_tardanza INTO v_limite_tardanza FROM configuracion_asistencia WHERE id = 1;

  -- Solo proceder si ya pasó el límite de tardanza
  IF v_hora_actual < v_limite_tardanza THEN
    RAISE EXCEPTION 'Aún no ha pasado el límite de tardanza (%). Espere hasta después de las % para cerrar la asistencia.', v_limite_tardanza, v_limite_tardanza;
  END IF;

  -- Insertar falta_injustificada para cada alumno activo sin registro hoy
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
