import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = 'https://stbqlulxmorzpivxbeoa.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFsdWx4bW9yenBpdnhiZW9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE5OTc4MCwiZXhwIjoyMDk3Nzc1NzgwfQ.ZDyHOa2ZPBYL951wt40JldN_SfkRiK6oSmEtXJoH3pc';
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DNI = '30916';
const EMAIL = `${DNI}@colegio.local`;
const PASSWORD = '123456';
const NOMBRES = 'Admin';
const APELLIDOS = 'Sistema';

async function main() {
  // 1. Crear auth user
  console.log(`Creando usuario auth ${EMAIL}...`);
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { dni: DNI, nombres: NOMBRES, apellidos: APELLIDOS, rol: 'brigadier' },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Error creando auth user:', err.msg);
    process.exit(1);
  }

  const authUser = await res.json();
  const perfilId = authUser.id;
  console.log(`Auth user creado: ${perfilId}`);

  // 2. Crear perfil
  const uuidQr = randomUUID();
  const { error: errPerfil } = await supabase.from('perfiles').insert({
    id: perfilId,
    dni: DNI,
    nombres: NOMBRES,
    apellidos: APELLIDOS,
    celular: null,
    foto_url: null,
    rol: 'brigadier',
    estado: 'activo',
    uuid_qr: uuidQr,
  });

  if (errPerfil) {
    console.error('Error creando perfil:', errPerfil.message);
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${perfilId}`, {
      method: 'DELETE', headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    process.exit(1);
  }
  console.log('Perfil creado');

  // 3. Crear alumno (brigadieres también tienen registro en alumnos)
  const { error: errAlumno } = await supabase.from('alumnos').insert({
    perfil_id: perfilId,
    grado: '5°',
    seccion: 'A',
    apoderado_nombre: 'Admin Sistema',
    apoderado_celular: null,
  });

  if (errAlumno) {
    console.error('Error creando alumno:', errAlumno.message);
    await supabase.from('perfiles').delete().eq('id', perfilId);
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${perfilId}`, {
      method: 'DELETE', headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    process.exit(1);
  }
  console.log('Registro alumno creado');

  console.log('\n✅ Superadmin creado exitosamente:');
  console.log(`   DNI: ${DNI}`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Contraseña: ${PASSWORD}`);
  console.log(`   Rol: brigadier`);
}

main().catch(console.error);
