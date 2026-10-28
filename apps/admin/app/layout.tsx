import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AdminAuthProvider } from "@/lib/auth/authContext";
import SessionTimeoutModal from "@/components/SessionTimeoutModal";

export const metadata: Metadata = {
  title: "School Administrator Portal | Dumalneg National High School",
  description: "Official School Administrator & Admissions Portal for Dumalneg National High School",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/dumalneg-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DNHS Admin",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#002060",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#002060" />
              <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('dnhs-theme');
                  if (t === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.removeAttribute('data-theme');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans antialiased overflow-x-hidden">
        <AdminAuthProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <SessionTimeoutModal />

          {/* Institutional DepEd Footer */}
          <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 px-6 mt-12">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="font-semibold text-slate-200 uppercase">
                  Dumalneg National High School &bull; Office of the Principal &amp; Registrar
                </p>
                <p className="mt-1 text-slate-400">
                  Municipality of Dumalneg, Province of Ilocos Norte, Philippines &bull; DepEd School ID: 300017
                </p>
              </div>
              <div className="text-right font-mono text-[11px]">
                <p className="text-slate-300">Dumal-NEXT Management Console</p>
                <p className="text-slate-500 mt-0.5">MMSU CCIS Capstone Project</p>
              </div>
            </div>
          </footer>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
