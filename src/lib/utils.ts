import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeZone: 'America/Lima',
  }).format(toDateValue(date));
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(date));
}

export function getEstadoColor(estado: string): string {
  const colors: Record<string, string> = {
    presente: 'text-green-600 bg-green-50 border-green-200',
    tardanza: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    falta_justificada: 'text-blue-600 bg-blue-50 border-blue-200',
    falta_injustificada: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[estado] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getEstadoLabel(estado: string): string {
  const labels: Record<string, string> = {
    presente: 'Presente',
    tardanza: 'Tardanza',
    falta_justificada: 'Falta Justificada',
    falta_injustificada: 'Falta Injustificada',
  };
  return labels[estado] || estado;
}

export interface IntervalosAsistencia {
  inicio: string;
  limite_presente: string;
  limite_tardanza: string;
}

const INTERVALOS_DEFAULT: IntervalosAsistencia = {
  inicio: '07:00:00',
  limite_presente: '07:15:00',
  limite_tardanza: '07:45:00',
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toDateValue(date: string | Date): Date {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00`)
    : new Date(date);
}

export function getPeruDate(date?: string | Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date ? toDateValue(date) : new Date());
}

export function getPeruCalendarDate(): Date {
  return new Date(`${getPeruDate()}T12:00:00`);
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calcularEstadoAsistencia(hora: string, intervalos?: IntervalosAsistencia): string {
  const cfg = intervalos || INTERVALOS_DEFAULT;
  const minutos = timeToMinutes(hora);
  const inicio = timeToMinutes(cfg.inicio);
  const limitePresente = timeToMinutes(cfg.limite_presente);
  const limiteTardanza = timeToMinutes(cfg.limite_tardanza);

  if (minutos >= inicio && minutos <= limitePresente) return 'presente';
  if (minutos > limitePresente && minutos <= limiteTardanza) return 'tardanza';
  return '';
}
