import { Analytics } from "@/components/dashboard/analytics";
import { createClient } from "@/lib/supabase/server";
import type { DailyStat, LinkRank, Totals, TrafficSource } from "@/lib/analytics-types";

/**
 * Panel de analítica.
 *
 * Los datos iniciales se cargan aquí, en el servidor: el panel aparece con las
 * cifras ya puestas en el primer render, sin spinners. A partir de ese momento
 * el componente cliente `Analytics` mantiene todo vivo por WebSocket.
 *
 * Las agregaciones vienen de vistas SQL (definidas en supabase/schema.sql), no
 * de traerse todas las filas y contarlas en JavaScript. Con 50.000 eventos, lo
 * primero sigue siendo instantáneo; lo segundo tumbaría el navegador.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Las cuatro consultas son independientes, así que van en paralelo.
  const [totalsRes, rankingRes, sourcesRes, dailyRes] = await Promise.all([
    supabase.from("totals").select("*").single(),
    supabase.from("link_ranking").select("*"),
    supabase.from("traffic_sources").select("*").limit(8),
    supabase.from("daily_stats").select("*").limit(14),
  ]);

  // Si algo falla (por ejemplo, aún no ejecutaste schema.sql), lo decimos con
  // claridad en vez de mostrar un panel vacío que parece un bug de datos.
  const error =
    totalsRes.error ?? rankingRes.error ?? sourcesRes.error ?? dailyRes.error;

  if (error) {
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-xl font-bold">No se pudieron cargar las métricas</h1>
        <p className="mt-3 text-sm text-muted">
          ¿Ejecutaste <code>supabase/schema.sql</code> en el SQL Editor de
          Supabase? Falta alguna tabla o vista.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface p-3 text-left text-xs text-muted">
          {error.message}
        </pre>
      </main>
    );
  }

  const totals: Totals = totalsRes.data ?? {
    views: 0,
    clicks: 0,
    sessions: 0,
    views_24h: 0,
  };

  return (
    <Analytics
      initialTotals={totals}
      initialRanking={(rankingRes.data ?? []) as LinkRank[]}
      initialSources={(sourcesRes.data ?? []) as TrafficSource[]}
      // Las vistas devuelven el día más reciente primero; la gráfica lo quiere
      // en orden cronológico.
      initialDaily={((dailyRes.data ?? []) as DailyStat[]).slice().reverse()}
    />
  );
}
