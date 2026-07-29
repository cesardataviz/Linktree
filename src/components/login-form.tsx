"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // A dónde vuelve el visitante tras pulsar el enlace del correo.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // false = no crear usuarios nuevos automáticamente. Aun así, la
        // autorización real la da la tabla `admins`: alguien podría crearse
        // cuenta y seguiría sin poder leer nada.
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-2xl border border-brand/30 bg-brand/10 p-4">
        <p className="text-sm font-semibold text-brand">Revisa tu correo</p>
        <p className="mt-1 text-sm text-muted">
          Enviamos un enlace de acceso a <strong>{email}</strong>. Caduca en una
          hora.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="sr-only">
        Correo electrónico
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-line bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand"
      />

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {status === "sending" ? "Enviando…" : "Enviar enlace de acceso"}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-500" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
