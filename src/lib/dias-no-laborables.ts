import { createClient } from '@/lib/supabase/client';

let cache: Set<string> | null = null;
let cachePromise: Promise<Set<string>> | null = null;

export async function fetchDiasNoLaborables(): Promise<Set<string>> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('dias_no_laborables')
        .select('fecha');
      const set = new Set((data || []).map((r: any) => r.fecha));
      cache = set;
      return set;
    } catch {
      return new Set<string>();
    }
  })();
  return cachePromise;
}

export function esDiaLaborable(fecha: string): boolean {
  const d = new Date(fecha + 'T12:00:00');
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  if (cache && cache.has(fecha)) return false;
  return true;
}

export function getDiasNoLaborablesCache(): Set<string> | null {
  return cache;
}
