import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data: staff } = await auth.rpc('is_staff');
  const { id } = await params;
  if (staff !== true && user.id !== id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await service.from('perfiles').select('foto_url').eq('id', id).maybeSingle();
  if (!perfil?.foto_url) return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
  const path = perfil.foto_url.includes('/fotos/') ? perfil.foto_url.split('/fotos/')[1] : perfil.foto_url;
  const { data, error } = await service.storage.from('fotos').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Foto no disponible' }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
