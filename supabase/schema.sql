-- =====================================================================
--  cesardataviz-links · esquema de analítica
--  Ejecuta este archivo completo en: Supabase → SQL Editor → New query
--  Es idempotente: puedes volver a ejecutarlo sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLA DE EVENTOS
--    Un solo registro por cada cosa que pasa: una visita o un clic.
--    Guardar ambos en la misma tabla (en vez de dos tablas) simplifica el
--    ranking y permite calcular la tasa de conversión visita → clic con
--    una sola consulta.
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),

  -- 'view'  = alguien abrió la landing
  -- 'click' = alguien pulsó uno de tus botones
  type          text not null check (type in ('view', 'click')),

  -- Qué botón se pulsó. Null en las visitas.
  -- Coincide con el campo `id` de src/config/profile.ts
  link_id       text check (link_id is null or char_length(link_id) <= 40),

  -- Identificador de sesión generado en el navegador. Sirve para saber que
  -- "esta visita y estos 2 clics son de la misma persona" sin identificarla.
  -- Vive en sessionStorage: se borra al cerrar la pestaña. No es una cookie
  -- de seguimiento, por eso no requiere banner de consentimiento.
  session_id    uuid,

  path          text,

  -- De dónde vino: dominio de origen y URL completa.
  referrer_host text,
  referrer_url  text,

  -- Campañas. Si compartes el enlace como ?utm_source=tiktok, aquí queda.
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,

  -- Un 'click' sin link_id no tiene sentido; la base de datos lo impide.
  constraint events_click_requires_link
    check (type <> 'click' or link_id is not null)
);

-- Índices pensados para las consultas concretas del panel:
--  - listar/contar por fecha descendente
--  - agrupar clics por botón
create index if not exists events_created_at_idx
  on public.events (created_at desc);
create index if not exists events_type_link_idx
  on public.events (type, link_id);


-- ---------------------------------------------------------------------
-- 2. QUIÉN PUEDE VER EL PANEL
--    Cualquiera puede pedir un magic link con su correo, así que "estar
--    autenticado" NO basta para ser administrador. Esta tabla es la
--    allowlist real.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- ⚠️  CAMBIA ESTE CORREO POR EL TUYO antes de ejecutar.
--     Debe ser idéntico (en minúsculas) al que usarás para entrar.
insert into public.admins (email)
values ('cesar.romero24@icloud.com')
on conflict (email) do nothing;


-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    Regla de oro: la clave anónima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) viaja
--    al navegador, así que hay que asumir que es pública. RLS es lo único
--    que impide que un desconocido lea tus métricas con esa clave.
-- ---------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.admins enable row level security;

-- `admins` queda sin ninguna policy: nadie la lee ni la escribe desde el
-- navegador. Solo la gestionas tú desde el panel de Supabase.

-- Comprobar si el usuario actual es admin requiere leer `admins`, pero las
-- policies se ejecutan con los permisos de quien consulta — y `admins` tiene
-- RLS sin policies, así que la subconsulta devolvería 0 filas y bloquearía
-- todo. `security definer` hace que esta función se ejecute con los permisos
-- de su creador, saltándose ese bloqueo de forma controlada.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Lectura de eventos: solo administradores autenticados.
drop policy if exists "admins can read events" on public.events;
create policy "admins can read events"
  on public.events
  for select
  to authenticated
  using (public.is_admin());

-- OJO: no hay ninguna policy de INSERT. Es intencional.
-- Las escrituras entran por /api/track usando la SERVICE ROLE KEY, que vive
-- solo en el servidor y se salta RLS. Así el navegador nunca puede escribir
-- directo en la tabla, y validamos cada evento antes de guardarlo.


-- ---------------------------------------------------------------------
-- 4. VISTAS DE AGREGACIÓN
--    Contar en Postgres es mucho más barato que traerse 50.000 filas al
--    navegador para contarlas en JavaScript.
--
--    `security_invoker = on` es CRÍTICO: sin él, las vistas se ejecutan con
--    los permisos de su creador e ignoran el RLS de `events`, filtrando tus
--    métricas a cualquiera con la clave anónima.
-- ---------------------------------------------------------------------

-- Ranking de botones: ¿qué genera más interacción?
create or replace view public.link_ranking
with (security_invoker = on) as
  select
    link_id,
    count(*)::bigint       as clicks,
    max(created_at)        as last_click
  from public.events
  where type = 'click' and link_id is not null
  group by link_id
  order by clicks desc;

-- ¿Por dónde te encuentra la gente? Prioriza el UTM; si no hay, usa el
-- dominio de origen; si tampoco, es tráfico directo.
create or replace view public.traffic_sources
with (security_invoker = on) as
  select
    coalesce(
      nullif(lower(utm_source), ''),
      nullif(referrer_host, ''),
      'directo'
    ) as source,
    count(*) filter (where type = 'view')::bigint  as views,
    count(*) filter (where type = 'click')::bigint as clicks
  from public.events
  group by 1
  order by views desc, clicks desc;

-- Serie diaria para la gráfica de tendencia.
create or replace view public.daily_stats
with (security_invoker = on) as
  select
    (created_at at time zone 'America/Lima')::date  as day,
    count(*) filter (where type = 'view')::bigint   as views,
    count(*) filter (where type = 'click')::bigint  as clicks
  from public.events
  group by 1
  order by 1 desc;

-- Resumen de cabecera del panel.
create or replace view public.totals
with (security_invoker = on) as
  select
    count(*) filter (where type = 'view')::bigint                  as views,
    count(*) filter (where type = 'click')::bigint                 as clicks,
    count(distinct session_id)::bigint                             as sessions,
    count(*) filter (
      where type = 'view'
        and created_at >= now() - interval '24 hours'
    )::bigint                                                      as views_24h
  from public.events;


-- ---------------------------------------------------------------------
-- 5. REALTIME
--    Añade `events` a la publicación que Supabase usa para enviar cambios
--    por WebSocket. Realtime respeta RLS, así que solo tú recibirás los
--    eventos en vivo.
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;  -- ya estaba añadida
end $$;
