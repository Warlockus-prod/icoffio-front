import { NextRequest, NextResponse } from 'next/server'

const locales = ['en', 'pl']  
const defaultLocale = 'en'

function getLocale(request: NextRequest): string {
  // 1. Проверяем URL на наличие локали
  const pathname = request.nextUrl.pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    return pathname.split('/')[1]
  }

  // 2. Проверяем заголовок Accept-Language
  const acceptLanguage = request.headers.get('accept-language') || ''
  const preferredLocale = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].split('-')[0])
    .find(lang => locales.includes(lang))

  return preferredLocale || defaultLocale
}

export function middleware(request: NextRequest) {
  // Проверяем, не является ли путь API или статическим файлом
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    const newUrl = new URL(`/${locale}${pathname}`, request.url)
    return NextResponse.redirect(newUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|logo.svg|og.png).*)',
  ],
}
