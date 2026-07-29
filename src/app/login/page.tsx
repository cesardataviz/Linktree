import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Acceso al panel",
  // El panel no debe aparecer en Google.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
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
