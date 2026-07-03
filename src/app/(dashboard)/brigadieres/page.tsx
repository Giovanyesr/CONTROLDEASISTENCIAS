'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ShieldCheck, Activity, BarChart3, Loader2, Users, CalendarDays, Smartphone, Hash, User, Mail } from 'lucide-react';

export default function BrigadieresPage() {
  const [brigadieres, setBrigadieres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProfile, setDetailProfile] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('vista_estadisticas_brigadier')
        .select('*')
        .order('total_registros', { ascending: false });
      setBrigadieres((data || []).filter((b: any) => b.dni !== '00000000'));
      setLoading(false);
    };
    cargar();
  }, []);

  const totalRegistros = brigadieres.reduce((s: number, b: any) => s + (b.total_registros || 0), 0);
  const maxRegistros = Math.max(...brigadieres.map((b: any) => b.total_registros || 0), 1);

  const abrirDetalle = async (b: any) => {
    setSelected(b);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailProfile(null);
    const { data } = await supabase.from('perfiles').select('*').eq('id', b.brigadier_id).single();
    setDetailProfile(data);
    setDetailLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Brigadieres</h1>
          <p className="text-sm text-muted-foreground">Estadísticas de actividad</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-card card-hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Brigadieres</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{brigadieres.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <ShieldCheck className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card card-hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Registros</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{totalRegistros}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Actividad por Brigadier
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Brigadier</TableHead>
                  <TableHead className="font-semibold text-foreground">DNI</TableHead>
                  <TableHead className="font-semibold text-foreground">Total Registros</TableHead>
                  <TableHead className="font-semibold text-foreground">Días Activos</TableHead>
                  <TableHead className="font-semibold text-foreground">Semana</TableHead>
                  <TableHead className="font-semibold text-foreground">Mes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex items-center justify-center gap-2 py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Cargando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : brigadieres.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <Users className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Sin datos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  brigadieres.map((b: any) => {
                    const barWidth = Math.max((b.total_registros / maxRegistros) * 100, 4);
                    return (
                      <TableRow key={b.brigadier_id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => abrirDetalle(b)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 ring-2 ring-border">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-xs font-semibold text-primary-foreground">
                                {b.nombres?.charAt(0)}{b.apellidos?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{b.nombres} {b.apellidos}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{b.dni}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{b.total_registros}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{b.dias_activos} días</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-md text-xs font-medium">
                            {b.registros_semana}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-md text-xs font-medium">
                            {b.registros_mes}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-border">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-primary-foreground">
                      {selected.nombres?.charAt(0)}{selected.apellidos?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-lg">{selected.nombres} {selected.apellidos}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-normal">
                      <Badge variant="outline" className="rounded-md text-[10px]">Brigadier</Badge>
                      <span>DNI: {selected.dni}</span>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Perfil */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Hash className="h-3.5 w-3.5" />
                        ID
                      </div>
                      <p className="text-sm font-mono text-foreground break-all">{selected.brigadier_id}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Smartphone className="h-3.5 w-3.5" />
                        Celular
                      </div>
                      <p className="text-sm text-foreground">{detailProfile?.celular || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <User className="h-3.5 w-3.5" />
                        Estado
                      </div>
                      <Badge variant={detailProfile?.estado === 'activo' ? 'default' : 'secondary'} className="rounded-md text-xs">
                        {detailProfile?.estado || 'activo'}
                      </Badge>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Registrado
                      </div>
                      <p className="text-sm text-foreground">{detailProfile?.created_at ? new Date(detailProfile.created_at + 'Z').toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </div>
                      <p className="text-sm text-foreground">{selected.dni}@colegio.local</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Rol
                      </div>
                      <Badge className="rounded-md text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300">
                        Brigadier
                      </Badge>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <Card className="border-none shadow-sm bg-muted/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Estadísticas de actividad
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{selected.total_registros}</p>
                          <p className="text-xs text-muted-foreground">Total registros</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{selected.dias_activos}</p>
                          <p className="text-xs text-muted-foreground">Días activos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{selected.registros_mes}</p>
                          <p className="text-xs text-muted-foreground">Este mes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
