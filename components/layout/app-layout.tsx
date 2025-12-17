"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useTokenRefresh } from "@/hooks/use-token-refresh";
import { useAuthStore } from "@/lib/stores/auth";
import { AppSidebar } from "./app-sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Routes that should not show the sidebar
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/unauthorized",
];

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated, initialize, hasHydrated } = useAuthStore();

  // Enable automatic token refresh to keep users logged in
  useTokenRefresh();

  // Initialize auth state on app load
  useEffect(() => {
    if (!hasHydrated) {
      initialize();
    }
  }, [initialize, hasHydrated]);

  const showSidebar = isAuthenticated && !publicRoutes.includes(pathname);

  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-background">
        <main>{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
