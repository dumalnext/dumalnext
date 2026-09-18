import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Portal | Dumalneg National High School",
  description: "Official Student Online Enrollment and Academic Workstation for Dumalneg National High School",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#002060",
};

import StudentProviders from "@/components/providers/StudentProviders";
import StudentHeaderNav from "@/components/layout/StudentHeaderNav";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden antialiased">
        <StudentProviders>
          {/* DepEd & DNHS Student Portal Header (Zero Emojis/Icons) */}
          <header className="deped-header px-3 sm:px-6 py-3 sm:py-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold tracking-wider text-slate-200 uppercase">
                  Republic of the Philippines | Department of Education | Region I
                </p>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5 sm:mt-1">
                  DUMALNEG NATIONAL HIGH SCHOOL
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
                  Student Online Portal &amp; Basic Education Enrollment System
                </p>
              </div>
              <StudentHeaderNav />
            </div>
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
