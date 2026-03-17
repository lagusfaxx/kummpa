"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SurfaceSkeleton } from "@/components/feedback/skeleton";
import { useAuth } from "@/features/auth/auth-context";

interface AuthGateProps extends PropsWithChildren {
  redirectTo?: string;
}

export function AuthGate({ children, redirectTo = "/login" }: AuthGateProps) {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isReady, redirectTo, router]);

  if (!isReady || !isAuthenticated) {
    return <SurfaceSkeleton blocks={3} compact className="max-w-2xl" />;
  }

  return <>{children}</>;
}
