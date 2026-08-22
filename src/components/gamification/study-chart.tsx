'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Temps d'étude quotidien.
 * Les couleurs viennent des tokens CSS : le graphique suit le thème clair/sombre
 * sans code conditionnel.
 */
export function StudyChart({ data }: { data: Array<{ date: string; minutes: number }> }) {
  const total = data.reduce((sum, point) => sum + point.minutes, 0);

  if (total === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Aucune session d&apos;étude enregistrée sur les 30 derniers jours.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => {
              const date = new Date(value);
              return date.getDate() === 1 || date.getDay() === 1
                ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
                : '';
            }}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              fontSize: '0.8125rem',
              color: 'var(--popover-foreground)',
            }}
            labelFormatter={(label) =>
              new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(String(label)))
            }
            formatter={(value) => [`${Number(value)} min`, "Temps d'étude"]}
          />
          <Bar dataKey="minutes" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
