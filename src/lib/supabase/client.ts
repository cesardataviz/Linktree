import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para el navegador (Client Components).
 *
 * Usa la clave anónima, que es pública por diseño: viaja en el bundle de
 * JavaScript. Lo que protege tus datos no es esta clave, sino las políticas
 * RLS definidas en supabase/schema.sql.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
