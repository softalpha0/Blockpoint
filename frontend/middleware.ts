import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};