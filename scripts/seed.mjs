import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = 'https://stbqlulxmorzpivxbeoa.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFsdWx4bW9yenBpdnhiZW9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE5OTc4MCwiZXhwIjoyMDk3Nzc1NzgwfQ.ZDyHOa2ZPBYL951wt40JldN_SfkRiK6oSmEtXJoH3pc';
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const grados = ['1°', '2°', '3°', '4°', '5°'];
const secciones = ['A', 'B'];
const apellidos = [
  'Quispe', 'Mamani', 'Huamán', 'Condori', 'Flores',
  'García', 'Rodríguez', 'Martínez', 'López', 'González',
  'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Díaz',
  'Chávez', 'Ramos', 'Vargas', 'Castro', 'Morales',
];
const nombres = [
  'Carlos', 'María', 'José', 'Ana', 'Luis',
  'Carmen', 'Juan', 'Rosa', 'Diego', 'Sofía',
  'Miguel', 'Lucía', 'Andrés', 'Valentina', 'Gabriel',
  'Camila', 'Isabella', 'Fernando', 'Pablo', 'Elena',
];

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

let dniCounter = 70000000;

function nextDNI() {
  return (dniCounter++).toString();
}

async function deleteExistingAlumnos() {
  const { data: existingPerfiles } = await supabase
    .from('perfiles')
    .select('id')
    .eq('rol', 'alumno');

  if (existingPerfiles && existingPerfiles.length > 0) {
    const ids = existingPerfiles.map(p => p.id);
    await supabase.from('asistencias').delete().in('alumno_id', ids);
    await supabase.from('alumnos').delete().in('perfil_id', ids);
    await supabase.from('perfiles').delete().in('id', ids);

    for (const p of existingPerfiles) {
      try {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${p.id}`, {
          method: 'DELETE',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        });
      } catch (e) {
        // ignore
      }
    }
    console.log(`Eliminados ${existingPerfiles.length} alumnos existentes`);
  }
}

async function createAuthUser(dni, email, password, nom, ape) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { dni, nombres: nom, apellidos: ape, rol: 'alumno' },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.msg || 'Error creating auth user');
  }

  return await res.json();
}

async function deleteAuthUser(userId) {
  try {
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
  } catch {
    // ignore
  }
}

async function createStudent(grado, index) {
  const dni = nextDNI();
  const email = `${dni}@colegio.local`;
  const password = '123456';
  const nom = randItem(nombres);
  const ape = randItem(apellidos);
  const seccion = randItem(secciones);
  const celular = `9${randInt(10000000, 99999999)}`;

  const authUser = await createAuthUser(dni, email, password, nom, ape);
  const perfilId = authUser.id;
  const uuidQr = randomUUID();

  const { error: errPerfil } = await supabase.from('perfiles').insert({
    id: perfilId,
    dni,
    nombres: nom,
    apellidos: ape,
    celular,
    rol: 'alumno',
    estado: 'activo',
    uuid_qr: uuidQr,
  });

  if (errPerfil) {
    await deleteAuthUser(perfilId);
    throw new Error(errPerfil.message);
  }

  const { error: errAlumno } = await supabase.from('alumnos').insert({
    perfil_id: perfilId,
    grado,
    seccion,
    apoderado_nombre: `${randItem(apellidos)} ${randItem(apellidos)}`,
    apoderado_celular: `9${randInt(10000000, 99999999)}`,
  });

  if (errAlumno) {
    await supabase.from('perfiles').delete().eq('id', perfilId);
    await deleteAuthUser(perfilId);
    throw new Error(errAlumno.message);
  }

  // Create attendance records for last 10 school days
  const estados = ['presente', 'presente', 'presente', 'presente', 'presente', 'tardanza', 'presente', 'falta_injustificada'];
  let asistencias = 0;

  for (let d = 1; d <= 15; d++) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    if (day.getDay() === 0 || day.getDay() === 6) continue;

    const fecha = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    const hora = `${pad(randInt(6, 8))}:${pad(randInt(0, 59))}:00`;
    const estado = randItem(estados);

    const { data: existing } = await supabase
      .from('asistencias')
      .select('id')
      .eq('alumno_id', perfilId)
      .eq('fecha', fecha)
      .maybeSingle();

    if (!existing) {
      const { error: errAsis } = await supabase.from('asistencias').insert({
        alumno_id: perfilId,
        brigadier_id: perfilId, // same as student for seed data
        fecha,
        hora,
        estado,
      });
      if (!errAsis) asistencias++;
    }
  }

  return { dni, nom, ape, grado, seccion, asistencias };
}

async function seed() {
  console.log('Iniciando seed de datos...\n');

  await deleteExistingAlumnos();

  let total = 0;

  for (const grado of grados) {
    console.log(`\n--- ${grado} Grado ---`);
    for (let i = 0; i < 10; i++) {
      try {
        const result = await createStudent(grado, i);
        console.log(`  ${i+1}. ${result.ape}, ${result.nom} (${result.dni}) - ${result.asistencias} asistencias`);
        total++;
      } catch (err) {
        console.error(`  Error: ${err.message}`);
      }
    }
  }

  console.log(`\n==========`);
  console.log(`Seed completado: ${total} alumnos creados`);
  console.log(`Contraseña para todos: 123456`);
}

seed().catch(console.error);
