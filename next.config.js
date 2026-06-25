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
}

module.exports = nextConfig
