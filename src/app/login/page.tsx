import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Acceso al panel",
  // El panel no debe aparecer en Google.
  robots: { index: false, follow: false },
};

/**
 * `/auth/callback` redirige aquí con `?error=...` cuando el canje del enlace
 * mágico falla (código caducado, ya usado, o el escáner de enlaces del correo
 * lo consumió antes de que el visitante hiciera clic). Antes esta página
 * ignoraba ese parámetro por completo: el visitante solo veía de nuevo el
 * formulario vacío, sin ninguna pista de qué había fallado.
 */
export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const rawError = params.error;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />

      <div className="absolute top-6 right-5">
        <ThemeToggle />
      </div>

      <div className="animate-rise relative w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-card">
        <h1 className="text-xl font-bold tracking-tight">Panel privado</h1>
        <p className="mt-1.5 text-sm text-muted">
          Te enviamos un enlace de acceso por correo. No hay contraseña que
          recordar.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4"
          >
            <p className="text-sm font-semibold text-red-500">
              El enlace no funcionó
            </p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <p className="mt-2 text-xs text-muted">
              Motivo frecuente: el enlace se abrió en un navegador distinto al
              que usaste para pedirlo, o algún escáner de seguridad del correo
              lo abrió primero por ti. Pide un enlace nuevo y ábrelo en el
              mismo navegador donde llenaste este formulario.
            </p>
          </div>
        )}

        <LoginForm />

        <Link
          href="/"
          className="mt-6 inline-block text-xs text-muted transition-colors hover:text-brand"
        >
          ← Volver a la landing
        </Link>
      </div>
    </main>
  );
}
