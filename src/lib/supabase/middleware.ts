import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isLegalPage =
    pathname === "/mentions-legales" ||
    pathname === "/terms" ||
    pathname === "/cgv" ||
    pathname === "/privacy" ||
    pathname === "/cookies";
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/auth/callback") ||
    isLegalPage ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js";
  const isApiRoute = pathname.startsWith("/api");
  const isNextInternal = pathname.startsWith("/_next");

  if (isApiRoute || isPublicPage || isNextInternal) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
