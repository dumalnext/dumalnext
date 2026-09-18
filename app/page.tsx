import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Official Notice Banner (Zero Emoji/Icon) */}
      <section className="bg-white border-l-4 border-[#002060] p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#002060] uppercase">
              [ Opisyal na Anunsyo ng Paaralan ]
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Bukas na ang Online Enrollment para sa Taong Panuruan 2026-2027
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              Ang sistemang ito ay opisyal na inilaan para sa mga mag-aaral ng Dumalneg National High School, 
              lalo na sa mga malalayong barangay upang hindi na kailangang bumiyahe nang malayo para magsumite 
              ng mga kinakailangang dokumento. May built-in image compression upang mabilis makapag-upload kahit mahina ang signal.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/student/enroll"
              className="btn-primary block text-center uppercase tracking-wider text-xs px-6 py-3 font-bold"
            >
              Magsimula ng Enrollment
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audiences Grid: G7, G11, Transferees, Returning Students */}
      <section className="bg-slate-100 p-6 border border-slate-200">
        <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-4">
          [ Gabay sa Pagpapatala ayon sa Antas ng Mag-aaral ]
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ 01 ] Incoming Grade 7
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Junior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Para sa mga magtatapos ng Grade 6. Mag-upload ng PSA Birth Certificate at Form 138 (Report Card).
            </p>
            <span className="badge-status badge-pending">Kinakailangan ng Online Form</span>
          </div>

          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-[#002060] uppercase mb-1">
              [ 02 ] Incoming Grade 11 & Transferees
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Senior High School</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Pumili ng Strand (STEM, TVL, HUMSS) at Cross-Strand Electives. May limitasyong hanggang 5 core subjects bawat trisem.
            </p>
            <span className="badge-status badge-pending">Kinakailangan ng Online Form</span>
          </div>

          <div className="bg-white p-4 border border-slate-300">
            <div className="text-xs font-bold text-emerald-800 uppercase mb-1">
              [ 03 ] Returning Students (G8-G10, G12)
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Awtomatikong Na-Renew</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Ang mga datihang mag-aaral ng DNHS ay awtomatikong inililipat sa susunod na baitang. I-verify lamang ang inyong talaan.
            </p>
            <span className="badge-status badge-approved">Auto-Transcribed sa Database</span>
          </div>
        </div>
      </section>

      {/* The 4 Core Portals (View Layer) */}
      <section className="space-y-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#002060] uppercase">
            [ Portal Navigation ]
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            Pumili ng Portal ayon sa Inyong Tungkulin
          </h3>
          <p className="text-xs text-slate-500">
            Segregated Role-Based Access Control para sa mga estudyante, guro, admin, at IT staff.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Student Portal */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 01 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Student Portal</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Online registration, pag-upload ng dokumento, pagpili ng electives, at pagsubaybay sa application status.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/student"
                className="btn-primary w-full text-center text-xs uppercase tracking-wider"
              >
                Buksan ang Portal
              </Link>
            </div>
          </div>

          {/* 2. Teacher Portal */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 02 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">Faculty / Teacher</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Tingnan ang assigned teaching schedule (JHS at SHS cross-level loads) at one-click student class roster lookup.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/teacher"
                className="btn-secondary w-full text-center text-xs uppercase tracking-wider"
              >
                Guro Mag-Login
              </Link>
            </div>
          </div>

          {/* 3. Administrator Dashboard */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 03 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">School Administrator</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Pagsusuri ng submissions (Approve / Needs Revision), master records, automated deconfliction, at section quota limits.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/admin"
                className="btn-secondary w-full text-center text-xs uppercase tracking-wider"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>

          {/* 4. IT Support Portal */}
          <div className="bg-white p-5 border-2 border-slate-300 hover:border-[#002060] transition-colors flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 mb-2">[ PORTAL 04 ]</div>
              <h4 className="text-base font-bold text-[#002060] mb-2">IT Support & System</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Konfigurasyon ng academic year at trisem, RBAC role permissions, session management, at audit logs.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/it-support"
                className="btn-secondary w-full text-center text-xs uppercase tracking-wider"
              >
                IT Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* System Specifications Compliance Section */}
      <section className="bg-white p-6 border border-slate-200">
        <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-3">
          [ Mga Alituntunin at Regulasyon ng Sistema (DNHS Academic Specs) ]
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">1. Trimestral (Trisem) System:</strong>
            Ang akademikong taon ay nahahati sa tatlong trisem para sa maayos na pag-aaral ng mga core at specialized subjects.
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">2. Senior High School Core Subject Limit:</strong>
            Limitado sa pinakamataas na limang (5) core subjects bawat trisem ang bawat SHS student ayon sa kurikulum ng paaralan.
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">3. Automated Schedule Deconfliction:</strong>
            Awtomatikong sinusuri ng algorithm kung may conflict sa oras ng guro (cross-level load), silid-aralan, at mga asignatura.
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <strong className="text-slate-900 block mb-1">4. Cross-Strand Electives & Strand Switching:</strong>
            Maaaring kumuha ng electives mula sa ibang strand at magpalit ng strand bago pumasok sa Grade 12.
          </div>
        </div>
      </section>
    </div>
  );
}
