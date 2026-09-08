import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const apellidos = ['Quispe','Mamani','Huamán','Condori','Flores','García','Rodríguez','Martínez','López','González','Pérez','Sánchez','Ramírez','Torres','Díaz','Chávez','Ramos','Vargas','Castro','Morales'];
const nombres = ['Carlos','María','José','Ana','Luis','Carmen','Juan','Rosa','Diego','Sofía','Miguel','Lucía','Andrés','Valentina','Gabriel','Camila','Isabella','Fernando','Pablo','Elena'];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(m, M) { return Math.floor(Math.random() * (M - m + 1)) + m; }
function pad(n) { return n.toString().padStart(2, '0'); }

let dniCounter = 70000050;

async function addStudent() {
  const dni = (dniCounter++).toString();
  const nom = randItem(nombres);
  const ape = randItem(apellidos);
  const celular = `9${randInt(10000000, 99999999)}`;
  const password = '123456';

  const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email: `${dni}@colegio.local`,
      password,
      email_confirm: true,
      user_metadata: { dni, nombres: nom, apellidos: ape, rol: 'alumno' },
    }),
  });

  if (!authRes.ok) { const e = await authRes.json(); throw new Error(e.msg || 'Error'); }
  const authUser = await authRes.json();
  const pid = authUser.id;

  await supabase.from('perfiles').insert({ id: pid, dni, nombres: nom, apellidos: ape, celular, rol: 'alumno', estado: 'activo', uuid_qr: randomUUID() });
  await supabase.from('alumnos').insert({ perfil_id: pid, grado: '5°', seccion: randItem(['A','B']), apoderado_nombre: `${randItem(apellidos)} ${randItem(apellidos)}`, apoderado_celular: `9${randInt(10000000, 99999999)}` });

  // Batch insert 11 attendance records
  const records = [];
  const estados = ['presente','presente','presente','presente','presente','tardanza','presente','falta_injustificada'];
  for (let d = 1; d <= 15; d++) {
    const day = new Date(); day.setDate(day.getDate() - d);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const fecha = `${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}`;
    records.push({ alumno_id: pid, brigadier_id: pid, fecha, hora: `${pad(randInt(6,8))}:${pad(randInt(0,59))}:00`, estado: randItem(estados) });
  }
  const { error } = await supabase.from('asistencias').insert(records);
  if (error) console.error('  Error asistencias:', error.message);

  return { dni, ape, nom };
}

console.log('Agregando estudiantes faltantes de 5° Grado...\n');
for (let i = 0; i < 8; i++) {
  try {
    const r = await addStudent();
    console.log(`  ${i+1}. ${r.ape}, ${r.nom} (${r.dni})`);
  } catch (e) { console.error(`  Error: ${e.message}`); }
}
console.log('\nCompletado');
