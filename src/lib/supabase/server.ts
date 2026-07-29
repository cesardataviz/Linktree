import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * ¿Están puestas las variables de entorno de Supabase?
 *
 * Sirve para distinguir "todavía no has configurado el proyecto" de "hay un
 * error real", y mostrar el mensaje correcto en cada caso.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url?.startsWith("http") && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * ⚠️ Next.js 16: `cookies()` es asíncrono y ya no admite acceso sincrónico
 * (en Next 15 todavía funcionaba con un aviso). Por eso esta función es
 * `async` y hay que llamarla con `await createClient()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Escribir cookies desde un Server Component lanza error: las
            // cabeceras ya se enviaron. Es esperado y seguro ignorarlo — la
            // renovación del token la hace src/proxy.ts, que sí puede
            // escribir cookies en la respuesta.
          }
        },
      },
    },
  );
}
