import { NextResponse } from "next/server";

import { LINK_IDS } from "@/config/profile";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/track — registra una visita o un clic.
 *
 * ¿Por qué pasar por nuestro servidor en vez de escribir en Supabase desde el
 * navegador? Tres razones:
 *   1. La tabla `events` no tiene policy de INSERT, así que el navegador no
 *      puede escribir. Solo este endpoint (service role) puede.
 *   2. Podemos validar y normalizar cada campo antes de guardarlo, evitando
 *      basura en la base de datos.
 *   3. El referrer y la URL los deriva el servidor, no confiamos en que el
 *      cliente los mande bien formados.
 *
 * Este endpoint es público por necesidad (lo llaman visitantes anónimos), así
 * que asume payloads hostiles: valida el tipo, comprueba el link_id contra la
 * allowlist y recorta toda cadena de texto.
 */

// Nunca cachear: cada llamada es un evento distinto.
export const dynamic = "force-dynamic";

/** Recorta y limpia un valor que viene del cliente. */
function clean(value: unknown, maxLength = 255): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/** Valida que sea un UUID v4 real y no una cadena arbitraria. */
function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid.test(value) ? value.toLowerCase() : null;
}

/**
 * Extrae solo el host del referrer. Guardamos el host aparte porque agrupar
 * por "tiktok.com" es útil, y agrupar por la URL completa (con sus parámetros
 * únicos) no lo es.
 */
function referrerParts(raw: unknown) {
  const url = clean(raw, 1000);
  if (!url) return { host: null, full: null };
  try {
    return { host: new URL(url).hostname.replace(/^www\./, ""), full: url };
  } catch {
    return { host: null, full: url };
  }
}

/** Lee los utm_* de la query string que el cliente reporta. */
function utmParams(search: unknown) {
  const raw = clean(search, 1000);
  const empty = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };
  if (!raw) return empty;

  try {
    const params = new URLSearchParams(
      raw.startsWith("?") ? raw.slice(1) : raw,
    );
    return {
      utm_source: clean(params.get("utm_source"), 120),
      utm_medium: clean(params.get("utm_medium"), 120),
      utm_campaign: clean(params.get("utm_campaign"), 120),
      utm_content: clean(params.get("utm_content"), 120),
      utm_term: clean(params.get("utm_term"), 120),
    };
  } catch {
    return empty;
  }
}

export async function POST(request: Request) {
  // sendBeacon manda el cuerpo como Blob; si el JSON viene corrupto, cortamos.
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;

  // --- Validación del tipo de evento ---
  const type = body.type;
  if (type !== "view" && type !== "click") {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }

  // --- Validación del botón ---
  // Un clic debe apuntar a un botón que exista de verdad en profile.ts.
  // Sin esta comprobación, cualquiera podría inflar el ranking con ids falsos.
  let linkId: string | null = null;
  if (type === "click") {
    const candidate = clean(body.linkId, 40);
    if (!candidate || !LINK_IDS.includes(candidate)) {
      return NextResponse.json({ error: "linkId inválido" }, { status: 400 });
    }
    linkId = candidate;
  }

  const { host, full } = referrerParts(body.referrer);

  const event = {
    type,
    link_id: linkId,
    session_id: cleanUuid(body.sessionId),
    path: clean(body.path, 255),
    referrer_host: host,
    referrer_url: full,
    ...utmParams(body.search),
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from("events").insert(event);

  if (error) {
    // El error se registra en los logs de Vercel para que puedas depurarlo,
    // pero no se devuelve al cliente: expondría detalles del esquema.
    console.error("[track] fallo al insertar evento:", error.message);
    return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
  }

  // 204: éxito sin cuerpo. sendBeacon ignora la respuesta de todos modos.
  return new NextResponse(null, { status: 204 });
}
