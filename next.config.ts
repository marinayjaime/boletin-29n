import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 genera un sitio estático en out/ (GitHub Pages).
 * NEXT_PUBLIC_BASE_PATH fija la subruta, p. ej. "/boletin-29n" en usuario.github.io/boletin-29n/.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT ? { output: "export" as const, trailingSlash: true } : {}),
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
