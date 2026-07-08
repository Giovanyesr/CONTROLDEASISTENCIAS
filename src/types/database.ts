export type Rol = 'admin' | 'director' | 'tutor' | 'brigadier' | 'alumno';
export type EstadoPerfil = 'activo' | 'inactivo';
export type EstadoAsistencia = 'presente' | 'tardanza' | 'falta_justificada' | 'falta_injustificada';

export interface Perfil {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  foto_url: string | null;
  genero: string | null;
  rol: Rol;
  estado: EstadoPerfil;
  uuid_qr: string;
  created_at: string;
  updated_at: string;
}

export interface Alumno {
  id: string;
  perfil_id: string;
  grado: string;
  seccion: string;
  apoderado_nombre: string | null;
  apoderado_celular: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brigadier {
  id: string;
  perfil_id: string;
  created_at: string;
  updated_at: string;
}

export interface Asistencia {
  id: string;
  alumno_id: string;
  brigadier_id: string;
  fecha: string;
  hora: string;
  estado: EstadoAsistencia;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface Justificacion {
  id: string;
  asistencia_id: string;
  brigadier_id: string;
  estado_anterior: EstadoAsistencia;
  estado_nuevo: EstadoAsistencia;
  motivo: string;
  fecha: string;
  hora: string;
  created_at: string;
}

export interface Evidencia {
  id: string;
  justificacion_id: string;
  nombre_archivo: string;
  url: string;
  tipo_mime: string;
  tamano_bytes: number | null;
  created_at: string;
}

export interface Auditoria {
  id: string;
  usuario_id: string;
  accion: string;
  tabla_afectada: string | null;
  registro_id: string | null;
  detalle: any;
  direccion_ip: string | null;
  created_at: string;
}

export interface Sesion {
  id: string;
  usuario_id: string;
  ultimo_acceso: string;
  activo: boolean;
  created_at: string;
}

export interface DashboardData {
  total_estudiantes: number;
  presentes_hoy: number;
  tardanzas_hoy: number;
  faltas_justificadas_hoy: number;
  faltas_injustificadas_hoy: number;
  brigadieres_conectados: number;
}

export interface AlumnoConPerfil extends Perfil {
  alumno: Alumno;
}

export interface AsistenciaConRelaciones extends Asistencia {
  alumno?: Perfil;
  brigadier?: Perfil;
  justificaciones?: JustificacionConEvidencias[];
}

export interface JustificacionConEvidencias extends Justificacion {
  evidencias: Evidencia[];
  brigadier?: Perfil;
}
