import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Destino del enlace del correo.
 *
 * Supabase manda al visitante aquí con un `code` de un solo uso.
 * `exchangeCodeForSession` lo canjea por una sesión y deja las cookies puestas.
 *
 * Tiene que ser un Route Handler y no una página: solo aquí (o en una Server
 * Action) se pueden escribir cookies, porque en un Server Component las
 * cabeceras ya se enviaron.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Supabase informa de los fallos por query string (enlace caducado, ya usado…).
  const authError = searchParams.get("error_description") ?? searchParams.get("error");
  if (authError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(authError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
