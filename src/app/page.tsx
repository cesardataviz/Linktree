import Image from "next/image";

import { LinkButton } from "@/components/link-button";
import { PageViewTracker } from "@/components/page-view-tracker";
import { ThemeToggle } from "@/components/theme-toggle";
import { links, profile } from "@/config/profile";

/**
 * Landing pública.
 *
 * Es un Server Component: el HTML llega ya renderizado y la página es
 * estática, así que Vercel la sirve desde su CDN. Solo tres piezas pequeñas
 * son interactivas (`"use client"`): el toggle de tema, los botones y el
 * contador de visitas. Ese es el patrón que hace que cargue rápido en móvil.
 */
export default function Home() {
  return (
    <>
      <PageViewTracker />

      <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pt-8 pb-10">
        {/* ---- Capas decorativas de fondo ---- */}
        {/* Retícula técnica, desvanecida hacia los bordes por una máscara. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />
        {/* Halo naranja detrás del avatar: da profundidad y ancla la marca. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 size-[34rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{
            background: "radial-gradient(circle, var(--glow) 0%, transparent 68%)",
          }}
        />

        {/* ---- Contenido ---- */}
        {/* max-w-md: la landing se diseña para el móvil y en escritorio se
            queda centrada como una tarjeta, en vez de estirarse. */}
        <div className="relative flex w-full max-w-md flex-1 flex-col">
          <header className="flex justify-end">
            <div className="animate-rise" style={{ animationDelay: "60ms" }}>
              <ThemeToggle />
            </div>
          </header>

          {/* ---- Identidad ---- */}
          <section className="mt-2 flex flex-col items-center text-center">
            <div className="animate-rise relative" style={{ animationDelay: "100ms" }}>
              {/* Anillo que late suavemente: señal de "perfil activo". */}
              <span
                aria-hidden
                className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-brand"
              />
              <Image
                src={profile.avatar}
                alt={`Foto de ${profile.name}`}
                width={128}
                height={128}
                // `priority` porque es el elemento visual principal: sin esto
                // Next la carga en diferido y el visitante ve un hueco.
                priority
                className="relative size-28 rounded-full border-2 border-brand object-cover shadow-card sm:size-32"
              />
            </div>

            <h1
              className="animate-rise mt-5 text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ animationDelay: "140ms" }}
            >
              {profile.name}
            </h1>

            <div className="animate-rise" style={{ animationDelay: "160ms" }}>
              <p className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                <span className="size-1.5 rounded-full bg-brand" />
                {profile.headline}
              </p>
              <p className="mt-2.5 text-sm text-muted">{profile.bio}</p>
            </div>
          </section>

          {/* ---- Enlaces ---- */}
          <nav aria-label="Mis enlaces" className="mt-8 flex flex-col gap-3">
            {links.map((link, i) => (
              <LinkButton key={link.id} link={link} index={i} />
            ))}
          </nav>

          {/* ---- Cita y pie ---- */}
          <footer
            className="animate-rise mt-auto pt-10 text-center"
            style={{ animationDelay: `${180 + links.length * 70 + 100}ms` }}
          >
            <blockquote className="text-sm text-muted italic">
              “{profile.quote.text}”
              <footer className="mt-1 text-xs not-italic">
                — {profile.quote.author}
              </footer>
            </blockquote>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              {/* Dos archivos y no uno: el logo tiene fondo propio, así que se
                  intercambia según el tema en vez de forzar un filtro CSS. */}
              <Image
                src="/logo-light.webp"
                alt=""
                width={18}
                height={18}
                className="dark:hidden"
              />
              <Image
                src="/logo-dark.webp"
                alt=""
                width={18}
                height={18}
                className="hidden dark:block"
              />
              <span>
                © {new Date().getFullYear()} {profile.brand}
              </span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
