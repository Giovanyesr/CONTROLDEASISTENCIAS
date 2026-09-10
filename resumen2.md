# Resumen General del Sistema

## 1. Identificacion

**Nombre:** Sistema de Control de Asistencia con QR

**Institucion:** I.E. 30916 San Francisco de Asis

**Ubicacion:** Puente Capelo

**Tipo:** Sistema interno para una sola institucion educativa. No es multiinstitucional ni SaaS.

**Repositorio:** `https://github.com/Giovanyesr/CONTROLDEASISTENCIAS.git`

**Rama principal:** `master`

## 2. Objetivo

El sistema permite registrar, consultar y supervisar la asistencia diaria de los estudiantes mediante codigos QR. Controla presentes, tardanzas, faltas justificadas e injustificadas, usuarios, permisos, feriados, evidencias y auditoria.

## 3. Tecnologias

| Capa | Tecnologia |
|---|---|
| Frontend y backend | Next.js 16.2.9 con App Router |
| Lenguaje | TypeScript |
| Interfaz | React 19, Tailwind CSS 4, componentes Radix/shadcn |
| Base de datos | Supabase PostgreSQL |
| Autenticacion | Supabase Auth |
| Archivos | Supabase Storage |
| QR | `qrcode.react` y `html5-qrcode` |
| Reportes | Excel con `xlsx`, PDF con `jspdf` |
| PWA | Manifest y service worker |
| Tiempo real | Supabase Realtime |
| Validacion | Zod y React Hook Form |

Comandos principales:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 4. Roles del sistema

### Administrador

- Acceso completo al panel administrativo.
- Gestion de usuarios, directores, docentes, brigadieres y alumnos.
- Creacion, edicion, activacion y eliminacion de usuarios.
- Configuracion de horarios de asistencia.
- Gestion de dias no laborables.
- Gestion de tutores y asignaciones.
- Consulta de estadisticas institucionales.

### Director

- Dashboard institucional de toda la institucion.
- Cantidad de estudiantes y personal activos.
- Presentes, tardanzas y faltas del dia.
- Cobertura y porcentaje de asistencia.
- Ultimos registros de asistencia.
- Consulta de estudiantes, historial y justificaciones.
- Aprobacion o rechazo de justificaciones.
- Gestion de su perfil.

### Docente o tutor

- Dashboard.
- Consulta de estudiantes asignados.
- Historial de asistencia.
- Justificaciones.
- Perfil personal.

### Brigadier

- Dashboard de asistencia.
- Registro de asistencia mediante escaner QR.
- Cierre diario de asistencia.
- Consulta de estudiantes e historial.
- Justificaciones y perfil.

### Alumno

- Dashboard personal.
- Calendario mensual de asistencia.
- Consulta de historial propio.
- Solicitud de justificacion de faltas.
- Carga de evidencias.
- Perfil, QR y cambio de contrasena.

## 5. Autenticacion

- El usuario inicia sesion con su DNI.
- Internamente el sistema utiliza el correo `{dni}@colegio.local`.
- La contrasena se valida en Supabase Auth.
- Las contrasenas no se almacenan en texto plano.
- La recuperacion y cambio de contrasena se realizan mediante Supabase Auth.
- Las rutas protegidas verifican la sesion y el perfil del usuario.

## 6. Paginas principales

| Ruta | Funcion |
|---|---|
| `/login` | Inicio de sesion por DNI y contrasena |
| `/recuperar` | Recuperacion de acceso |
| `/dashboard` | Panel personalizado por rol |
| `/escaner` | Escaneo QR y registro de asistencia |
| `/estudiantes` | Seleccion de grado y seccion |
| `/estudiantes/[grado]` | Lista, historial y gestion de estudiantes |
| `/historial` | Consulta, filtros y exportacion de asistencia |
| `/justificaciones` | Solicitud y revision de justificaciones |
| `/notificaciones` | Avisos de solicitudes y revisiones |
| `/dias-no-laborables` | Feriados, vacaciones y dias no laborables |
| `/brigadieres` | Estadisticas y consulta de brigadieres |
| `/roles` | Administracion de usuarios y roles |
| `/admin` | Panel general del administrador |
| `/perfil` | Datos personales, foto, QR y contrasena |

## 7. Flujo de asistencia

1. El brigadier abre el escaner QR.
2. El alumno muestra su codigo QR.
3. El sistema identifica al alumno y valida que este activo.
4. Se obtiene la hora peruana actual.
5. La funcion `calcular_estado_asistencia` compara la hora con la configuracion.
6. Se registra la fecha, hora, estado, alumno y brigadier.
7. No se permite duplicar asistencia el mismo dia.
8. El dashboard se actualiza mediante Supabase Realtime.
9. Al cerrar el dia, se generan faltas automaticas para alumnos sin registro.

Estados posibles:

- `presente`
- `tardanza`
- `falta_justificada`
- `falta_injustificada`

## 8. Justificaciones

- Un alumno o brigadier puede solicitar justificar una falta propia.
- Se valida que la fecha corresponda al periodo permitido de dias habiles.
- Se excluyen sabados, domingos y dias registrados en `dias_no_laborables`.
- Se puede registrar un motivo y evidencias.
- El director revisa la solicitud.
- La solicitud puede quedar `pendiente`, `aprobada` o `rechazada`.
- Al aprobarse, la asistencia cambia a `falta_justificada`.
- Se envia una notificacion al usuario correspondiente.
- La revision queda registrada con fecha y usuario revisor.

## 9. Base de datos

El esquema consolidado se encuentra en `database/00-esquema-completo.sql`.

### Tablas principales

| Tabla | Uso |
|---|---|
| `perfiles` | Usuarios, datos personales, rol y estado |
| `alumnos` | Grado, seccion y datos del apoderado |
| `asistencias` | Registros diarios de asistencia |
| `justificaciones` | Solicitudes, motivos y revisiones |
| `evidencias` | Archivos asociados a justificaciones |
| `notificaciones` | Avisos para los usuarios |
| `auditoria` | Historial automatico de cambios |
| `sesiones` | Seguimiento de acceso y ultima actividad |
| `dias_no_laborables` | Feriados, vacaciones y fechas excluidas |
| `configuracion_asistencia` | Inicio, limite de presente y limite de tardanza |
| `tutor_asignaciones` | Relacion entre tutores y grados/secciones |

### Vistas

- `vista_dashboard`: resumen general de asistencia.
- `vista_estadisticas_brigadier`: metricas por brigadier.

### Funciones principales

- `calcular_estado_asistencia`: determina presente o tardanza.
- `registrar_asistencia`: valida y registra un QR.
- `justificar_asistencia`: registra cambios de estado antiguos.
- `registrar_faltas_diarias`: genera faltas al cerrar la asistencia.
- `dias_habiles_desde`: calcula dias habiles para justificaciones.
- `solicitar_justificacion`: crea y valida solicitudes.
- `revisar_justificacion`: permite al director aprobar o rechazar.
- `crear_notificacion`: crea notificaciones internas.
- `is_admin`, `is_staff`, `is_director`: helpers de permisos.

## 10. Seguridad y permisos

- Row Level Security esta habilitado en las tablas principales.
- Los helpers de rol utilizan `SECURITY DEFINER` para evitar recursiones en politicas RLS.
- Los alumnos solo pueden consultar su propia informacion.
- El personal autorizado puede consultar informacion institucional segun su rol.
- Solo brigadieres autorizados pueden registrar asistencia por QR.
- Solo el director puede revisar justificaciones.
- Las rutas que usan privilegios de servidor deben utilizar `SUPABASE_SERVICE_ROLE_KEY` unicamente en el servidor.
- Las claves y variables reales deben permanecer en `.env.local` y no publicarse en GitHub.

## 11. Zona horaria

La zona horaria oficial es `America/Lima`.

Configuraciones aplicadas:

- PostgreSQL configurado con `America/Lima`.
- Las funciones de asistencia y dias habiles fijan la zona horaria de Peru.
- Las fechas de asistencia se guardan como `DATE`.
- Las horas de asistencia se guardan como `TIME`.
- Los eventos de auditoria se guardan como `TIMESTAMPTZ`.
- El frontend usa `Intl.DateTimeFormat` con `America/Lima`.
- Se corrigieron calendarios, historial, notificaciones, exportaciones y fechas futuras.
- Las fechas futuras no se pintan como faltas.

## 12. Almacenamiento y tiempo real

Buckets utilizados:

- `fotos`: fotografias de usuarios.
- `evidencias`: documentos o imagenes de justificaciones.

La tabla `asistencias` utiliza Supabase Realtime para actualizar dashboards cuando se registra o modifica una asistencia.

## 13. API interna

### Asistencia

- `/api/asistencia/cerrar-dia`
- `/api/asistencia/generar-qr`
- `/api/configuracion/asistencia`

### Usuarios

- `/api/usuarios`
- `/api/auth/crear-usuario`
- `/api/auth/crear-alumno`
- `/api/auth/crear-brigadier`
- `/api/auth/cambiar-rol`
- `/api/auth/asignar-brigadier`
- `/api/auth/eliminar-alumno`
- `/api/auth/restablecer-password`
- `/api/auth/actualizar-perfil`
- `/api/auth/subir-foto`
- `/api/auth/dni-lookup`

### Justificaciones

- `/api/justificaciones/solicitar`
- `/api/justificaciones/revisar`

### Administracion

- `/api/admin/resumen`
- `/api/tutores/asignar`

## 14. PWA y experiencia de usuario

- La aplicacion puede instalarse como PWA.
- Existe service worker en `public/sw.js`.
- Las navegaciones intentan usar red y tienen pagina offline de respaldo.
- La interfaz utiliza identidad visual institucional en tonos dorado, crema y azul.
- La navegacion lateral y movil se filtra por rol.
- El diseño es responsive para escritorio y movil.

## 15. Scripts de datos

La carpeta `scripts/` contiene utilidades para:

- Crear usuarios y alumnos de prueba.
- Crear brigadieres.
- Cargar feriados y dias no laborables.
- Generar datos de asistencia.
- Cargar estudiantes de quinto grado.

Antes de ejecutar scripts en produccion se debe revisar el proyecto Supabase seleccionado y las variables de entorno activas.

## 16. Despliegue

### Desarrollo local

```bash
npm install
npm run dev
```

### Produccion

```bash
npm run build
npm run start
```

Variables necesarias:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

La clave `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse en componentes cliente ni enviarse al navegador.

## 17. Estado actual

- Base de datos Supabase configurada.
- Zona horaria de Peru auditada y corregida.
- Dashboard institucional del director implementado.
- Etiquetas de rol corregidas en el perfil.
- Calendario corregido para no marcar fechas futuras como faltas.
- QR dinamico implementado con tokens de 60 segundos validados en PostgreSQL.
- Tabla `roles_funcionales` agregada para soportar brigadier como funcion adicional.
- Tabla `qr_sesiones` agregada para controlar expiracion y reutilizacion de tokens.
- La migracion `database/01-qr-dinamico-roles-funcionales.sql` fue aplicada en Supabase.
- Flujo de justificaciones implementado.
- Notificaciones internas implementadas.
- Build de produccion verificado correctamente.
- Ultimo commit relevante: `4b05641 feat: dashboard institucional para director`.

## 18. Pendientes y recomendaciones

- Confirmar que Vercel este conectado al repositorio y desplegando la rama `master`.
- Desplegar el frontend actualizado antes de usar QR dinamicos en produccion.
- Completar la pantalla administrativa para asignar o quitar el rol funcional brigadier desde `/roles`.
- Validar el dashboard del director con una sesion real en produccion.
- Restablecer las contrasenas de usuarios cuya documentacion no coincida con Supabase.
- No publicar archivos `.env.local` ni claves de servicio.
- Ejecutar pruebas de login por cada rol.
- Probar cierre diario despues del limite de tardanza.
- Probar solicitud, aprobacion y rechazo de justificaciones.
- Revisar periodicamente los logs de auditoria.

## 19. Remediacion de seguridad y operacion

Aplicado en codigo y Supabase:

- Las rutas administrativas validan la sesion real de Supabase y el rol `admin`.
- Se elimino la autorizacion basada en `adminDni`, `x-admin-dni` y listas de DNI en las APIs.
- `dni-lookup` requiere sesion y limita la consulta al propio usuario o staff.
- Los buckets `fotos` y `evidencias` estan configurados como privados.
- Las fotos y evidencias se sirven mediante URLs firmadas de corta duracion.
- Se agrego `cierres_diarios` para trazabilidad.
- Se agrego `vercel.json` con cron de cierre de lunes a viernes.
- `CRON_SECRET` es obligatorio para ejecutar el cierre.
- El cierre excluye fines de semana y dias no laborables.
- Las justificaciones rechazan fechas futuras y limpian faltas inferidas si falla la solicitud.
- Las justificaciones de faltas inferidas ahora se crean y validan en una RPC transaccional.
- La politica de insercion directa de asistencias exige un brigadier funcional.
- Se agrego control de intentos QR por brigadier y minuto.

Antes de declarar el sistema listo se debe configurar `CRON_SECRET` en Vercel, desplegar el frontend actualizado, eliminar la RPC estatica antigua, completar rate limiting por IP y ejecutar pruebas reales de RLS, almacenamiento privado, cron y QR.
