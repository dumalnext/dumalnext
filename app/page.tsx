import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Official Notice Banner (Zero Emoji/Icon) */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#002060] uppercase">
              [ Official School Announcement ]
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Online Enrollment is Now Open for Incoming and Returning Students
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              This official web portal serves the students and parents of Dumalneg National High School, 
              particularly across remote and far-flung barangays, eliminating geographical barriers for enrollment. 
              Equipped with client-side image compression to guarantee rapid document submissions even under low-bandwidth network conditions.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/student/enroll"
              className="btn-primary block text-center uppercase tracking-wider text-xs px-6 py-3 font-bold"
            >
              Proceed to Online Enrollment
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audiences Grid: G7, G11, Transferees, Returning Students */}
      <section className="bg-slate-100 p-6 border border-slate-200">
        <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-4">
          [ Enrollment Classification Guidelines ]
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ 01 ] Incoming Grade 7
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Junior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For Grade 6 elementary completers. Upload official PSA Birth Certificate and Form 138 (Learner&apos;s Progress Report Card).
            </p>
            <span className="badge-status badge-pending">Online Registration Required</span>
          </div>

          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ 02 ] Incoming Grade 11 & Transferees
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Senior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Select Senior High Track, Strand (STEM, TVL, HUMSS), and Cross-Strand Electives. Maximum of 5 core subjects per trimester.
            </p>
            <span className="badge-status badge-pending">Online Registration Required</span>
          </div>

          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-emerald-800 uppercase mb-1">
              [ 03 ] Returning Students (Grades 8-10, Grade 12)
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
            [ Portal Workstation Directory ]
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            Select Your Designated Workstation Portal
          </h3>
          <p className="text-xs text-slate-500">
            Strictly segregated role-based access control for students, faculty, school administrators, and IT systems staff.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Student Portal */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 01 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Student Portal</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Online registration, client-side document upload, elective selection, and real-time application status tracking.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/student"
                className="btn-primary w-full text-center text-xs uppercase tracking-wider block"
              >
                Enter Student Portal
              </Link>
            </div>
          </div>

          {/* 2. Teacher Portal */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 02 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Faculty / Teacher</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Review assigned teaching loads (JHS & SHS cross-level loads), schedules, and generate student class rosters.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/teacher"
                className="btn-secondary w-full text-center text-xs uppercase tracking-wider block"
              >
                Faculty Login
              </Link>
            </div>
          </div>

          {/* 3. Administrator Dashboard */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 03 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">School Administrator</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Review enrollment applications (Approve / Needs Revision), master records, automated deconfliction, and section quotas.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/admin"
                className="btn-secondary w-full text-center text-xs uppercase tracking-wider block"
              >
                Administrator Portal
              </Link>
            </div>
          </div>

          {/* 4. IT Support Portal */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 04 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">IT Support & System</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Dynamic academic year and trimester calendar configuration, RBAC permissions, session control, and audit logs.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/it-support"
                className="btn-secondary w-full text-center text-xs uppercase tracking-wider block"
              >
                IT Support Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* System Specifications Compliance Section */}
      <section className="bg-white p-6 border border-slate-200">
        <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-3">
          [ Institutional Academic Policies & System Specifications ]
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">1. Three-Term (Trimester) Academic Calendar:</strong>
            The school year is structured into three instructional terms to support comprehensive mastery of core and specialized subjects.
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">2. Senior High School Core Subject Limit:</strong>
            Senior High School students are strictly limited to a maximum of five (5) core subjects per trimester in accordance with school policy.
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">3. Automated Schedule Deconfliction:</strong>
            The scheduling engine automatically validates and resolves conflicts across faculty cross-level teaching loads, rooms, and subjects.
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">4. Cross-Strand Electives & Strand Switching:</strong>
            Senior High students may elect interdisciplinary subjects, and may request strand realignment prior to entering Grade 12.
          </div>
        </div>
      </section>
    </div>
  );
}
