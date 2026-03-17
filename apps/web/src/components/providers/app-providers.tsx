"use client";

import type { PropsWithChildren } from "react";
import { AuthProvider } from "@/features/auth/auth-context";
import { ToastProvider } from "@/features/ui/toast-context";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
