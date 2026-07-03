import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { error } = await supabase.from('perfiles').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('/rest/v1', '');
    await fetch(`${authUrl}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
