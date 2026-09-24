/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcryptjs', 'pdfkit'],
    instrumentationHook: true,
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
