import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - auth/callback
     * - auth/confirm
     * - static image extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|auth/callback|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).+)',
  ],
}
