"use client";

import type { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { isMapRoute, isMinimalShellRoute } from "@/features/navigation/site-map";
import { BottomNav } from "./bottom-nav";
import { TopNav } from "./top-nav";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isMinimalShell = isMinimalShellRoute(pathname);
  const isMap = isMapRoute(pathname);

  if (isMap) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNav />
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
        {/* In-flow spacer so main shrinks by the fixed BottomNav height on mobile */}
        <div
          className="shrink-0 md:hidden"
          style={{ height: "calc(3.5rem + env(safe-area-inset-bottom))" }}
        />
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen ${
        isMinimalShell
          ? "pb-8"
          : "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8"
      }`}
    >
      <TopNav />
      <main
        className={`safe-area-x mx-auto w-full px-4 sm:px-6 lg:px-8 ${
          isMinimalShell
            ? "max-w-4xl py-6"
            : "max-w-7xl py-5 sm:py-7"
        }`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
