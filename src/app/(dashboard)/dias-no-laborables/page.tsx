'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CalendarOff, Loader2, Plus, Trash2, CalendarDays, CalendarRange } from 'lucide-react';
import toast from 'react-hot-toast';
import { dateKey } from '@/lib/utils';

export default function DiasNoLaborablesPage() {
  const [dias, setDias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modo, setModo] = useState<'unico' | 'rango'>('unico');
  const [form, setForm] = useState({ fecha: '', fecha_fin: '', tipo: 'feriado', descripcion: '' });
  const [filtro, setFiltro] = useState('todos');
  const supabase = createClient();

  const cargar = async () => {
    let query = supabase.from('dias_no_laborables').select('*').order('fecha', { ascending: false });
    if (filtro !== 'todos') query = query.eq('tipo', filtro);
    const { data } = await query;
    setDias(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtro]);

  const handleCreate = async () => {
    if (!form.fecha || !form.descripcion) { toast.error('Completa todos los campos'); return; }
    if (modo === 'rango' && !form.fecha_fin) { toast.error('Selecciona la fecha fin'); return; }
    if (modo === 'rango' && form.fecha > form.fecha_fin) { toast.error('La fecha fin debe ser posterior a la fecha inicio'); return; }
    setSubmitting(true);
    try {
      const fechas: string[] = [];
      if (modo === 'unico') {
        fechas.push(form.fecha);
      } else {
        const inicio = new Date(form.fecha + 'T12:00:00');
        const fin = new Date(form.fecha_fin + 'T12:00:00');
        for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
          fechas.push(dateKey(d));
        }
      }
      const registros = fechas.map(f => ({ fecha: f, tipo: form.tipo, descripcion: form.descripcion }));
      const { error } = await supabase.from('dias_no_laborables').upsert(registros, { onConflict: 'fecha' });
      if (error) throw new Error(error.message);
      const msg = modo === 'unico' ? 'Día registrado' : `${fechas.length} días registrados`;
      toast.success(msg);
      setOpen(false);
      setForm({ fecha: '', fecha_fin: '', tipo: 'feriado', descripcion: '' });
      setLoading(true);
      await cargar();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este día no laborable?')) return;
    const { error } = await supabase.from('dias_no_laborables').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Eliminado');
    setDias(d => d.filter(x => x.id !== id));
  };

  const tipoColor: Record<string, string> = {
    feriado: 'bg-amber-100 text-amber-800',
    vacaciones: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Días No Laborables</h1>
          <p className="text-sm text-muted-foreground">Feriados y vacaciones del calendario escolar</p>
        </div>
        <Button className="gap-2 rounded-xl" onClick={() => { setModo('unico'); setForm({ fecha: '', fecha_fin: '', tipo: 'feriado', descripcion: '' }); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-40 rounded-xl border-border">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="feriado">Feriados</SelectItem>
            <SelectItem value="vacaciones">Vacaciones</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CalendarOff className="h-5 w-5 text-primary" />
            Listado
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Fecha</TableHead>
                  <TableHead className="font-semibold text-foreground">Tipo</TableHead>
                  <TableHead className="font-semibold text-foreground">Descripción</TableHead>
                  <TableHead className="w-20 text-right font-semibold text-foreground">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex items-center justify-center gap-2 py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Cargando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : dias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Sin registros</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dias.map((d: any) => (
                    <TableRow key={d.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-medium ${tipoColor[d.tipo] || ''}`}>
                          {d.tipo === 'feriado' ? 'Feriado' : 'Vacaciones'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.descripcion}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-4 w-4 text-primary" />
              Agregar día no laborable
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setModo('unico')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modo === 'unico' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <CalendarDays className="mr-1.5 inline h-4 w-4" /> Único
              </button>
              <button
                type="button"
                onClick={() => setModo('rango')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modo === 'rango' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <CalendarRange className="mr-1.5 inline h-4 w-4" /> Rango
              </button>
            </div>

            {modo === 'unico' ? (
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded-xl border-border" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded-xl border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} className="rounded-xl border-border" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="rounded-xl border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feriado">Feriado</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="Ej: Fiestas Patrias" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="rounded-xl border-border" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting} className="gap-2 rounded-xl">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
