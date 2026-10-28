import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Portal | Dumalneg National High School",
  description: "Official Student Online Enrollment and Academic Workstation for Dumalneg National High School",
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
    title: "DNHS Portal",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#002060",
};

import StudentProviders from "@/components/providers/StudentProviders";
import StudentHeaderNav from "@/components/layout/StudentHeaderNav";
import Link from "next/link";

export default function StudentLayout({
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
                window.__dnhsDeferredPrompt = null;
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.__dnhsDeferredPrompt = e;
                  try {
                    window.dispatchEvent(new CustomEvent('dnhs-prompt-ready'));
                  } catch(err) {}
                });
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  });
                }
              })();
            `,
          }}
        />
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
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden antialiased">
        <StudentProviders>
          {/* DepEd & DNHS Student Portal Header (Zero Emojis/Icons) */}
          <header className="deped-header px-3 sm:px-6 py-2 sm:py-3 shadow-md relative z-40">
            <StudentHeaderNav>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <Link
                  href="/"
                  className="shrink-0 flex items-center justify-center group transition-transform active:scale-95"
                  title="Dumalneg National High School Portal Home"
                >
                  <img
                    src="/dumalneg-logo.png"
                    alt="Dumalneg National High School Official Seal"
                    className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                  />
                </Link>
                <div className="min-w-0">
                  <p className="hidden sm:block text-[10px] font-semibold tracking-wider text-slate-200 uppercase truncate">
                    Republic of the Philippines &bull; Department of Education
                  </p>
                  <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold tracking-tight text-white truncate">
                    DUMALNEG NATIONAL HIGH SCHOOL
                  </h1>
                  <p className="text-[10px] text-slate-300 font-medium truncate">
                    Official Student Online Portal
                  </p>
                </div>
              </div>
            </StudentHeaderNav>
          </header>

          {/* Main Content Area with Adaptive Mobile & Tablet Padding */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </StudentProviders>

        {/* DepEd Institutional Footer */}
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 px-6 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="font-semibold text-slate-200">
                Dumalneg National High School - Student Online Portal
              </p>
              <p className="mt-1">
                Municipality of Dumalneg, Province of Ilocos Norte, Philippines
              </p>
            </div>
            <div className="text-right">
              <p>DepEd Basic Education Enrollment System</p>
              <p className="text-slate-500 mt-0.5">Lozano, Digap, Julian, Magdaong, Tumpap</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
