"use client";

import type { ProfileLink } from "@/config/profile";
import { ArrowIcon, BrandIcon, brandColors } from "@/components/icons";
import { track } from "@/lib/tracking";

/**
 * Botón de enlace con registro de clic.
 *
 * Decisión importante: NO interceptamos la navegación (no hay preventDefault
 * ni redirección propia). Es un `<a>` normal y el evento se manda por
 * sendBeacon en paralelo. Ventajas:
 *   - el enlace funciona con JavaScript desactivado y es indexable
 *   - el visitante puede abrir en pestaña nueva o copiar la URL
 *   - si la analítica falla, el clic sigue llevando a su destino
 *
 * Un enfoque tipo /r/[id] que redirige daría un dato marginalmente más
 * fiable, pero añade un salto de red antes de cada destino. No vale la pena.
 */
export function LinkButton({ link, index }: { link: ProfileLink; index: number }) {
  const isPrimary = link.variant === "primary";

  return (
    <div
      className="animate-rise"
      // Escalonar la entrada crea una jerarquía de lectura descendente en vez
      // de que todo aparezca de golpe.
      style={{ animationDelay: `${180 + index * 70}ms` }}
    >
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track({ type: "click", linkId: link.id })}
        // `onAuxClick` cubre el clic con la rueda del ratón (abrir en pestaña
        // nueva), que no dispara `onClick`.
        onAuxClick={(e) => {
          if (e.button === 1) track({ type: "click", linkId: link.id });
        }}
        className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-4 font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] sm:px-5 ${
          isPrimary
            ? "border-transparent bg-brand text-white shadow-[0_6px_20px_-4px_var(--glow)] hover:shadow-[0_10px_32px_-6px_rgb(254_120_20/0.55)]"
            : "border-line bg-surface shadow-card hover:border-brand/45 hover:shadow-[0_8px_28px_-8px_var(--glow)]"
        }`}
      >
        {/* Destello que barre el botón al pasar el cursor. Puramente
            decorativo: pointer-events-none para no robar el clic. */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <span
          className={`relative grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${
            isPrimary ? "bg-white/20" : "bg-brand/10"
          }`}
          // El icono hereda este color vía `currentColor`. En el botón primario
          // el fondo ya es naranja, así que va en blanco; en el resto usamos el
          // color oficial de cada red, que se reconoce más rápido que un icono
          // monocromo.
          style={{ color: isPrimary ? "#ffffff" : brandColors[link.icon] }}
        >
          <BrandIcon name={link.icon} className="size-5" />
        </span>

        <span className="relative flex-1 text-left text-[0.975rem] leading-tight">
          {link.label}
        </span>

        <ArrowIcon
          className={`relative size-4 shrink-0 transition-all duration-300 group-hover:translate-x-1 ${
            isPrimary ? "text-white/80" : "text-muted group-hover:text-brand"
          }`}
        />
      </a>

      {link.hint && (
        <p className="mt-1.5 text-center text-xs text-muted">{link.hint}</p>
      )}
    </div>
  );
}
