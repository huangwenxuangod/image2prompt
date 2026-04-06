import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/connect(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req) && isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
