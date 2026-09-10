import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const path = new URL(request.url).searchParams.get('path');
  if (!path || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Ruta invalida' }, { status: 403 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await service.storage.from('fotos').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return NextResponse.json({ error: error?.message || 'No disponible' }, { status: 404 });
  return NextResponse.json({ signed_url: data.signedUrl });
}
