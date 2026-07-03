'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useDiasNoLaborables() {
  const [dias, setDias] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchDias = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('dias_no_laborables')
          .select('fecha');
        setDias(new Set((data || []).map((r: any) => r.fecha)));
      } catch {
        // table may not exist yet
      } finally {
        setLoaded(true);
      }
    };
    fetchDias();
  }, []);

  const esLaborable = (fecha: string) => {
    const d = new Date(fecha + 'T12:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    if (dias.has(fecha)) return false;
    return true;
  };

  return { diasNoLaborables: dias, loaded, esLaborable };
}
