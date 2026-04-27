import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DASHBOARD_PATHS = [
  "/dashboard", "/vault", "/feedback", "/chat",
  "/timeline", "/royalties", "/gallery", "/stage",
  "/settings", "/sessions",
];

function isDashboardPath(pathname: string) {
  return DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isLogin = pathname === "/login";
  const isPending = pathname === "/pending";
  const isDashboard = isDashboardPath(pathname);

  if (!user) {
    if (isDashboard || isPending) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_approved")
    .eq("id", user.id)
    .single();

  const approved = profile?.is_approved ?? false;

  if (isLogin) {
    return NextResponse.redirect(new URL(approved ? "/dashboard" : "/pending", request.url));
  }

  if (isDashboard && !approved) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  if (isPending && approved) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
