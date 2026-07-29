import { createClient } from "@supabase/supabase-js";

import "server-only";

/**
 * Cliente con SERVICE ROLE: se salta por completo el Row Level Security.
 *
 * Solo se usa en /api/track para insertar eventos. El navegador no tiene
 * permiso de INSERT en la tabla `events` (no existe ninguna policy de
 * inserción), así que todas las escrituras pasan obligatoriamente por nuestro
 * endpoint, que valida el payload antes de guardar.
 *
 * El import de "server-only" hace que el build FALLE si algún día alguien
 * importa este archivo desde un Client Component por error. Es una red de
 * seguridad: filtrar esta clave equivale a entregar la base de datos entera.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      // No hay usuario que persistir: es un cliente de servidor sin sesión.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
