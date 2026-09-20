import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT Support Portal | Dumalneg National High School",
  description: "Official IT Systems & Infrastructure Console for Dumalneg National High School",
};

export default function ITSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
