/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: '.next', // Ensure this is set correctly
  async redirects() {
    return [
      {
        source: '/report',
        destination: '/report/expense',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/customer/[id]',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
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
