import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ⚠️ En Next.js 16 esto ya NO se llama `middleware.ts`.
 *
 * El archivo se renombró a `proxy.ts` y la función exportada a `proxy`.
 * Casi todos los tutoriales de Supabase + Next que encontrarás online usan
 * todavía `middleware.ts`: en Next 16 ese archivo simplemente no se ejecuta,
 * y el síntoma es que la sesión "se cae" cada pocos minutos sin explicación.
 *
 * Otra diferencia: `proxy` corre siempre en runtime Node.js y no admite `edge`.
 *
 * Su única responsabilidad aquí es REFRESCAR el token de sesión. Los tokens de
 * Supabase caducan en una hora; al llamar a `getUser()` la librería detecta que
 * está por vencer, lo renueva y escribe las cookies nuevas en la respuesta.
 * Sin esto, tendrías que volver a pedir un magic link constantemente.
 *
 * NO usamos el proxy para autorizar. La propia documentación de Next advierte
 * que no debe ser la única capa de autorización, así que el control de acceso
 * real está en src/app/dashboard/layout.tsx, que verifica contra la base de
 * datos en cada petición.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Degradación elegante si falta configuración.
  //
  // `createServerClient` lanza excepción con una URL inválida. Sin esta guarda,
  // unas variables de entorno mal puestas en Vercel tumbarían toda la web con
  // un 500 — incluida la landing, que no necesita Supabase para nada. Aquí
  // preferimos seguir adelante: como máximo, la sesión del panel no se refresca
  // y el layout del dashboard te manda al login.
  if (!url?.startsWith("http") || !anonKey) {
    console.warn(
      "[proxy] Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY: se omite el refresco de sesión.",
    );
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Las cookies se escriben en dos sitios a propósito: en `request` para
        // que el resto del renderizado de esta misma petición ya vea la sesión
        // nueva, y en `response` para que el navegador la guarde.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Esta llamada es la que dispara la renovación del token. No borres la línea
  // aunque parezca que no se usa su resultado.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  /**
   * Solo las rutas que tienen sesión.
   *
   * Es tentador poner un matcher que abarque todo el sitio (es lo que hacen los
   * tutoriales), pero sería un error aquí por dos razones:
   *
   *  1. Rendimiento y coste: la landing es una página estática que Vercel sirve
   *     desde su CDN. Si el proxy corriera en `/`, cada visita ejecutaría una
   *     función de servidor para refrescar una sesión que los visitantes
   *     anónimos no tienen.
   *  2. Aislamiento de fallos: así, cualquier problema con Supabase queda
   *     confinado al panel y nunca puede romper tu landing pública, que es lo
   *     único que ve tu audiencia.
   *
   * `/api/track` tampoco entra: usa la service role key y no lee cookies.
   */
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*"],
};
