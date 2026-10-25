import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dumal-NEXT | Dumalneg National High School",
  description: "Official Web-Based Enrollment and Schedule Deconfliction System for Dumalneg National High School",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
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
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {/* DepEd & DNHS Institutional Banner */}
        <header className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] border-t-4 border-t-amber-400 border-b border-[#001744] px-6 py-4 shadow-md text-white">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/dumalneg-logo.png"
                alt="Dumalneg National High School Seal"
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md bg-white shrink-0"
              />
              <div>
                <p className="text-[11px] font-bold tracking-widest text-amber-300 uppercase">
                  Republic of the Philippines &bull; Department of Education &bull; Region I
                </p>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-0.5">
                  DUMALNEG NATIONAL HIGH SCHOOL
                </h1>
                <p className="text-xs text-blue-100 font-medium">
                  Dumal-NEXT: Web-Based Enrollment &amp; Schedule Deconfliction System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="bg-white/10 border border-white/20 text-white px-3.5 py-1.5 rounded-full font-semibold tracking-wide">
                Official Institutional Portal &bull; Trimester System
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* DepEd Institutional Footer */}
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 px-6 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="font-semibold text-slate-200">
                Dumalneg National High School - Dumal-NEXT System
              </p>
              <p className="mt-1">
                Municipality of Dumalneg, Province of Ilocos Norte, Philippines
              </p>
            </div>
            <div className="text-right">
              <p>MMSU CCIS Department of Information Technology Capstone Project</p>
              <p className="text-slate-500 mt-0.5">Lozano, Digap, Julian, Magdaong, Tumpap</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
