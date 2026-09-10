-- ============================================================
-- MIGRACION 01: QR DINAMICO Y ROLES FUNCIONALES
-- Zona horaria: America/Lima
-- ============================================================

SET TIME ZONE 'America/Lima';

UPDATE storage.buckets
SET public = FALSE
WHERE id IN ('fotos', 'evidencias');

CREATE TABLE IF NOT EXISTS public.cierres_diarios (
  fecha DATE PRIMARY KEY,
  ejecutado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  automatico BOOLEAN NOT NULL DEFAULT FALSE,
  resultado VARCHAR(30) NOT NULL,
  faltas_generadas INTEGER NOT NULL DEFAULT 0,
  ejecutado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cierres_diarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cierres_diarios_staff ON public.cierres_diarios;
CREATE POLICY cierres_diarios_staff ON public.cierres_diarios
  FOR SELECT USING (is_staff());

CREATE TABLE IF NOT EXISTS public.roles_funcionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  rol VARCHAR(30) NOT NULL CHECK (rol IN ('brigadier')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  asignado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (perfil_id, rol)
);

CREATE INDEX IF NOT EXISTS idx_roles_funcionales_perfil
  ON public.roles_funcionales(perfil_id, activo);

CREATE TABLE IF NOT EXISTS public.qr_sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qr_intentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brigadier_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  resultado VARCHAR(30) NOT NULL,
  intentado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_intentos_brigadier_fecha
  ON public.qr_intentos(brigadier_id, intentado_en);

CREATE INDEX IF NOT EXISTS idx_qr_sesiones_alumno_activo
  ON public.qr_sesiones(alumno_id, expira_en)
  WHERE usado_en IS NULL;

ALTER TABLE public.roles_funcionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_intentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_funcionales_select ON public.roles_funcionales;
CREATE POLICY roles_funcionales_select ON public.roles_funcionales
  FOR SELECT USING (auth.uid() = perfil_id OR is_staff());

DROP POLICY IF EXISTS roles_funcionales_admin ON public.roles_funcionales;
CREATE POLICY roles_funcionales_admin ON public.roles_funcionales
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS qr_sesiones_select ON public.qr_sesiones;
CREATE POLICY qr_sesiones_select ON public.qr_sesiones
  FOR SELECT USING (auth.uid() = alumno_id OR is_staff());

-- Los brigadieres existentes se copian a roles_funcionales mas abajo.
CREATE OR REPLACE FUNCTION public.is_brigadier(p_perfil_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.roles_funcionales
    JOIN public.perfiles p ON p.id = roles_funcionales.perfil_id
    WHERE roles_funcionales.perfil_id = p_perfil_id
      AND roles_funcionales.rol = 'brigadier'
      AND roles_funcionales.activo = TRUE
      AND p.estado = 'activo'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND estado = 'activo'
      AND rol IN ('admin', 'director', 'tutor')
  ) OR public.is_brigadier(auth.uid());
$$;

-- Copia los brigadieres actuales a la tabla funcional sin cambiar su rol
-- base. Esto permite desplegar la migracion sin interrumpir produccion.
INSERT INTO public.roles_funcionales (perfil_id, rol)
SELECT id, 'brigadier'
FROM public.perfiles p
WHERE p.rol = 'brigadier'
ON CONFLICT (perfil_id, rol) DO UPDATE SET activo = TRUE;

CREATE OR REPLACE FUNCTION public.generar_qr_alumno(p_alumno_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET timezone = 'America/Lima'
AS $$
DECLARE
  v_token TEXT := gen_random_uuid()::TEXT;
  v_expira TIMESTAMPTZ := NOW() + INTERVAL '60 seconds';
BEGIN
  IF auth.uid() IS DISTINCT FROM p_alumno_id AND NOT public.is_staff() THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'NO_AUTORIZADO', 'mensaje', 'No puede generar este QR');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.perfiles p
    JOIN public.alumnos a ON a.perfil_id = p.id
    WHERE p.id = p_alumno_id AND p.estado = 'activo'
  ) THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'ALUMNO_INVALIDO', 'mensaje', 'Alumno no encontrado o inactivo');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.qr_sesiones
    WHERE alumno_id = p_alumno_id AND creado_en > NOW() - INTERVAL '3 seconds'
  ) THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'QR_RATE_LIMIT', 'mensaje', 'Espere unos segundos antes de generar otro QR');
  END IF;

  UPDATE public.qr_sesiones
  SET usado_en = NOW()
  WHERE alumno_id = p_alumno_id AND usado_en IS NULL;

  INSERT INTO public.qr_sesiones (alumno_id, token_hash, expira_en)
  VALUES (p_alumno_id, encode(digest(v_token, 'sha256'), 'hex'), v_expira);

  RETURN jsonb_build_object(
    'exito', TRUE,
    'token', v_token,
    'expira_en', v_expira,
    'segundos', 60
  );
END;
$$;

DROP POLICY IF EXISTS asistencias_insert ON public.asistencias;
CREATE POLICY asistencias_insert ON public.asistencias
  FOR INSERT WITH CHECK (public.is_brigadier());

DROP POLICY IF EXISTS justificaciones_insert ON public.justificaciones;
CREATE POLICY justificaciones_insert ON public.justificaciones
  FOR INSERT WITH CHECK (auth.uid() = alumno_id);

-- Nueva firma para QR temporal. La firma antigua se conserva durante la
-- transicion para no romper clientes que aun no hayan sido actualizados.
CREATE OR REPLACE FUNCTION public.registrar_asistencia(
  p_qr_token TEXT,
  p_brigadier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET timezone = 'America/Lima'
AS $$
DECLARE
  v_qr RECORD;
  v_hora TIME;
  v_estado VARCHAR(30);
  v_existente RECORD;
  v_inicio TIME;
  v_limite_tardanza TIME;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_brigadier_id OR NOT public.is_brigadier(auth.uid()) THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'NO_AUTORIZADO', 'mensaje', 'Solo un brigadier activo puede registrar asistencia');
  END IF;

  IF (SELECT count(*) FROM public.qr_intentos
      WHERE brigadier_id = auth.uid() AND intentado_en > NOW() - INTERVAL '1 minute') >= 60 THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'QR_RATE_LIMIT', 'mensaje', 'Demasiados intentos. Espere un minuto');
  END IF;
  INSERT INTO public.qr_intentos (brigadier_id, resultado) VALUES (auth.uid(), 'recibido');

  v_hora := CURRENT_TIME;
  SELECT inicio, limite_tardanza INTO v_inicio, v_limite_tardanza
  FROM public.configuracion_asistencia WHERE id = 1;
  v_estado := public.calcular_estado_asistencia(v_hora);

  IF v_estado IS NULL THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'FUERA_DE_HORARIO', 'mensaje', format('Fuera del horario de registro (%s - %s)', v_inicio, v_limite_tardanza));
  END IF;

  SELECT q.*, p.nombres, p.apellidos, p.dni
  INTO v_qr
  FROM public.qr_sesiones q
  JOIN public.perfiles p ON p.id = q.alumno_id
  WHERE q.token_hash = encode(digest(p_qr_token, 'sha256'), 'hex')
  FOR UPDATE OF q;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'QR_INVALIDO', 'mensaje', 'El QR no es valido');
  END IF;
  IF v_qr.usado_en IS NOT NULL THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'QR_USADO', 'mensaje', 'Este QR ya fue utilizado');
  END IF;
  IF v_qr.expira_en <= NOW() THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'QR_EXPIRADO', 'mensaje', 'El QR ha expirado. Solicite uno nuevo');
  END IF;

  SELECT * INTO v_existente FROM public.asistencias
  WHERE alumno_id = v_qr.alumno_id AND fecha = CURRENT_DATE;
  IF FOUND THEN
    RETURN jsonb_build_object('exito', FALSE, 'codigo', 'ASISTENCIA_DUPLICADA', 'mensaje', 'El estudiante ya tiene asistencia registrada hoy', 'asistencia_existente', jsonb_build_object('hora', v_existente.hora, 'fecha', v_existente.fecha, 'estado', v_existente.estado));
  END IF;

  INSERT INTO public.asistencias (alumno_id, brigadier_id, fecha, hora, estado)
  VALUES (v_qr.alumno_id, p_brigadier_id, CURRENT_DATE, v_hora, v_estado);

  UPDATE public.qr_sesiones SET usado_en = NOW() WHERE id = v_qr.id;

  RETURN jsonb_build_object(
    'exito', TRUE,
    'mensaje', 'Asistencia registrada correctamente',
    'estudiante', jsonb_build_object('nombres', v_qr.nombres, 'apellidos', v_qr.apellidos, 'dni', v_qr.dni),
    'asistencia', jsonb_build_object('hora', v_hora, 'fecha', CURRENT_DATE, 'estado', v_estado)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_justificacion_por_fecha(
  p_fecha DATE,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET timezone = 'America/Lima'
AS $$
DECLARE
  v_asistencia_id UUID;
  v_creada BOOLEAN := FALSE;
  v_resultado JSONB;
BEGIN
  IF auth.uid() IS NULL OR p_fecha > CURRENT_DATE
     OR extract(isodow FROM p_fecha) >= 6
     OR EXISTS (SELECT 1 FROM public.dias_no_laborables WHERE fecha = p_fecha)
     OR public.dias_habiles_desde(p_fecha) > 5 THEN
    RETURN jsonb_build_object('exito', FALSE, 'mensaje', 'La fecha no puede ser justificada');
  END IF;

  SELECT id INTO v_asistencia_id
  FROM public.asistencias
  WHERE alumno_id = auth.uid() AND fecha = p_fecha
  FOR UPDATE;

  IF v_asistencia_id IS NULL THEN
    INSERT INTO public.asistencias (alumno_id, brigadier_id, fecha, hora, estado)
    VALUES (auth.uid(), auth.uid(), p_fecha, '00:00:00', 'falta_injustificada')
    RETURNING id INTO v_asistencia_id;
    v_creada := TRUE;
  END IF;

  v_resultado := public.solicitar_justificacion(v_asistencia_id, p_motivo);
  IF COALESCE((v_resultado->>'exito')::BOOLEAN, FALSE) = FALSE AND v_creada THEN
    DELETE FROM public.asistencias WHERE id = v_asistencia_id;
  END IF;
  RETURN v_resultado || jsonb_build_object('asistencia_id', v_asistencia_id);
END;
$$;

-- El cierre no debe crear faltas durante fines de semana o feriados.
CREATE OR REPLACE FUNCTION public.registrar_faltas_diarias(p_brigadier_id UUID)
RETURNS TABLE(alumno_id UUID, nombres TEXT, apellidos TEXT, estado VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET timezone = 'America/Lima'
AS $$
DECLARE
  v_hoy DATE := CURRENT_DATE;
  v_hora_actual TIME := CURRENT_TIME;
  v_limite_tardanza TIME;
BEGIN
  IF extract(isodow FROM v_hoy) >= 6
     OR EXISTS (SELECT 1 FROM public.dias_no_laborables WHERE fecha = v_hoy) THEN
    RETURN;
  END IF;

  SELECT limite_tardanza INTO v_limite_tardanza
  FROM public.configuracion_asistencia WHERE id = 1;
  IF v_hora_actual < v_limite_tardanza THEN
    RAISE EXCEPTION 'Aun no ha pasado el limite de tardanza (%)', v_limite_tardanza;
  END IF;

  RETURN QUERY
  WITH faltantes AS (
    SELECT p.id, p.nombres, p.apellidos
    FROM public.perfiles p
    JOIN public.alumnos a ON a.perfil_id = p.id
    WHERE p.estado = 'activo'
      AND p.rol IN ('alumno', 'brigadier')
      AND NOT EXISTS (
        SELECT 1 FROM public.asistencias x
        WHERE x.alumno_id = p.id AND x.fecha = v_hoy
      )
  )
  INSERT INTO public.asistencias (alumno_id, brigadier_id, fecha, hora, estado, observaciones)
  SELECT f.id, p_brigadier_id, v_hoy, v_hora_actual, 'falta_injustificada', 'Falta automatica - cierre de asistencia'
  FROM faltantes f
  RETURNING alumno_id,
    (SELECT p2.nombres FROM public.perfiles p2 WHERE p2.id = alumno_id)::TEXT,
    (SELECT p2.apellidos FROM public.perfiles p2 WHERE p2.id = alumno_id)::TEXT,
    'falta_injustificada'::VARCHAR;
END;
$$;

CREATE OR REPLACE FUNCTION public.dias_habiles_desde(p_fecha DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET timezone = 'America/Lima'
AS $$
  SELECT CASE WHEN p_fecha > CURRENT_DATE THEN 9999 ELSE count(*)::int END
  FROM generate_series(p_fecha::timestamp + interval '1 day', CURRENT_DATE::timestamp, interval '1 day') d
  WHERE extract(isodow FROM d) < 6
    AND NOT EXISTS (SELECT 1 FROM public.dias_no_laborables n WHERE n.fecha = d::date);
$$;
