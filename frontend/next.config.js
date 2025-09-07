/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', '100.64.1.54'],
    unoptimized: true,
  },
  // 環境変数を明示的に設定
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://100.64.1.54:3001/api',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'QuickOCR',
  },
  // ESLintの警告を無視（必要に応じて）
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScriptのエラーを無視（開発時のみ）
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig