import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

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
      await supabase.storage.createBucket(bucketName, { public: true });
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

    const { data: publicUrl } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const fotoUrl = publicUrl.publicUrl;

    const { error: updateError } = await supabase
      .from('perfiles')
      .update({ foto_url: fotoUrl })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ foto_url: fotoUrl });
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
