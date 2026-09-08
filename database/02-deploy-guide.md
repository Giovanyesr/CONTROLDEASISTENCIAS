# Guía de Despliegue - Sistema de Control de Asistencia con QR

## 1. Configuración de Supabase

### 1.1 Crear proyecto
1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión
2. Crea un nuevo proyecto
3. Guarda las credenciales: `Project URL` y `anon public key`

### 1.2 Configurar Base de Datos
1. Ve a **SQL Editor** en Supabase
2. Copia y pega el contenido de `database/00-esquema-completo.sql` y ejecútalo
3. Copia y pega el contenido de `database/00-esquema-completo.sql` y ejecútalo

### 1.3 Configurar Autenticación
1. Ve a **Authentication > Providers**
2. Habilita **Email** (solo Email, deshabilitar confirmación de email si es necesario)
3. En **Authentication > Settings**:
   - `SITE_URL`: `https://tu-dominio.vercel.app`
   - `Redirect URLs`: agrega `https://tu-dominio.vercel.app/auth/callback`

### 1.4 Configurar Storage
1. Ve a **Storage**
2. Crea los buckets:
   - `evidencias` (público)
   - `fotos` (público)
   - `qr` (público)

### 1.5 Configurar Realtime
1. Ve a **Database > Replication**
2. Habilita Realtime para las tablas: `asistencias`, `perfiles`, `sesiones`

---

## 2. Configuración del Proyecto

### 2.1 Variables de Entorno
Crea un archivo `.env.local` con:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 2.2 Instalar dependencias
```bash
npm install
```

### 2.3 Ejecutar en desarrollo
```bash
npm run dev
```

---

## 3. Despliegue en Vercel

### 3.1 Preparación
1. Crea un repositorio en GitHub con el proyecto
2. Sube el código:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### 3.2 Configurar Vercel
1. Ve a [https://vercel.com](https://vercel.com)
2. Importa el repositorio de GitHub
3. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Despliega

### 3.3 Post-Despliegue
1. Actualiza la `SITE_URL` en Supabase Auth con la URL de Vercel
2. Prueba el flujo completo de autenticación

---

## 4. Creación de Usuarios Iniciales

Ejecuta en el SQL Editor de Supabase:

```sql
-- Crear un brigadier de prueba
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  '12345678@colegio.edu.pe',
  crypt('password123', gen_salt('bf')),
  now()
);

-- El ID generado se usa también en perfiles
INSERT INTO perfiles (id, dni, nombres, apellidos, celular, rol)
VALUES (
  (SELECT id FROM auth.users WHERE email = '12345678@colegio.edu.pe'),
  '12345678',
  'Admin',
  'Sistema',
  '999888777',
  'brigadier'
);

INSERT INTO brigadieres (perfil_id)
VALUES ((SELECT id FROM perfiles WHERE dni = '12345678'));
```

---

## 5. Estructura del Proyecto

```
colegio-asistencia/
├── database/
│   ├── 00-schema.sql          # Esquema completo de BD
│   ├── 01-rls-policies.sql    # Políticas de seguridad RLS
│   └── 02-deploy-guide.md     # Esta guía
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   └── offline.html           # Página offline
├── src/
│   ├── app/
│   │   ├── (auth)/login       # Página de inicio de sesión
│   │   ├── (auth)/recuperar   # Recuperación de contraseña
│   │   ├── (dashboard)/       # Módulo dashboard (protegido)
│   │   │   ├── dashboard/     # Dashboard principal
│   │   │   ├── escaner/       # Escáner QR
│   │   │   ├── estudiantes/   # Gestión de estudiantes
│   │   │   ├── historial/     # Historial de asistencias
│   │   │   ├── justificaciones/ # Justificaciones
│   │   │   ├── perfil/        # Perfil de usuario
│   │   │   └── brigadieres/   # Estadísticas de brigadieres
│   │   └── auth/callback/     # Callback de autenticación
│   ├── components/
│   │   ├── ui/                # Componentes shadcn/ui
│   │   ├── layout/            # Sidebar, DashboardLayout
│   │   ├── qr/                # QRDisplay, QRScanner
│   ├── hooks/useAuth.ts       # Hook de autenticación
│   ├── lib/
│   │   ├── supabase/          # Clientes Supabase
│   │   ├── utils.ts           # Utilidades
│   │   └── validations.ts     # Esquemas Zod
│   ├── types/database.ts      # Tipos TypeScript
│   └── proxy.ts               # Proxy de autenticación
├── next.config.ts
├── package.json
└── tailwind.config.js
```
