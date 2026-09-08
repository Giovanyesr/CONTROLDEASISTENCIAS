# Sistema de Control de Asistencia con QR

Sistema de gestión interna para la **I.E. 30916 San Francisco de Asís** (Puente Capelo).
Registra y controla la asistencia estudiantil mediante códigos QR, con roles y permisos.

> No es una plataforma SaaS ni multi-institucional. Es un sistema interno de una sola institución educativa.

---

## 1. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript + React |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend / BBDD | Supabase (PostgreSQL 17) |
| PWA | manifest + service worker + modo offline |
| Reportes | Excel (`xlsx`) y PDF (`jsPDF`) |
| QR | Generación y escaneo |

---

## 2. Roles y permisos

| Rol | Acceso |
|-----|--------|
| **Admin** | Todo: Panel Admin, Gestión de usuarios, estudiantes, justificaciones, días no laborables |
| **Director** | Dashboard, estudiantes, historial, justificaciones, perfil |
| **Docente (Tutor)** | Dashboard, estudiantes (de su grado), historial, justificaciones, perfil |
| **Brigadier** | Dashboard, escáner QR, estudiantes, historial, justificaciones, perfil |
| **Alumno** | Dashboard (su asistencia), historial, perfil |

- Login por **DNI** → email `{dni}@colegio.local`.
- El admin puede **cambiar** a un usuario entre `brigadier` y `alumno`.

---

## 3. Módulos (páginas)

| Ruta | Descripción |
|------|-------------|
| `/login`, `/recuperar` | Autenticación y recuperación de contraseña |
| `/dashboard` | Vista por rol; brigadier ve estadísticas en vivo, alumno ve su calendario mensual |
| `/escaner` | Registro de asistencia escaneando el QR (solo brigadier) |
| `/estudiantes` | Listado por grado/sección, registrar/editar, convertir rol |
| `/historial` | Registros con filtros y exportación (Excel/PDF) |
| `/justificaciones` | Justificar faltas y subir evidencias |
| `/admin` | Panel de control: estadísticas + gestión de brigadieres, docentes, directores, alumnos |
| `/roles` | Gestión de usuarios: tabla con búsqueda, crear/editar/activar/eliminar, asignar tutores |
| `/dias-no-laborables` | Administrar feriados y vacaciones |
| `/perfil` | Datos personales, foto, código QR, carnet, cambio de contraseña |

---

## 4. Base de datos (10 tablas + 2 vistas + 7 funciones)

### Tablas
| Tabla | Propósito |
|-------|-----------|
| `perfiles` | Usuarios (alumno, brigadier, tutor, director, admin) |
| `alumnos` | Datos académicos por usuario (grado, sección, apoderado) |
| `asistencias` | Registro diario de asistencia |
| `justificaciones` | Cambios de estado de una asistencia (con motivo) |
| `evidencias` | Archivos adjuntos de justificación |
| `auditoria` | Log automático de cambios (por triggers) |
| `sesiones` | Seguimiento de usuarios conectados |
| `dias_no_laborables` | Feriados y vacaciones (40 cargados) |
| `configuracion_asistencia` | Intervalos horarios (inicio / presente / tardanza) |
| `tutor_asignaciones` | Docentes asignados a grado/sección |

### Vistas
- `vista_dashboard` — resumen de asistencia en tiempo real.
- `vista_estadisticas_brigadier` — métricas por brigadier.

### Funciones RPC
- `registrar_asistencia` — registra asistencia validando horario y duplicados.
- `justificar_asistencia` — cambia estado y guarda justificación.
- `registrar_faltas_diarias` — cierre del día: marca faltas automáticas.

### Seguridad (RLS)
- Políticas por rol con helpers `is_staff()` e `is_admin()` (como `SECURITY DEFINER` para evitar recursión).
- Triggers de auditoría y de `updated_at`.

---

## 5. Integraciones

- **Auth:** email con auto-confirmación.
- **Storage:** buckets `fotos` y `evidencias` (públicos).
- **Realtime:** tabla `asistencias` (actualización en vivo).

---

## 6. Despliegue

| Recurso | Valor |
|---------|-------|
| Repositorio | `github.com/Giovanyesr/CONTROLDEASISTENCIAS` (rama `master`) |
| Supabase | proyecto `nrobzkilckuhcsbqdgyc` |
| Vercel | pendiente de configuración |

### Variables de entorno para Vercel
```env
NEXT_PUBLIC_SUPABASE_URL=https://nrobzkilckuhcsbqdgyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Las claves reales están en `.env.local` (no se suben al repo). La `SERVICE_ROLE_KEY` solo se usa en el servidor (rutas API), nunca se expone al cliente.

### Usuario inicial
- Admin: DNI `00030916` · contraseña `admin123`

---

## 7. Estado actual

- Esquema consolidado y base de datos configurada.
- Bug de cron de faltas automáticas corregido.
- Recursión de RLS corregida (brigadieres/tutores ya ven estudiantes).
- Código muerto y archivos SQL obsoletos eliminados; scripts migrados al proyecto nuevo.
- Identidad visual institucional (dorado/crema) aplicada a gestión de usuarios y panel admin.