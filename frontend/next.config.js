/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  // 環境変数を明示的に設定
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'QuickOCR',
  },
  // ESLintの警告を無視
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScriptのエラーを無視
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig