import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the hostname from the request
  const hostname = request.headers.get("host");

  // Check if the hostname is deconstructor.vercel.app
  if (hostname === "deconstructor.vercel.app" || hostname === "deconstructor.ayush.digital") {
    // Create the URL for the new domain, preserving the path and query parameters
    const url = new URL(request.url);
    const newUrl = `https://deconstructor.app${url.pathname}${url.search}`;

    // Return a redirect response
    return NextResponse.redirect(newUrl, {
      status: 301, // Permanent redirect
    });
  }

  // For all other hostnames, continue with the request
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
