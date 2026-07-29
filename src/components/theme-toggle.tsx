"use client";

/**
 * Botón día/noche.
 *
 * No guarda el tema en estado de React, y es deliberado. La fuente de verdad es
 * la clase `.dark` en <html>, que ya pone ThemeScript antes del primer pintado.
 * Los dos iconos se renderizan siempre y CSS decide cuál se ve mediante la
 * variante `dark:`.
 *
 * Eso nos ahorra tres problemas de golpe:
 *  - ningún desajuste de hidratación (el HTML del servidor y del cliente son
 *    idénticos: el tema lo aplica CSS, no React)
 *  - ningún `useEffect` que lea el DOM para sincronizar estado
 *  - ningún parpadeo del icono al cargar
 */
export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("cdv.theme", isDark ? "dark" : "light");
    } catch {
      // Sin persistencia si el storage está bloqueado; el tema igual cambia.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre modo día y modo noche"
      className="group grid size-11 place-items-center rounded-full border border-line bg-surface shadow-card transition-all duration-300 hover:border-brand/50 hover:shadow-[0_0_0_4px_var(--glow)] active:scale-95"
    >
      <span className="relative size-5">
        {/* Sol: visible en claro, se esconde girando en oscuro. */}
        <SunIcon className="absolute inset-0 size-5 rotate-0 scale-100 text-brand opacity-100 transition-all duration-500 dark:rotate-90 dark:scale-0 dark:opacity-0" />
        {/* Luna: al contrario. */}
        <MoonIcon className="absolute inset-0 size-5 -rotate-90 scale-0 text-brand opacity-0 transition-all duration-500 dark:rotate-0 dark:scale-100 dark:opacity-100" />
      </span>
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
