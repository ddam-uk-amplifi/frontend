import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected route patterns
const protectedRoutes = [
  "/dashboard",
  "/admin",
  "/profile",
  "/report-automation",
  "/report-validation",
];

// Define public routes that should always be accessible
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/unauthorized",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is a public route
  const isPublicRoute = publicRoutes.some((route) => pathname === route);

  // Check if the path starts with a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Allow public routes without authentication
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (isProtectedRoute) {
    const isAuthenticated =
      request.cookies.get("auth_is_authenticated")?.value === "true";
    const hasAccessToken = request.cookies.get("auth_access_token");

    if (!isAuthenticated || !hasAccessToken) {
      // Redirect to login with the original URL as a callback
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("reason", "authentication_required");
      loginUrl.searchParams.set("redirect", pathname);

      return NextResponse.redirect(loginUrl);
    }

    // Additional check for admin routes
    if (pathname.startsWith("/admin")) {
      // Note: We can't decode JWT in middleware without a library,
      // so superuser check will still happen client-side
      // This just ensures basic authentication is present
    }
  }

  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};
