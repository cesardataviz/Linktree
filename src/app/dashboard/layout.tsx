import { redirect } from "next/navigation";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Panel · cesardataviz",
  robots: { index: false, follow: false },
};

/**
 * Guardián de autorización del panel.
 *
 * Aquí está el control de acceso de verdad, no en el proxy. Dos comprobaciones
 * distintas y las dos necesarias:
 *
 *  1. `getUser()` — ¿hay sesión válida? Se usa `getUser()` y NO `getSession()`
 *     porque `getSession()` solo lee la cookie sin verificar la firma: un
 *     atacante podría falsificarla. `getUser()` valida el token contra el
 *     servidor de Supabase.
 *
 *  2. `is_admin()` — ¿este correo está en la allowlist? Cualquiera puede pedir
 *     un magic link con su propio correo y quedar autenticado. Estar
 *     autenticado no es estar autorizado.
 *
 * Y aunque alguien se saltara este layout, el RLS de la tabla `events` seguiría
 * devolviendo cero filas. Defensa en profundidad: la UI y la base de datos
 * comprueban lo mismo por separado.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Antes de tocar Supabase: si no está configurado, dilo con claridad. Sin
  // esta comprobación el cliente lanzaría una excepción y verías un 500 opaco.
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="text-xl font-bold">Falta configurar Supabase</h1>
        <p className="max-w-sm text-sm text-muted">
          Rellena <code>.env.local</code> con tu <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          y tus claves, y reinicia el servidor de desarrollo.
        </p>
      </main>
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    // Sesión válida pero correo no autorizado. Cerramos sesión para no dejarlo
    // en un limbo en el que parece haber entrado pero no ve nada.
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-xl font-bold">Sin acceso</h1>
        <p className="max-w-sm text-sm text-muted">
          La cuenta <strong>{user.email}</strong> no está autorizada para ver
          este panel. Añade el correo a la tabla <code>admins</code> en Supabase.
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold transition-colors hover:border-brand hover:text-brand"
          >
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  return <>{children}</>;
}
