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
                <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
                School Announcement
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
                Online Enrollment is Open for New and Returning Students
              </h2>
              <p className="text-sm text-blue-100 mt-2 max-w-3xl leading-relaxed">
                Welcome to the Dumalneg National High School online portal. Students and parents from every barangay can easily enroll from home, upload report cards and birth certificates cleanly even with slow internet, and check their application updates online.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <Link
              href="/student/enroll"
              className="inline-block bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-center text-sm px-6 py-3.5 font-bold shadow-sm transition-colors"
            >
              Start Enrollment
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audiences Grid: G7, G11, Transferees, Returning Students */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-[#002060] mb-4">
          Who Can Enroll Online
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="text-xs font-bold text-[#002060] mb-1">
              Incoming Grade 7
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Junior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For Grade 6 graduates joining Dumalneg NHS. Please prepare a photo or scan of your PSA Birth Certificate and Grade 6 Report Card (Form 138).
            </p>
            <span className="badge-status badge-pending">Needs Online Form</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="text-xs font-bold text-[#002060] mb-1">
              Incoming Grade 11 &amp; Transferees
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Senior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Choose your Senior High Track, Strand (STEM, TVL, HUMSS), and preferred electives (up to 5 core subjects each term).
            </p>
            <span className="badge-status badge-pending">Needs Online Form</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="text-xs font-bold text-emerald-800 mb-1">
              Returning Students (Grades 8–10 &amp; 12)
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Continuing Enrollment</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Current Dumalneg NHS students already have their school records on file. Simply sign in with your email or 12-digit LRN to confirm.
            </p>
            <span className="badge-status badge-approved">Fast Re-Enrollment</span>
          </div>
        </div>
      </section>

      {/* The 4 Core Portals (View Layer) */}
      <section className="space-y-4">
        <div>
          <span className="text-xs font-bold text-[#002060]">
            School Portals
          </span>
          <h3 className="text-lg font-extrabold text-slate-900">
            Choose Your Portal
          </h3>
          <p className="text-sm text-slate-500">
            Select the portal that matches your role at Dumalneg National High School.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Student Portal */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-600 mb-1.5">Students &amp; Parents</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Student Portal</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Enroll online, upload required documents, view your section and class schedule, and see your grades.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/student"
                className="btn-primary rounded-lg w-full text-center text-xs block"
              >
                Open Student Portal
              </Link>
            </div>
          </div>

          {/* 2. Teacher Portal */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-600 mb-1.5">Faculty &amp; Advisers</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Teacher Portal</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Check your teaching schedule, manage your advisory class student list, and upload report cards.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/teacher"
                className="btn-secondary rounded-lg w-full text-center text-xs block"
              >
                Teacher Sign In
              </Link>
            </div>
          </div>

          {/* 3. Administrator Dashboard */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-600 mb-1.5">Registrar &amp; Principal</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Administrator Portal</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Review student enrollment applications, manage class sections and slots, and build conflict-free schedules.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/admin"
                className="btn-secondary rounded-lg w-full text-center text-xs block"
              >
                Administrator Sign In
              </Link>
            </div>
          </div>

          {/* 4. IT Support Portal */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 border-t-4 border-t-[#002060] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-600 mb-1.5">School IT Coordinator</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">IT Support Portal</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Set school years and grading terms, manage classrooms and staff accounts, and answer student help messages.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/it-support"
                className="btn-secondary rounded-lg w-full text-center text-xs block"
              >
                IT Support Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* System Specifications Compliance Section */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-[#002060] mb-3">
          How Enrollment &amp; Classes Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">1. Three-Term School Year:</strong>
            The school year has three terms so students can focus well on their core and track subjects.
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">2. Senior High Subject Limit:</strong>
            Senior High School students take up to five (5) core subjects each term, following school policy.
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">3. Automatic Conflict-Free Schedules:</strong>
            Class schedules are checked automatically so no teacher or classroom is double-booked.
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-1">4. Electives &amp; Changing Strands:</strong>
            Senior High students can pick elective subjects and may request to change their strand before Grade 12.
          </div>
        </div>
      </section>
    </div>
  );
}
