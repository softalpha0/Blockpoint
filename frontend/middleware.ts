import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Demo-safe: don't block dashboard with auth redirects.
// (You can re-enable strict auth later.)
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// Keep matcher broad so it overrides any old behavior.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
