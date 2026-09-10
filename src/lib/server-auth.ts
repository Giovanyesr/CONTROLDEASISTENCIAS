import { createClient } from '@/lib/supabase/server';

export async function getServerSession() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function isServerAdmin() {
  const { supabase, user } = await getServerSession();
  if (!user) return { supabase, user: null, authorized: false };
  const { data, error } = await supabase.rpc('is_admin');
  return { supabase, user, authorized: !error && data === true };
}
