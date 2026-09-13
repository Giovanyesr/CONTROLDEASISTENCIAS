-- ============================================================
-- MIGRACION 03: QR FIJO Y UNICO POR USUARIO
-- Reemplaza el flujo de QR temporal (token + expiración) por el
-- uuid_qr fijo de cada perfil, pensado para fotocheck impreso.
-- ============================================================

SET TIME ZONE 'America/Lima';

-- Registra asistencia a partir del uuid_qr fijo del estudiante.
CREATE OR REPLACE FUNCTION public.registrar_asistencia_qr_fijo(
  p_alumno_uuid UUID,
  p_brigadier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET timezone = 'America/Lima'
AS $$
DECLARE
  v_hora TIME;
  v_estado VARCHAR(30);
  v_alumno RECORD;
  v_existente RECORD;
  v_inicio TIME;
  v_limite_tardanza TIME;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_brigadier_id OR NOT public.is_brigadier(auth.uid()) THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'NO_AUTORIZADO', 'mensaje', 'Solo un brigadier activo puede registrar asistencia');
  END IF;

  v_hora := CURRENT_TIME;
  SELECT inicio, limite_tardanza INTO v_inicio, v_limite_tardanza
  FROM public.configuracion_asistencia WHERE id = 1;
  v_estado := public.calcular_estado_asistencia(v_hora);

  IF v_estado IS NULL THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'FUERA_DE_HORARIO', 'mensaje', format('Fuera del horario de registro (%s - %s)', v_inicio, v_limite_tardanza));
  END IF;

  SELECT * INTO v_alumno
  FROM public.perfiles p
  WHERE p.uuid_qr = p_alumno_uuid
    AND p.estado = 'activo'
    AND p.rol IN ('alumno', 'brigadier');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'ALUMNO_INVALIDO', 'mensaje', 'Estudiante no encontrado o inactivo');
  END IF;

  SELECT * INTO v_existente FROM public.asistencias
  WHERE alumno_id = v_alumno.id AND fecha = CURRENT_DATE;
  IF FOUND THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'ASISTENCIA_DUPLICADA', 'mensaje', 'El estudiante ya tiene asistencia registrada hoy', 'asistencia_existente', jsonb_build_object('hora', v_existente.hora, 'fecha', v_existente.fecha, 'estado', v_existente.estado));
  END IF;

  INSERT INTO public.asistencias (alumno_id, brigadier_id, fecha, hora, estado)
  VALUES (v_alumno.id, p_brigadier_id, CURRENT_DATE, v_hora, v_estado);

  RETURN jsonb_build_object(
    'exito', TRUE,
    'mensaje', 'Asistencia registrada correctamente',
    'estudiante', jsonb_build_object('nombres', v_alumno.nombres, 'apellidos', v_alumno.apellidos, 'dni', v_alumno.dni),
    'asistencia', jsonb_build_object('hora', v_hora, 'fecha', CURRENT_DATE, 'estado', v_estado)
  );
END;
$$;

-- Wrapper con rate-limit por IP conservando la firma del cliente.
CREATE OR REPLACE FUNCTION public.registrar_asistencia_qr_fijo_segura(
  p_alumno_uuid UUID,
  p_brigadier_id UUID,
  p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET timezone = 'America/Lima'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() IS DISTINCT FROM p_brigadier_id
     OR NOT public.is_brigadier(auth.uid()) THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'NO_AUTORIZADO', 'mensaje', 'Solo un brigadier funcional activo puede registrar asistencia');
  END IF;

  IF (
    SELECT count(*) FROM public.qr_intentos
    WHERE ip_address = COALESCE(NULLIF(p_ip, ''), 'unknown')
      AND intentado_en > NOW() - INTERVAL '1 minute'
  ) >= 120 THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'IP_RATE_LIMIT', 'mensaje', 'Demasiados intentos desde esta dirección');
  END IF;

  INSERT INTO public.qr_intentos (brigadier_id, ip_address, resultado)
  VALUES (auth.uid(), COALESCE(NULLIF(p_ip, ''), 'unknown'), 'ip-check');

  RETURN public.registrar_asistencia_qr_fijo(p_alumno_uuid, p_brigadier_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_asistencia_qr_fijo_segura(UUID, UUID, TEXT) TO authenticated;