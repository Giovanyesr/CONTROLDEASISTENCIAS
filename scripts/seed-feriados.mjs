import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://stbqlulxmorzpivxbeoa.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFsdWx4bW9yenBpdnhiZW9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE5OTc4MCwiZXhwIjoyMDk3Nzc1NzgwfQ.ZDyHOa2ZPBYL951wt40JldN_SfkRiK6oSmEtXJoH3pc';
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const FERIADOS = [
  // 2025
  { fecha: '2025-01-01', descripcion: 'Año Nuevo' },
  { fecha: '2025-04-17', descripcion: 'Jueves Santo' },
  { fecha: '2025-04-18', descripcion: 'Viernes Santo' },
  { fecha: '2025-05-01', descripcion: 'Día del Trabajo' },
  { fecha: '2025-06-29', descripcion: 'San Pedro y San Pablo' },
  { fecha: '2025-07-28', descripcion: 'Fiestas Patrias' },
  { fecha: '2025-07-29', descripcion: 'Fiestas Patrias' },
  { fecha: '2025-08-06', descripcion: 'Batalla de Junín' },
  { fecha: '2025-08-30', descripcion: 'Santa Rosa de Lima' },
  { fecha: '2025-10-08', descripcion: 'Combate de Angamos' },
  { fecha: '2025-11-01', descripcion: 'Día de Todos los Santos' },
  { fecha: '2025-12-08', descripcion: 'Inmaculada Concepción' },
  { fecha: '2025-12-25', descripcion: 'Navidad' },

  // 2026
  { fecha: '2026-01-01', descripcion: 'Año Nuevo' },
  { fecha: '2026-04-02', descripcion: 'Jueves Santo' },
  { fecha: '2026-04-03', descripcion: 'Viernes Santo' },
  { fecha: '2026-05-01', descripcion: 'Día del Trabajo' },
  { fecha: '2026-06-29', descripcion: 'San Pedro y San Pablo' },
  { fecha: '2026-07-28', descripcion: 'Fiestas Patrias' },
  { fecha: '2026-07-29', descripcion: 'Fiestas Patrias' },
  { fecha: '2026-08-06', descripcion: 'Batalla de Junín' },
  { fecha: '2026-08-30', descripcion: 'Santa Rosa de Lima' },
  { fecha: '2026-10-08', descripcion: 'Combate de Angamos' },
  { fecha: '2026-11-01', descripcion: 'Día de Todos los Santos' },
  { fecha: '2026-12-08', descripcion: 'Inmaculada Concepción' },
  { fecha: '2026-12-25', descripcion: 'Navidad' },
];

const VACACIONES = [
  // 2026 bimestre I → II (entre abril y mayo)
  { inicio: '2026-04-27', fin: '2026-05-01', descripcion: 'Vacaciones I Bimestre' },
  // 2026 bimestre II → III (entre julio y agosto)
  { inicio: '2026-07-20', fin: '2026-07-24', descripcion: 'Vacaciones II Bimestre' },
  // 2026 bimestre III → IV (entre setiembre y octubre)
  { inicio: '2026-09-28', fin: '2026-10-02', descripcion: 'Vacaciones III Bimestre' },
];

async function seed() {
  console.log('Insertando feriados...');
  for (const f of FERIADOS) {
    const { error } = await supabase
      .from('dias_no_laborables')
      .upsert({ fecha: f.fecha, tipo: 'feriado', descripcion: f.descripcion }, { onConflict: 'fecha' });
    if (error) console.error(`Error feriado ${f.fecha}:`, error.message);
    else console.log(`  ✓ ${f.fecha} - ${f.descripcion}`);
  }

  console.log('\nInsertando vacaciones...');
  for (const v of VACACIONES) {
    const inicio = new Date(v.inicio);
    const fin = new Date(v.fin);
    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const fecha = d.toISOString().split('T')[0];
      const { error } = await supabase
        .from('dias_no_laborables')
        .upsert({ fecha, tipo: 'vacaciones', descripcion: v.descripcion }, { onConflict: 'fecha' });
      if (!error) console.log(`  ✓ ${fecha} - ${v.descripcion}`);
    }
  }

  console.log('\nSeed de feriados y vacaciones completado.');
}

seed().catch(console.error);
