-- ============================================================
-- MIGRACION 02: CIERRE DE SEGURIDAD PARA PRODUCCION
-- ============================================================

SET TIME ZONE 'America/Lima';

ALTER TABLE public.qr_intentos
  ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_qr_intentos_ip_fecha
  ON public.qr_intentos(ip_address, intentado_en);

-- Todo brigadier base existente ya fue copiado a roles_funcionales por la
-- migracion 01. A partir de ahora la autorizacion depende de esa asignacion.
CREATE OR REPLACE FUNCTION public.is_brigadier(p_perfil_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles p
    JOIN public.roles_funcionales r ON r.perfil_id = p.id
    WHERE p.id = p_perfil_id
      AND p.estado = 'activo'
      AND r.rol = 'brigadier'
      AND r.activo = TRUE
  );
$$;

-- La firma antigua aceptaba UUID de alumno y permitia el flujo QR estatico.
DROP FUNCTION IF EXISTS public.registrar_asistencia(UUID, UUID);

-- El cliente ya no debe invocar directamente el RPC dinamico sin rate limit IP.
REVOKE EXECUTE ON FUNCTION public.registrar_asistencia(TEXT, UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_asistencia_segura(
  p_qr_token TEXT,
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

  RETURN public.registrar_asistencia(p_qr_token, p_brigadier_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_asistencia_segura(TEXT, UUID, TEXT) TO authenticated;
