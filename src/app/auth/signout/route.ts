import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión.
 *
 * Es POST y no GET a propósito: un GET podría dispararse desde una etiqueta
 * <img> en cualquier web y cerrarte la sesión sin que lo pidas (CSRF).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), {
    // 303 fuerza al navegador a hacer GET en el destino tras el POST.
    status: 303,
  });
}
