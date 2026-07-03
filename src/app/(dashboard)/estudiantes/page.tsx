'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

const grados = [
  { id: 1, label: '1° Grado', desc: 'Primer grado de primaria', color: 'from-blue-500/20 to-blue-600/10', iconBg: 'bg-blue-500' },
  { id: 2, label: '2° Grado', desc: 'Segundo grado de primaria', color: 'from-green-500/20 to-green-600/10', iconBg: 'bg-green-500' },
  { id: 3, label: '3° Grado', desc: 'Tercer grado de primaria', color: 'from-yellow-500/20 to-yellow-600/10', iconBg: 'bg-yellow-500' },
  { id: 4, label: '4° Grado', desc: 'Cuarto grado de primaria', color: 'from-purple-500/20 to-purple-600/10', iconBg: 'bg-purple-500' },
  { id: 5, label: '5° Grado', desc: 'Quinto grado de primaria', color: 'from-orange-500/20 to-orange-600/10', iconBg: 'bg-orange-500' },
];

const normalizeGrado = (g: string) => {
  const map: Record<string, string> = { '1': '1°', '2': '2°', '3': '3°', '4': '4°', '5': '5°' };
  return map[g.replace(/[^\d]/g, '')] || g;
};

export default function EstudiantesPage() {
  const [conteos, setConteos] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchConteos = async () => {
      const { data } = await supabase
        .from('alumnos')
        .select('grado');
      if (data) {
        const counts: Record<number, number> = {};
        data.forEach((a: any) => {
          const g = normalizeGrado(a.grado || '');
          const id = grados.find(gr => gr.label.startsWith(g))?.id;
          if (id) counts[id] = (counts[id] || 0) + 1;
        });
        grados.forEach(g => { if (!counts[g.id]) counts[g.id] = 0; });
        setConteos(counts);
      }
      setLoading(false);
    };
    fetchConteos();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Estudiantes</h1>
        <p className="text-sm text-muted-foreground">Selecciona un grado para ver sus estudiantes</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {grados.map((grado, index) => (
            <Link key={grado.id} href={`/estudiantes/${grado.id}`}>
              <Card className="card-hover-lift animate-fade-in-up shadow-card cursor-pointer group" style={{ animationDelay: `${index * 50}ms` }}>
                <CardContent className="relative overflow-hidden p-5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${grado.color} opacity-80`} />
                  <div className="relative space-y-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${grado.iconBg}/10 transition-transform duration-200 group-hover:scale-110`}>
                      <GraduationCap className={`h-7 w-7 text-white`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{grado.label}</h3>
                      <p className="text-xs text-muted-foreground">{grado.desc}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {conteos[grado.id] || 0} alumnos
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg transition-transform duration-200 group-hover:translate-x-1">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
