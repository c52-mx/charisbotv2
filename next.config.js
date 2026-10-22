/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
