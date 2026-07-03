# Diagrama Entidad-Relación

```
┌──────────────────────┐
│      perfiles        │
├──────────────────────┤
│ PK │ id (UUID)       │──────┐
│    │ dni (VARCHAR 8) │      │
│    │ nombres         │      │
│    │ apellidos       │      │
│    │ celular         │      │
│    │ foto_url        │      │
│    │ rol (alumno/    │      │
│    │     brigadier)  │      │
│    │ estado (activo/ │      │
│    │        inactivo)│      │
│    │ uuid_qr (UUID)  │      │
│    │ created_at      │      │
│    │ updated_at      │      │
└──────────┬───────────┘      │
           │                  │
           │ 1:1              │ 1:1
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│    alumnos       │  │   brigadieres    │
├──────────────────┤  ├──────────────────┤
│ PK │ id (UUID)   │  │ PK │ id (UUID)   │
│ FK │ perfil_id   │  │ FK │ perfil_id   │
│    │ grado       │  │    │ created_at  │
│    │ seccion     │  │    │ updated_at  │
│    │ apoderado_  │  └──────────────────┘
│    │ nombre      │
│    │ apoderado_  │
│    │ celular     │
│    │ created_at  │
│    │ updated_at  │
└──────────────────┘

┌───────────────────────────────────┐
│           asistencias             │
├───────────────────────────────────┤
│ PK │ id (UUID)                    │
│ FK │ alumno_id → perfiles.id      │──────▶ perfiles (alumno)
│ FK │ brigadier_id → perfiles.id   │──────▶ perfiles (brigadier)
│    │ fecha (DATE)                 │
│    │ hora (TIME)                  │
│    │ estado (VARCHAR 30)          │
│    │ observaciones (TEXT)         │
│    │ created_at                   │
│    │ updated_at                   │
│ UNIQUE(alumno_id, fecha)          │
└──────────────┬────────────────────┘
               │ 1:N
               ▼
┌───────────────────────────────────┐
│         justificaciones           │
├───────────────────────────────────┤
│ PK │ id (UUID)                    │
│ FK │ asistencia_id → asistencias  │──────▶ asistencias
│ FK │ brigadier_id → perfiles.id   │──────▶ perfiles
│    │ estado_anterior              │
│    │ estado_nuevo                 │
│    │ motivo (TEXT)                │
│    │ fecha                        │
│    │ hora                         │
│    │ created_at                   │
└──────────────┬────────────────────┘
               │ 1:N
               ▼
┌───────────────────────────────────┐
│           evidencias              │
├───────────────────────────────────┤
│ PK │ id (UUID)                    │
│ FK │ justificacion_id →           │──────▶ justificaciones
│    │   justificaciones            │
│    │ nombre_archivo (VARCHAR 255) │
│    │ url (TEXT)                   │
│    │ tipo_mime (VARCHAR 100)      │
│    │ tamano_bytes (BIGINT)        │
│    │ created_at                   │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│           auditoria               │
├───────────────────────────────────┤
│ PK │ id (UUID)                    │
│ FK │ usuario_id → perfiles.id     │──────▶ perfiles
│    │ accion (VARCHAR 100)         │
│    │ tabla_afectada (VARCHAR 50)  │
│    │ registro_id (UUID)           │
│    │ detalle (JSONB)              │
│    │ direccion_ip (VARCHAR 50)    │
│    │ created_at                   │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│            sesiones               │
├───────────────────────────────────┤
│ PK │ id (UUID)                    │
│ FK │ usuario_id → perfiles.id     │──────▶ perfiles
│    │ ultimo_acceso (TIMESTAMPTZ)  │
│    │ activo (BOOLEAN)             │
│    │ created_at                   │
└───────────────────────────────────┘
```

## Vistas del Sistema

### vista_resumen_diario
Resumen diario de todos los estudiantes con su última asistencia registrada, incluyendo datos del brigadier que registró y la última justificación.

### vista_estadisticas_brigadier
Estadísticas de actividad de cada brigadier: total de registros, días activos, registros semanales y mensuales.

### vista_dashboard
Dashboard en tiempo real: total estudiantes, presentes, tardanzas, faltas y brigadieres conectados.

## Funciones SQL

### calcular_estado_asistencia(hora TIME) → VARCHAR
Determina el estado automático según la hora:
- 07:00 - 07:15 → presente
- 07:16 - 07:45 → tardanza
- Fuera de horario → NULL

### registrar_asistencia(p_alumno_uuid, p_brigadier_id) → JSONB
Registra la asistencia con todas las validaciones:
1. Verifica horario permitido
2. Busca al alumno por UUID QR
3. Valida que no tenga asistencia duplicada
4. Registra la asistencia con estado automático

### justificar_asistencia(p_asistencia_id, p_brigadier_id, p_estado_nuevo, p_motivo) → JSONB
Registra una justificación y actualiza el estado de la asistencia.
