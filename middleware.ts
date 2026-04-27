import { NextResponse, type NextRequest } from "next/server";

// TODO: Réactiver l'auth Supabase une fois les clés configurées dans .env.local
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
