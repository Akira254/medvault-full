/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'bcryptjs'],
  },
};

export default nextConfig;
