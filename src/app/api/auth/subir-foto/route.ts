import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    const { user } = await getServerSession();
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!file || !userId) {
      return NextResponse.json({ error: 'Archivo y userId requeridos' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${userId}/${Date.now()}.${ext}`;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const bucketName = 'fotos';
    const { data: existing } = await supabase.storage.getBucket(bucketName);
    if (!existing) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600);
    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: signedError?.message || 'No se pudo generar la URL' }, { status: 500 });
    }

    const fotoUrl = fileName;

    const { error: updateError } = await supabase
      .from('perfiles')
      .update({ foto_url: fotoUrl })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ foto_url: fotoUrl, signed_url: signed.signedUrl });
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
