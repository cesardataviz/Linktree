/**
 * Envío de eventos desde el navegador.
 *
 * Detalle clave: un clic en un enlace externo dispara una navegación que puede
 * cancelar un `fetch()` a medias. `navigator.sendBeacon` existe justo para
 * esto: entrega la petición en segundo plano y el navegador la garantiza
 * aunque la página se esté descargando. Solo caemos a `fetch` con `keepalive`
 * si sendBeacon no está disponible.
 */

const SESSION_KEY = "cdv.sid";
const ENDPOINT = "/api/track";

/**
 * ID de sesión anónimo, en sessionStorage (se borra al cerrar la pestaña).
 * Permite unir "1 visita + N clics" de la misma persona sin identificarla ni
 * usar cookies de seguimiento.
 */
export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Modo incógnito estricto o storage bloqueado: seguimos sin session_id.
    return null;
  }
}

type EventPayload = {
  type: "view" | "click";
  linkId?: string;
};

export function track({ type, linkId }: EventPayload): void {
  if (typeof window === "undefined") return;

  // No contaminamos las métricas con navegadores automatizados.
  if (navigator.webdriver) return;

  const body = JSON.stringify({
    type,
    linkId,
    sessionId: getSessionId(),
    path: window.location.pathname,
    search: window.location.search,
    referrer: document.referrer || null,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    // Fallback: keepalive permite que la petición sobreviva a la navegación.
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Que falle la analítica nunca debe romper la experiencia del visitante.
  }
}
