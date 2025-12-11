"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth";
import { roleUtils } from "@/lib/utils/role";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperuser?: boolean;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requireSuperuser = false,
  fallbackPath = "/auth/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, hasHydrated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for store hydration
      if (!hasHydrated) {
        return;
      }

      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      // Check superuser access if required
      if (requireSuperuser && user) {
        const hasAccess = roleUtils.isSuperuser(user.is_superuser);
        if (!hasAccess) {
          router.push("/unauthorized");
          return;
        }
      }

      setIsChecking(false);
    };

    if (!isLoading && hasHydrated) {
      checkAuth();
    }
  }, [
    isAuthenticated,
    user,
    isLoading,
    requireSuperuser,
    router,
    fallbackPath,
    hasHydrated,
  ]);

  if (isLoading || isChecking || !hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (requireSuperuser && user && !roleUtils.isSuperuser(user.is_superuser)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
