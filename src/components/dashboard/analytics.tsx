"use client";

import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { LINK_LABELS } from "@/config/profile";
import type {
  DailyStat,
  EventRow,
  LinkRank,
  Totals,
  TrafficSource,
} from "@/lib/analytics-types";
import { createClient } from "@/lib/supabase/client";

/**
 * Panel en tiempo real.
 *
 * Estrategia: en lugar de volver a consultar la base de datos con cada evento
 * (lo que provocaría una tormenta de queries si te llega tráfico de golpe),
 * aplicamos el evento entrante sobre el estado local. Un INSERT de tipo 'click'
 * suma 1 al total y 1 al botón correspondiente. Es la misma aritmética que hace
 * la vista SQL, pero de forma incremental y sin viajes de red.
 */
export function Analytics({
  initialTotals,
  initialRanking,
  initialSources,
  initialDaily,
}: {
  initialTotals: Totals;
  initialRanking: LinkRank[];
  initialSources: TrafficSource[];
  initialDaily: DailyStat[];
}) {
  const [totals, setTotals] = useState(initialTotals);
  const [ranking, setRanking] = useState(initialRanking);
  const [sources, setSources] = useState(initialSources);
  const [daily] = useState(initialDaily);
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("events-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const row = payload.new as EventRow;

          setTotals((t) => ({
            ...t,
            views: t.views + (row.type === "view" ? 1 : 0),
            views_24h: t.views_24h + (row.type === "view" ? 1 : 0),
            clicks: t.clicks + (row.type === "click" ? 1 : 0),
          }));

          if (row.type === "click" && row.link_id) {
            const linkId = row.link_id;
            setRanking((prev) => {
              const exists = prev.some((r) => r.link_id === linkId);
              const next = exists
                ? prev.map((r) =>
                    r.link_id === linkId
                      ? { ...r, clicks: r.clicks + 1, last_click: row.created_at }
                      : r,
                  )
                : [
                    ...prev,
                    { link_id: linkId, clicks: 1, last_click: row.created_at },
                  ];
              // Reordenamos para que el ranking siga siendo un ranking.
              return next.sort((a, b) => b.clicks - a.clicks);
            });
          }

          // Origen del tráfico, con la misma prioridad que la vista SQL:
          // utm_source > dominio de origen > directo.
          const source =
            row.utm_source?.toLowerCase() || row.referrer_host || "directo";
          setSources((prev) => {
            const exists = prev.some((s) => s.source === source);
            const next = exists
              ? prev.map((s) =>
                  s.source === source
                    ? {
                        ...s,
                        views: s.views + (row.type === "view" ? 1 : 0),
                        clicks: s.clicks + (row.type === "click" ? 1 : 0),
                      }
                    : s,
                )
              : [
                  ...prev,
                  {
                    source,
                    views: row.type === "view" ? 1 : 0,
                    clicks: row.type === "click" ? 1 : 0,
                  },
                ];
            return next.sort((a, b) => b.views - a.views || b.clicks - a.clicks);
          });

          // Aviso visual de que acaba de entrar algo.
          setFlash(
            row.type === "view"
              ? "Nueva visita"
              : `Clic en ${LINK_LABELS[row.link_id ?? ""] ?? row.link_id}`,
          );
          setTimeout(() => setFlash(null), 2600);
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    // Cerrar el canal al desmontar evita fugas de WebSockets al navegar.
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const ctr = totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0;
  const topClicks = useMemo(
    () => Math.max(1, ...ranking.map((r) => r.clicks)),
    [ranking],
  );

  return (
    <main className="relative min-h-dvh px-5 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />

      <div className="relative mx-auto max-w-3xl">
        {/* ---- Cabecera ---- */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analítica</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <span
                className={`size-2 rounded-full transition-colors ${
                  live ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {live ? "En vivo" : "Conectando…"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="h-11 rounded-full border border-line px-4 text-sm font-semibold transition-colors hover:border-brand hover:text-brand"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        {/* Notificación flotante de evento nuevo. */}
        {flash && (
          <div
            role="status"
            className="animate-rise fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-brand/40 bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            {flash}
          </div>
        )}

        {/* ---- KPIs ---- */}
        <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Visitas" value={totals.views} />
          <Kpi label="Clics" value={totals.clicks} />
          <Kpi
            label="Conversión"
            value={`${ctr.toFixed(1)}%`}
            hint="clics ÷ visitas"
          />
          <Kpi label="Últimas 24 h" value={totals.views_24h} />
        </section>

        {/* ---- Ranking de botones ---- */}
        <Card
          title="Ranking de botones"
          subtitle="Qué genera más interacción"
          className="mt-4"
        >
          {ranking.length === 0 ? (
            <Empty>Aún no hay clics registrados.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {ranking.map((row, i) => (
                <li key={row.link_id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold">
                      <span className="mr-2 text-muted">{i + 1}.</span>
                      {LINK_LABELS[row.link_id] ?? row.link_id}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {row.clicks}
                      <span className="ml-1 text-xs">
                        ({((row.clicks / Math.max(1, totals.clicks)) * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  {/* Barra proporcional al botón más pulsado, para comparar de
                      un vistazo sin leer los números. */}
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand/10">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                      style={{ width: `${(row.clicks / topClicks) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* ---- Origen del tráfico ---- */}
          <Card title="¿Por dónde te encuentran?" subtitle="Origen y campañas">
            {sources.length === 0 ? (
              <Empty>Sin datos de origen todavía.</Empty>
            ) : (
              <ul className="flex flex-col gap-2.5 text-sm">
                {sources.map((s) => (
                  <li key={s.source} className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium">{s.source}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {s.views} vis · {s.clicks} clics
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ---- Tendencia ---- */}
          <Card title="Últimos días" subtitle="Visitas por día">
            {daily.length === 0 ? (
              <Empty>Sin histórico todavía.</Empty>
            ) : (
              <Sparkline data={daily} />
            )}
          </Card>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Los datos se actualizan solos. No hace falta recargar.
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas de UI                                                        */
/* ------------------------------------------------------------------ */

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("es-PE") : value}
      </p>
      {hint && <p className="mt-0.5 text-[0.7rem] text-muted">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-5 shadow-card ${className}`}
    >
      <h2 className="text-sm font-bold">{title}</h2>
      {subtitle && <p className="mt-0.5 mb-4 text-xs text-muted">{subtitle}</p>}
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-muted">{children}</p>;
}

/**
 * Gráfica de barras mínima, hecha con divs.
 *
 * No añadimos una librería de charts (recharts, chart.js) para esto: pesan
 * entre 50 y 150 KB de JavaScript y aquí solo necesitamos barras
 * proporcionales. Cuando quieras gráficas con ejes, tooltips y zoom, ese es el
 * momento de instalar una.
 */
function Sparkline({ data }: { data: DailyStat[] }) {
  const max = Math.max(1, ...data.map((d) => d.views));

  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.day} className="group relative flex flex-1 flex-col items-center">
          <div
            className="w-full rounded-t-sm bg-brand/70 transition-all duration-500 group-hover:bg-brand"
            style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }}
          />
          {/* Tooltip nativo por CSS, sin JavaScript. */}
          <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded-md bg-brand px-2 py-1 text-[0.7rem] font-semibold text-white group-hover:block">
            {d.views} vis · {d.clicks} clics
          </span>
          <span className="mt-1.5 text-[0.6rem] text-muted">
            {new Date(`${d.day}T00:00:00`).getDate()}
          </span>
        </div>
      ))}
    </div>
  );
}
