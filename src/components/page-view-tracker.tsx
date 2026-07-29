"use client";

import { useEffect, useRef } from "react";

import { track } from "@/lib/tracking";

/**
 * Registra una visita, exactamente una vez por sesión de pestaña.
 *
 * Dos protecciones contra el doble conteo:
 *  - `useRef` evita el doble disparo del Strict Mode en desarrollo.
 *  - la marca en sessionStorage evita contar de nuevo si el visitante navega
 *    al panel y vuelve, o si React remonta el componente.
 */
export function PageViewTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const FLAG = "cdv.viewed";
    try {
      if (window.sessionStorage.getItem(FLAG)) return;
      window.sessionStorage.setItem(FLAG, "1");
    } catch {
      // Si no hay storage, preferimos contar la visita a perderla.
    }

    track({ type: "view" });
  }, []);

  return null;
}
