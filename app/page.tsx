import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Official Notice Banner */}
      <section className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white rounded-2xl p-6 sm:p-8 shadow-md border border-[#001744] border-t-4 border-t-amber-400">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <img
              src="/dumalneg-logo.png"
              alt="Dumalneg NHS Seal"
              className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0 hidden sm:block mt-0.5"
            />
            <div>
              <span className="text-xs font-bold tracking-widest text-amber-300 uppercase">
                Official School Announcement
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
                Online Enrollment is Now Open for Incoming and Returning Students
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-2 max-w-3xl leading-relaxed">
                This official web portal serves the students and parents of Dumalneg National High School, 
                particularly across remote and far-flung barangays, eliminating geographical barriers for enrollment. 
                Equipped with client-side image compression to guarantee rapid document submissions even under low-bandwidth network conditions.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <Link
              href="/student/enroll"
              className="inline-block bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-center uppercase tracking-wider text-xs px-6 py-3.5 font-extrabold shadow-sm transition-colors"
            >
              Proceed to Online Enrollment
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audiences Grid: G7, G11, Transferees, Returning Students */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold tracking-wider text-[#002060] uppercase mb-4">
          Enrollment Classification Guidelines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="text-[11px] font-bold text-[#002060] uppercase tracking-wider mb-1">
              01 &bull; Incoming Grade 7
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Junior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For Grade 6 elementary completers. Upload official PSA Birth Certificate and Form 138 (Learner&apos;s Progress Report Card).
            </p>
            <span className="badge-status badge-pending">Online Registration Required</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="text-[11px] font-bold text-[#002060] uppercase tracking-wider mb-1">
              02 &bull; Incoming Grade 11 &amp; Transferees
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Senior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Select Senior High Track, Strand (STEM, TVL, HUMSS), and Cross-Strand Electives. Maximum of 5 core subjects per trimester.
            </p>
            <span className="badge-status badge-pending">Online Registration Required</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
              03 &bull; Returning Students (Grades 8-10, Grade 12)
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Continuing Enrollment</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Regular continuing students of DNHS are automatically transcribed in the database. Verify record status via LRN lookup.
            </p>
            <span className="badge-status badge-approved">Database Auto-Transcribed</span>
          </div>
        </div>
      </section>

      {/* The 4 Core Portals (View Layer) */}
      <section className="space-y-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#002060] uppercase">
            Portal Workstation Directory
          </span>
          <h3 className="text-lg font-extrabold text-slate-900">
            Select Your Designated Workstation Portal
          </h3>
          <p className="text-xs text-slate-500">
            Strictly segregated role-based access control for students, faculty, school administrators, and IT systems staff.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Student Portal */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Portal 01</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Student Portal</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Online registration, client-side document upload, elective selection, and real-time application status tracking.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/student"
                className="btn-primary rounded-lg w-full text-center text-xs uppercase tracking-wider block"
              >
                Enter Student Portal
              </Link>
            </div>
          </div>

          {/* 2. Teacher Portal */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Portal 02</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Faculty / Teacher</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Review assigned teaching loads (JHS &amp; SHS cross-level loads), schedules, and generate student class rosters.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/teacher"
                className="btn-secondary rounded-lg w-full text-center text-xs uppercase tracking-wider block"
              >
                Faculty Login
              </Link>
            </div>
          </div>

          {/* 3. Administrator Dashboard */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Portal 03</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">School Administrator</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Review enrollment applications (Approve / Needs Revision), master records, automated deconfliction, and section quotas.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/admin"
                className="btn-secondary rounded-lg w-full text-center text-xs uppercase tracking-wider block"
              >
                Administrator Portal
              </Link>
            </div>
          </div>

          {/* 4. IT Support Portal */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Portal 04</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">IT Support &amp; System</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Dynamic academic year and trimester calendar configuration, RBAC permissions, session control, and audit logs.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/it-support"
                className="btn-secondary rounded-lg w-full text-center text-xs uppercase tracking-wider block"
              >
                IT Support Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* System Specifications Compliance Section */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold tracking-wider text-[#002060] uppercase mb-3">
          Institutional Academic Policies &amp; System Specifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">1. Three-Term (Trimester) Academic Calendar:</strong>
            The school year is structured into three instructional terms to support comprehensive mastery of core and specialized subjects.
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">2. Senior High School Core Subject Limit:</strong>
            Senior High School students are strictly limited to a maximum of five (5) core subjects per trimester in accordance with school policy.
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">3. Automated Schedule Deconfliction:</strong>
            The scheduling engine automatically validates and resolves conflicts across faculty cross-level teaching loads, rooms, and subjects.
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">4. Cross-Strand Electives &amp; Strand Switching:</strong>
            Senior High students may elect interdisciplinary subjects, and may request strand realignment prior to entering Grade 12.
          </div>
        </div>
      </section>
    </div>
  );
}
