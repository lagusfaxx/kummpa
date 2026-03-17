import type { Metadata, Viewport } from "next";
import { Inter, Lexend } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers/app-providers";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Kumpa | Plataforma pet",
  description:
    "Gestion integral para mascotas con perfiles, reservas, comunidad y alertas en una sola plataforma.",
  icons: {
    icon: "/brand/logo-sin-titulo.png",
    apple: "/brand/logo-sin-titulo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#11201d"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${lexend.variable}`}>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
