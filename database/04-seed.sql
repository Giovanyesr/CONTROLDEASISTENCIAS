-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- Crear usuarios en auth.users (se requiere extensión pgcrypto)
-- NOTA: En producción usar la interfaz de Supabase Auth

-- Brigadier de prueba
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '12345678@colegio.edu.pe',
  crypt('brigadier123', gen_salt('bf')),
  now(),
  now()
);

INSERT INTO perfiles (id, dni, nombres, apellidos, celular, rol, estado)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '12345678',
  'Carlos',
  ' Rodríguez',
  '999888777',
  'brigadier',
  'activo'
);

INSERT INTO brigadieres (id, perfil_id)
VALUES (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000001'
);

-- Alumno de prueba 1
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '87654321@colegio.edu.pe',
  crypt('alumno123', gen_salt('bf')),
  now(),
  now()
);

INSERT INTO perfiles (id, dni, nombres, apellidos, celular, rol, estado)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '87654321',
  'María',
  'García',
  '999111222',
  'alumno',
  'activo'
);

INSERT INTO alumnos (perfil_id, grado, seccion, apoderado_nombre, apoderado_celular)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '5to',
  'A',
  'Juan García',
  '999333444'
);

-- Alumno de prueba 2
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  '11223344@colegio.edu.pe',
  crypt('alumno123', gen_salt('bf')),
  now(),
  now()
);

INSERT INTO perfiles (id, dni, nombres, apellidos, celular, rol, estado)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  '11223344',
  'Pedro',
  'López',
  '999555666',
  'alumno',
  'activo'
);

INSERT INTO alumnos (perfil_id, grado, seccion, apoderado_nombre, apoderado_celular)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  '5to',
  'A',
  'Ana López',
  '999777888'
);

-- Registrar algunas asistencias de prueba
INSERT INTO asistencias (alumno_id, brigadier_id, fecha, hora, estado)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE, '07:10:00', 'presente');
