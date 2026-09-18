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
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {/* DepEd & DNHS Institutional Banner (Navy Blue & Pure White, Zero Emojis/Icons) */}
        <header className="deped-header px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                Republic of the Philippines | Department of Education | Region I
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white mt-1">
                DUMALNEG NATIONAL HIGH SCHOOL
              </h1>
              <p className="text-xs text-slate-300 font-medium">
                Dumal-NEXT: Web-Based Enrollment & Schedule Deconfliction System
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="bg-blue-900 border border-blue-400/40 text-white px-3 py-1 font-mono">
                Official Institutional Portal | Trimester System
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* DepEd Institutional Footer (Zero Emojis/Icons) */}
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
