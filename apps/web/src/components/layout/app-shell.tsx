"use client";

import type { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { isMinimalShellRoute } from "@/features/navigation/site-map";
import { BottomNav } from "./bottom-nav";
import { TopNav } from "./top-nav";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isMinimalShell = isMinimalShellRoute(pathname);

  return (
    <div
      className={`relative min-h-screen overflow-x-clip ${
        isMinimalShell
          ? "pb-8"
          : "pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-10"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_54%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-20 z-0 h-[34rem] bg-[radial-gradient(circle_at_top_right,rgba(255,159,28,0.16),transparent_46%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[22rem] bg-[radial-gradient(circle_at_bottom,rgba(255,77,109,0.08),transparent_50%)]" />
      <TopNav />
      <main
        className={`relative z-10 mx-auto w-full px-4 sm:px-6 ${
          isMinimalShell
            ? "max-w-5xl pb-8 pt-6"
            : "max-w-7xl pb-8 pt-5 sm:pb-10 sm:pt-8 lg:px-8"
        }`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
