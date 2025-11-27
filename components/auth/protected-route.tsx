"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth";
import type { UserRole } from "@/lib/types/auth";
import { roleUtils } from "@/lib/utils/role";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
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

      // Check role-based access if required
      if (requiredRole && user) {
        const hasAccess = roleUtils.hasRoleAccess(user.role, requiredRole);
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
    requiredRole,
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

  if (
    requiredRole &&
    user &&
    !roleUtils.hasRoleAccess(user.role, requiredRole)
  ) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
