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
  title: "Kumpa | Plataforma para mascotas",
  description:
    "Organiza el cuidado de tus mascotas: perfiles, carnet de vacunas, agenda, comunidad y alertas en un solo lugar.",
  icons: {
    icon: "/brand/logo-sin-titulo.png",
    apple: "/brand/logo-sin-titulo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#1a2f29"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${lexend.variable}`}>
      <body className="font-body antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
