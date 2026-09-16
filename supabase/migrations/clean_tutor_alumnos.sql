-- Eliminar registros de alumnos para usuarios con rol tutor
-- Estos registros fueron creados por error con el codigo anterior
DELETE FROM alumnos
WHERE perfil_id IN (
  SELECT id FROM perfiles WHERE rol = 'tutor'
);
