/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Report-Only: no bloquea nada. Revisar la consola del navegador unos días y, si no hay
  // violaciones legítimas, cambiar a 'Content-Security-Policy' para aplicarla.
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
      "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
      "frame-src https://hcaptcha.com https://*.hcaptcha.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
]

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // La app no usa next/image: se desactiva el optimizador (superficie de varios CVE de Next 14).
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcryptjs', 'pdfkit'],
    instrumentationHook: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  // Redirige URLs legacy /uploads/... → /api/files/...
  // Cubre evidencias y promos guardadas en DB antes de la migración al nuevo path.
  async redirects() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/files/:path*',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
