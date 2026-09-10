import { NextResponse } from 'next/server';
import { isServerAdmin } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const { uid, password } = await request.json();

    const { authorized } = await isServerAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!uid || !password || password.length < 6) {
      return NextResponse.json({ error: 'Contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('/rest/v1', '');
    const res = await fetch(`${authUrl}/auth/v1/admin/users/${uid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.msg || 'Error al restablecer contraseña' }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
