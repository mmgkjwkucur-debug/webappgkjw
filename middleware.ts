import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "gkjw_session";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/kas" ||
    pathname.startsWith("/kas/") ||
    pathname === "/jemaat" ||
    pathname.startsWith("/jemaat/") ||
    pathname === "/jadwal/scanner" ||
    pathname.startsWith("/jadwal/scanner/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kas/:path*", "/jemaat/:path*", "/jadwal/scanner", "/jadwal/scanner/:path*"],
};
