/**
 * Tipos que reflejan las vistas SQL de supabase/schema.sql.
 *
 * Se mantienen a mano en un solo archivo para que servidor y cliente compartan
 * la misma forma de los datos. Si más adelante quieres tipos generados
 * automáticamente desde el esquema real:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */

export type Totals = {
  views: number;
  clicks: number;
  sessions: number;
  views_24h: number;
};

export type LinkRank = {
  link_id: string;
  clicks: number;
  last_click: string | null;
};

export type TrafficSource = {
  source: string;
  views: number;
  clicks: number;
};

export type DailyStat = {
  day: string;
  views: number;
  clicks: number;
};

/** Fila cruda de `events`, tal como llega por Realtime. */
export type EventRow = {
  id: number;
  created_at: string;
  type: "view" | "click";
  link_id: string | null;
  session_id: string | null;
  referrer_host: string | null;
  utm_source: string | null;
};
