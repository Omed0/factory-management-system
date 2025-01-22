/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: '/report',
        destination: '/report/expense',
        permanent: true,
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    loader: 'custom',
    loaderFile: './loader.js',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
  },
};



export default nextConfig;
