import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_KEY = "dieta_session_v1";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== "/") return NextResponse.next();

  const session = request.cookies.get(SESSION_KEY)?.value;
  const url = request.nextUrl.clone();
  url.pathname = session ? "/dashboard" : "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"],
};
