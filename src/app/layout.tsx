import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { ThemeScript } from "@/components/theme-script";
import { SITE_URL, profile } from "@/config/profile";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // `metadataBase` hace que las rutas relativas de OG/Twitter se conviertan en
  // URLs absolutas. Sin esto, las previsualizaciones al compartir salen rotas.
  metadataBase: new URL(SITE_URL),
  title: `${profile.name} · ${profile.headline}`,
  description: profile.bio,
  applicationName: profile.brand,
  openGraph: {
    title: `${profile.name} · ${profile.headline}`,
    description: profile.bio,
    url: SITE_URL,
    siteName: profile.brand,
    locale: "es_PE",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} · ${profile.headline}`,
    description: profile.bio,
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  // La barra del navegador móvil se tiñe según el tema activo. Detalle pequeño
  // que hace que la página se sienta como una app y no como una web.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFEFA" },
    { media: "(prefers-color-scheme: dark)", color: "#11141B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning` es necesario porque ThemeScript añade la clase
    // .dark antes de que React hidrate: el HTML del servidor y el del cliente
    // difieren a propósito en ese atributo.
    <html lang="es" suppressHydrationWarning className={`${geistSans.variable} h-full`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
