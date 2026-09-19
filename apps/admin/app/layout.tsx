import type { Metadata } from "next";
import "./globals.css";
import { AdminAuthProvider } from "@/lib/auth/authContext";

export const metadata: Metadata = {
  title: "School Administrator Portal | Dumalneg National High School",
  description: "Official School Administrator & Admissions Portal for Dumalneg National High School",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <AdminAuthProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>

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
