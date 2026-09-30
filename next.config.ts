import type { NextConfig } from 'next';
import { join } from 'node:path';

const CSP = [
  "default-src 'self'",
  // Next.js insere scripts inline de hydration; 'unsafe-inline' e' o unico caminho
  // sem mover tudo para hashes por-build. O resto da politica e' bem restritiva.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "connect-src 'self' https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Postgres (node-postgres) e PGlite carregam binarios nativos/WASM: precisam
  // ficar fora do bundle do server.
  serverExternalPackages: ['postgres', '@electric-sql/pglite'],

  // Ha um `package-lock.json` dois niveis acima (o monorepo do cliente). Sem
  // isto o Next adivinha a raiz do workspace pelo lockfile mais alto e monta a
  // arvore de arquivos do rastreio com a pasta errada.
  outputFileTracingRoot: join(import.meta.dirname),

  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.tile.openstreetmap.org' }],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
