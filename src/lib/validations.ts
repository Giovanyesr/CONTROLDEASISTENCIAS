import { z } from 'zod';

export const loginSchema = z.object({
  dni: z.string().length(8, 'El DNI debe tener 8 dígitos').regex(/^\d+$/, 'Solo números'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const recoverySchema = z.object({
  dni: z.string().length(8, 'El DNI debe tener 8 dígitos').regex(/^\d+$/, 'Solo números'),
});

export type RecoveryInput = z.infer<typeof recoverySchema>;

export const estudianteSchema = z.object({
  dni: z.string().length(8).regex(/^\d+$/),
  nombres: z.string().min(2).max(150),
  apellidos: z.string().min(2).max(150),
  celular: z.string().regex(/^\d{9}$/).optional().or(z.literal('')),
  grado: z.string().min(1),
  seccion: z.string().min(1).max(10),
  apoderado_nombre: z.string().max(200).optional().or(z.literal('')),
  apoderado_celular: z.string().regex(/^\d{9}$/).optional().or(z.literal('')),
});

export type EstudianteInput = z.infer<typeof estudianteSchema>;

export const perfilSchema = z.object({
  celular: z.string().regex(/^\d{9}$/, 'Celular debe tener 9 dígitos').optional().or(z.literal('')),
  foto_url: z.string().url().optional().or(z.literal('')),
});

export type PerfilInput = z.infer<typeof perfilSchema>;

export const justificacionSchema = z.object({
  estado_nuevo: z.enum(['presente', 'tardanza', 'falta_justificada', 'falta_injustificada']),
  motivo: z.string().min(10, 'Mínimo 10 caracteres').max(500),
});

export type JustificacionInput = z.infer<typeof justificacionSchema>;
