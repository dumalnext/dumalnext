import type { NextConfig } from "next";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "https://dumalnext-admin.vercel.app";
const TEACHER_URL = process.env.NEXT_PUBLIC_TEACHER_URL || "https://dumalnext-teacher.vercel.app";
const ITSUPPORT_URL = process.env.NEXT_PUBLIC_ITSUPPORT_URL || "https://dumalnext-itsupport.vercel.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/admin",
        destination: `${ADMIN_URL}/adjudication`,
      },
      {
        source: "/admin/:path*",
        destination: `${ADMIN_URL}/:path*`,
      },
      {
        source: "/teacher",
        destination: `${TEACHER_URL}`,
      },
      {
        source: "/teacher/:path*",
        destination: `${TEACHER_URL}/:path*`,
      },
      {
        source: "/it-support",
        destination: `${ITSUPPORT_URL}`,
      },
      {
        source: "/it-support/:path*",
        destination: `${ITSUPPORT_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
