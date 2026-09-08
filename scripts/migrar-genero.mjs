import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('Ejecutando migración: agregar columna genero a perfiles...');
  const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro'));`
  });
  if (error) {
    // Try direct SQL via REST
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        sql: `ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro'));`
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      // Try direct pg_dump approach
      console.error('Error via RPC:', errText);
      console.log('Intentando con fetch directo a SQL...');
      const sqlRes = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'X-Supabase-Authorization': `Bearer ${serviceRoleKey}`,
          Prefer: 'params=sql',
        },
        body: JSON.stringify({
          query: `ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro'));`
        }),
      });
      if (!sqlRes.ok) {
        const sqlErr = await sqlRes.text();
        console.error('Error SQL directo:', sqlErr);
        console.log('\nEjecuta manualmente en el SQL Editor de Supabase:');
        console.log('ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS genero VARCHAR(20) CHECK (genero IN (\\'masculino\\', \\'femenino\\', \\'otro\\'));');
        process.exit(1);
      }
    }
  }
  console.log('Migración ejecutada correctamente ✅');
}

main().catch(console.error);
