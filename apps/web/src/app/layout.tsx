import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers/app-providers";
import type { ReactNode } from "react";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Kummpa | Plataforma para mascotas",
  description:
    "Cuida, reserva, explora, compra y actua rapido por tus mascotas desde una sola app.",
  icons: {
    icon: "/brand/logo-sin-titulo.png",
    apple: "/brand/logo-sin-titulo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#1f463c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${sora.variable}`}>
      <body className="font-body antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
