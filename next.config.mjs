/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.API_URL ?? "https://www.aioj.net/"}:path*`,
        },
        {
          source: "/file/:path*",
          destination: `${process.env.API_URL ?? "https://www.aioj.net/file/"}:path*`,
        },
      ];
    }
    return [];
  },
  images: {
    dangerouslyAllowSVG: true, // 允许Image提供SVG而非img
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    typedRoutes: true, // 为<Link />添加基于Routes的强类型
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.ya?ml$/,
      use: "yaml-loader",
    });
    return config;
  },
};

export default nextConfig;
