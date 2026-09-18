# NOTEPAD NG DEVELOPERS: DUMAL-NEXT ENROLLMENT SYSTEM
**Dumalneg National High School (DNHS)**  
**Proponents / Developers**: Lozano, Digap, Julian, Magdaong, Tumpap  
**Dokumentasyon para sa 3 Magkakasamang Magco-code**

---

## 1. MAHAHALAGANG PATAKARAN SA PAG-CODE (GROUND RULES)

1. **BAWAL ANG EMOJI AT ICONS SA UI AT CODE**:
   - Huwag gagamit ng mga emoji (tulad ng checkmark emojis, warning emojis, smileys) o decorative icons.
   - Ang disenyo ay dapat pormal, academic, at sumusunod sa **DepEd Color Scheme: Navy Blue (`#002060`) at Pure White (`#FFFFFF`)**.
   - Gamitin ang malinaw na text labels sa halip na icons (hal. "[ Approved ]", "[ Pending ]", "[ Needs Revision ]", "Back", "Submit", "Print").

2. **STRICT FORMAL ENGLISH SA LAHAT NG UI AT FORMS**:
   - Ang buong User Interface (UI), online enrollment forms, stepper, button labels, notifications, at modal alerts ay dapat 100% nasa **pormal at opisyal na wikang Ingles (Formal Academic English)** alinsunod sa pamantayan ng Department of Education (DepEd).

3. **DOKUMENTASYON SA BAWAT PAGBABAGO**:
   - Bawat bagong file, database table, o API na gagawin ay dapat idagdag dito sa `DEVELOPER_LOG.md`.
   - Bago mag-commit o mag-push sa GitHub, suriin muna ang listahan dito para walang nagkakasalungat na code.

4. **STRICT MVC (Model-View-Controller)**:
   - **View Layer**: React / Next.js Components (`app/`)
   - **Controller Layer**: Next.js Server Actions (`app/actions/`)
   - **Model Layer**: PostgreSQL / Supabase Tables at RLS (`supabase/schema.sql`, `lib/supabase/`)
   - *Bawal ang direktang SQL query mula sa frontend client components!*

---

## 2. ESTRUKTURA NG PROYEKTO (4 STANDALONE WEBSITES / MONOREPO)

```
dumalnext/
├── apps/
│   ├── student/               # WEBSITE 1: Student Online Portal (dumalnext-student.vercel.app)
│   │   ├── app/
│   │   │   ├── layout.tsx     # Student dedicated layout & institutional banner
│   │   │   ├── page.tsx       # Student Hub (Registration & Application Tracker)
│   │   │   └── enroll/        # 5-step Multi-step Enrollment Stepper
│   │   ├── components/        # Student Form Stepper & Canvas Compressor
│   │   ├── lib/               # Types, utils, and Supabase client
│   │   └── package.json       # @dumalnext/student (Port 3000)
│   │
│   ├── teacher/               # WEBSITE 2: Faculty Workstation (dumalnext-teacher.vercel.app)
│   │   ├── app/
│   │   │   ├── layout.tsx     # Faculty dedicated layout
│   │   │   └── page.tsx       # Teacher Login, Teaching Loads, & Class Rosters
│   │   ├── lib/               # Supabase auth & client
│   │   └── package.json       # @dumalnext/teacher (Port 3001)
│   │
│   ├── admin/                 # WEBSITE 3: School Administrator (dumalnext-admin.vercel.app)
│   │   ├── app/
│   │   │   ├── layout.tsx     # Administrator executive layout
│   │   │   └── page.tsx       # Admin Sign-In, Admissions Review, & Section Quotas
│   │   ├── lib/               # Deconfliction engine, Supabase server/client
│   │   └── package.json       # @dumalnext/admin (Port 3002)
│   │
│   └── it-support/            # WEBSITE 4: IT Support Console (dumalnext-itsupport.vercel.app)
│       ├── app/
│       │   ├── layout.tsx     # IT Support security layout
│       │   └── page.tsx       # IT Auth, Dynamic Academic Calendar (No Hardcoded Dates!), RBAC
│       ├── lib/               # Supabase server/client
│       └── package.json       # @dumalnext/it-support (Port 3003)
│
├── supabase/
│   ├── schema.sql             # Buong PostgreSQL Database Script (Tables, RLS, Functions)
│   └── migrations/            # Incremental SQL migration scripts
├── DATABASE_DICTIONARY.md     # Pormal na Data Dictionary na 100% naka-align sa Class Diagram para sa Professor
├── DEVELOPER_LOG.md           # ITO ITO - Ang Notepad ninyong 3 developers
└── package.json               # Root Monorepo configuration (NPM Workspaces)
```

---

## 3. DATABASE SCHEMA & MGA TABLES (SUPABASE POSTGRESQL)

Base sa naaprubahang Class Diagram (Activity 4) at System Architecture (Activity 5):

1. **`users`**
   - Central authentication table: `id`, `user_id` (DNHS ID), `email`, `user_role` (`student`, `teacher`, `admin`, `it_support`).
2. **`students`**
   - Profile ng mag-aaral: `id`, `student_id`, `first_name`, `middle_name`, `last_name`, `grade_level` (7 hanggang 12), `strand` (para sa SHS: STEM, ABM, HUMSS, TVL), `is_returning` (Boolean: true kapag auto-renewed).
3. **`teachers`**
   - Profile ng guro: `id`, `teacher_id`, `first_name`, `middle_name`, `last_name`, `department` (JHS o SHS).
4. **`school_administrators`**
   - Profile ng admin/staff: `id`, `admin_id`, `first_name`, `last_name`, `department`.
5. **`it_supports`**
   - Profile ng IT support: `id`, `itsupport_id`, `system_role`.
6. **`course_subjects`**
   - Mga asignatura: `subject_code`, `subject_name`, `subject_type` (Core, Elective, Applied), `grade_level`, `trimester` (1, 2, o 3), `strand`.
7. **`sections`**
   - Mga pangkat ng klase: `id`, `section_name`, `grade_level`, `capacity` (quota limit).
8. **`classrooms`**
   - Mga silid-aralan: `id`, `room_name`, `building`, `capacity`.
9. **`class_schedules`**
   - Hub para sa Deconfliction Engine: `id`, `subject_code`, `section_id`, `teacher_id`, `classroom_id`, `day_of_week`, `start_time`, `end_time`, `trimester`.
10. **`enrollment_applications`**
    - Application submission: `id`, `student_id`, `school_year`, `submission_date`, `status` (`Pending`, `Approved`, `Needs Revision`), `submitted_documents` (JSON array ng S3 URLs), `admin_notes`.

---

## 4. MGA NATATANGING PATAKARAN NG DNHS NA DAPAT TANDAAN

- **Trimestral (Trisem) Calendar**: 3 terms bawat school year (Trimester 1, 2, at 3).
- **SHS Core Limit**: Maximum na **5 core subjects** bawat trisem para sa Senior High.
- **Cross-Strand Electives**: Pinapayagan ang SHS na kumuha ng elective sa labas ng sariling strand.
- **Strand Switching**: Pwedeng magpalit ng strand bago pumasok sa Grade 12.
- **Returning Students**: Awtomatikong transcribed / renewed ang records sa database tuwing simula ng panibagong taon; hindi na kailangang mag-fill out ulit.
- **Deconfliction Engine**: Dapat may validation bago mag-save ng schedule:
  1. Walang kaparehong oras ang guro (cross-level teaching loads).
  2. Walang kaparehong oras ang classroom.
  3. Walang magkakasabay na klase ang estudyante at hindi pwedeng ulitin ang naipasa nang subject.

---

## 5. CHECKLIST NG MGA NAGAWA NA (DEVELOPMENT TIMELINE)

- [x] Next.js 15+ App Router Project Initialized
- [x] Tailwind CSS DepEd Navy Blue & Pure White palette configured
- [x] Zero-emoji/zero-icon design system enforced
- [x] Developer Log (`DEVELOPER_LOG.md`) created as shared team notebook
- [x] Supabase SDKs installed (`@supabase/supabase-js`, `@supabase/ssr`)
- [x] Supabase SQL Schema (`supabase/schema.sql`) created and updated
- [x] Git Repository initialized and pushed to `dumalnext/dumalnext` on GitHub
- [x] `.env.local` configured with Supabase Project `fvybtqghtuarjzlpbwnr`
- [x] Supabase SQL schema executed in Supabase SQL Editor (All tables, RLS, & seed data active)
- [x] Vercel deployment connected to GitHub repo and Supabase
- [x] **Dinamikong DepEd Three-Term Calendar (Walang Hardcoded Dates)**:
  - Ang mga petsa ng bawat termino (Term 1, Term 2, Term 3), school year, exam dates, at report card distribution ay HINDI naka-hardcode.
  - Dinamiko itong ise-set at iko-configure ng **IT Support** o **School Administrator** taon-taon batay sa inilalabas na taunang DepEd Order.
  - Ang schema sa `academic_terms` ay handa para sa dynamic creation ng school year configurations.
- [x] **Unang Hakbang: Pag-align ng Database sa DepEd Enrollment Form (Revised 06/01/2025)**:
  - Pinalawak ang `students` table sa `supabase/schema.sql` upang suportahan ang opisyal na DepEd fields: LRN (12 digits), PSA No., buong pangalan at extension name, lugar ng kapanganakan, relihiyon, wika, Indigenous Peoples (IP) status at pamayanan, 4Ps beneficiary at 16-digit ID, detalyadong tirahan (Cabaritan, Kalabakan, Quibel, San Isidro), magulang at legal guardian na may hiwalay na contact numbers, at SNEd/PWD status.
  - Pinalawak ang `enrollment_applications` table upang maglaman ng snapshot fields para sa Balik-Aral at Transferee history (huling antas, taon, paaralan, at 6-digit School ID), graded vs non-graded indicator, at distance learning modality preferences (Section 8).
  - Ginawa ang migration file: `supabase/migrations/20260918_deped_enrollment_fields.sql`.
  - Ginawa ang TypeScript type definitions at constants: `lib/types/enrollment.ts`.
  - In-update ang Technical Data Dictionary: `DATABASE_DICTIONARY.md` (Table 2 at Table 11).
- [x] **Paggawa ng Hakbang 1 (Klasipikasyon at Antas) sa Student Portal**:
  - Ginawa ang master component na `components/forms/enrollment/EnrollmentStepper.tsx` na nagpapatakbo ng 5-step progress indicator, state management, at validation.
  - Ginawa ang `components/forms/enrollment/Step1ApplicantType.tsx` para sa Graded vs Non-Graded (SNEd), pagpili ng Incoming G7, Incoming G11, Transferee, o Returning (Balik-Aral), at dinamikong patlang para sa dating pinasukang paaralan at 6-digit School ID.
  - Ginawa ang mga ruta sa App Router: `/student` (Student Hub & Application Status Lookup) at `/student/enroll` (Online Enrollment Stepper).
  - 100% nasunod ang DepEd Navy Blue (`#002060`) at Pure White theme na walang kahit anong emoji o decorative icons.
- [x] **Arkitektura ng Apat (4) na Ganap na Magkakahiwalay na Websites (Monorepo)**:
  - Naitatag ang apat na magkakahiwalay na standalone web applications sa loob ng iisang repository gamit ang NPM Workspaces:
    1. `apps/student` (`@dumalnext/student` - Port 3000): Dedicated Student Portal at Online Enrollment Form. Walang anumang admin/teacher links.
    2. `apps/teacher` (`@dumalnext/teacher` - Port 3001): Dedicated Faculty Workstation para sa teaching loads at class rosters.
    3. `apps/admin` (`@dumalnext/admin` - Port 3002): Dedicated School Administrator Portal para sa admissions review, section quotas, at automated deconfliction.
    4. `apps/it-support` (`@dumalnext/it-support` - Port 3003): Dedicated IT Systems Console para sa dynamic calendar setup (no hardcoded dates) at RBAC audit logs.
  - Ang lahat ng apat na web apps ay may sari-sariling `npm run build` na 100% matagumpay at walang errors.
  - Handa para sa apat (4) na magkakahiwalay na live Vercel deployments (`dumalnext-student.vercel.app`, `dumalnext-teacher.vercel.app`, `dumalnext-admin.vercel.app`, `dumalnext-itsupport.vercel.app`).
- [x] **Pagpapahusay sa Hakbang 1 (Smart Prerequisite Level Tracker & Conditional SHS Selection)**:
  - **Category 01 (Incoming Grade 7)**: Naka-lock sa Grade 7, humihingi ng Elementary School credentials (Pangalan, 6-digit School ID, SY), at pre-set sa Grade 6 completer (may option din para sa Grade 7 repeater).
  - **Category 02 (Incoming Grade 11)**: Naka-lock sa Grade 11, humihingi ng JHS credentials (Pangalan, 6-digit School ID, SY, Grade 10 completer o Grade 11 repeater), at agarang inilalabas ang **DepEd Section 7 (SHS Track & Strand Selection: STEM, HUMSS, TVL-ICT, TVL-AFA, TVL-HE at Semester)**.
  - **Category 03 (Transferee) & Category 04 (Returning / Balik-Aral)**: May Target Grade selector (7–12), may **Smart Prerequisite Level Tracker** na awtomatikong nag-e-exclude ng imposibleng mas matataas na baitang habang may repeater option sa lahat ng baitang 7 hanggang 12, at awtomatikong inilalabas ang Section 7 kapag Grade 11 o 12 ang pinili.
- [x] **Automated Official DepEd PDF Form Generator (`pdf-lib`)**:
  - Inilagay ang opisyal na 2-page DepEd Basic Education Enrollment Form template (Revised as of 06/01/2025) sa `apps/student/public/forms/deped-enrollment-p1.jpg` at `p2.jpg`.
  - Ginawa ang `apps/student/lib/utils/depedPdfGenerator.ts` na awtomatikong nagpi-print at nagpapatong (superimpose) ng bawat input ng mag-aaral: 12-digit LRN boxes, PSA, buong pangalan, petsa ng kapanganakan, edad, kasarian `[X]`, IP community, 16-digit 4Ps ID boxes, tirahan, magulang/guardian, SNEd status, dating paaralan at 6-digit School ID, SHS track at strand, at distance learning modalities.
  - May "Download Accomplished DepEd Form (PDF)" button para agad makapag-print ang mag-aaral o administrador ng opisyal na DepEd form.
- [x] **Junior High School Curricular Program (Regular vs SPS)**:
  - Idinagdag para sa lahat ng Grade 7 hanggang Grade 10 enrollees ang pagpili sa pagitan ng:
    1. **Regular Basic Education Curriculum (Standard JHS)**
    2. **Special Program in Sports (SPS - DepEd Special Curricular Program)**
  - Naka-map sa database at awtomatikong lumalabas sa PDF form at enrollment summary bilang gabay sa Sectioning at Sports Coaching schedule deconfliction.


