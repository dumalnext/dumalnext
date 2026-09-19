import type { Metadata } from "next";
import "./globals.css";
import { TeacherAuthProvider } from "@/lib/auth/authContext";
import TeacherHeaderNav from "@/components/TeacherHeaderNav";

export const metadata: Metadata = {
  title: "Faculty Portal | Dumalneg National High School",
  description: "Official Faculty & Teacher Workstation for Dumalneg National High School",
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <TeacherAuthProvider>
          <TeacherHeaderNav />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </TeacherAuthProvider>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 px-6 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="font-semibold text-slate-200">
                Dumalneg National High School - Faculty Workstation
              </p>
              <p className="mt-1">
                Municipality of Dumalneg, Province of Ilocos Norte, Philippines
              </p>
            </div>
            <div className="text-right">
              <p>MMSU CCIS Capstone Project</p>
              <p className="text-slate-500 mt-0.5">Lozano, Digap, Julian, Magdaong, Tumpap</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
