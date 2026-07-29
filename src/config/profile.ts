/**
 * Única fuente de verdad del perfil.
 *
 * Todo lo editable de la landing vive aquí: si quieres cambiar un enlace, el
 * orden de los botones o tu bio, este es el único archivo que tocas.
 *
 * IMPORTANTE: el campo `id` de cada enlace es la clave con la que se guardan los
 * clics en la base de datos. Si renombras un `id`, las métricas históricas de
 * ese botón quedan huérfanas (seguirán existiendo bajo el id antiguo). Cambia
 * `label` y `href` libremente, pero trata `id` como algo permanente.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const profile = {
  name: "César Romero",
  brand: "cesardataviz",
  headline: "Data & Analytics",
  bio: "Visualización de datos, Power BI y automatización.",
  avatar: "/avatar.webp",
  quote: {
    text: "Sin datos, solo eres otra persona con una opinión.",
    author: "W. Edwards Deming",
  },
} as const;

/**
 * `variant` controla el peso visual del botón:
 *  - "primary": relleno naranja. Reservado para la acción que más te importa.
 *  - "default": contorno sutil. El resto de las redes.
 */
export type LinkVariant = "primary" | "default";

export type ProfileLink = {
  id: string;
  label: string;
  href: string;
  /** Texto pequeño bajo el botón. Opcional. */
  hint?: string;
  icon: "whatsapp" | "linkedin" | "youtube" | "tiktok" | "instagram" | "globe";
  variant?: LinkVariant;
};

export const links: ProfileLink[] = [
  {
    id: "whatsapp",
    label: "Escríbeme por WhatsApp",
    // TODO: reemplaza 51999999999 por tu número con código de país, sin "+" ni espacios.
    href: "https://wa.me/51999999999?text=Hola%20C%C3%A9sar%2C%20vengo%20de%20tu%20web",
    hint: "Consultas y proyectos →",
    icon: "whatsapp",
    variant: "primary",
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@cesardataviz",
    icon: "tiktok",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    // TODO: reemplaza por la URL real de tu perfil.
    href: "https://www.linkedin.com/in/cesardataviz",
    icon: "linkedin",
  },
  {
    id: "youtube",
    label: "YouTube",
    // TODO: reemplaza por la URL real de tu canal.
    href: "https://www.youtube.com/@cesardataviz",
    icon: "youtube",
  },
  {
    id: "instagram",
    label: "Instagram",
    // TODO: reemplaza por la URL real de tu perfil.
    href: "https://www.instagram.com/cesardataviz",
    icon: "instagram",
  },
];

/**
 * Allowlist usada por /api/track para rechazar cualquier `link_id` que no
 * corresponda a un botón real. Sin esto, cualquiera podría inflar tus métricas
 * con ids inventados haciendo POST al endpoint.
 */
export const LINK_IDS = links.map((l) => l.id);

/** Etiquetas legibles para el panel, derivadas de la misma config. */
export const LINK_LABELS: Record<string, string> = Object.fromEntries(
  links.map((l) => [l.id, l.label]),
);
