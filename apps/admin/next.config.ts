import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/1",
        destination: "/adjudication",
        permanent: false,
      },
      {
        source: "/2",
        destination: "/sections",
        permanent: false,
      },
      {
        source: "/3",
        destination: "/scheduling",
        permanent: false,
      },
      {
        source: "/4",
        destination: "/control-room",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
