import type { PropsWithChildren } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

interface AuthCardProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <div className="text-center">
        <BrandLogo variant="icon" className="mx-auto h-12 w-12" priority />
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
