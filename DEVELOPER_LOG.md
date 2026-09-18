# NOTEPAD NG DEVELOPERS: DUMAL-NEXT ENROLLMENT SYSTEM
**Dumalneg National High School (DNHS)**  
**Proponents / Developers**: Lozano, Digap, Julian, Magdaong, Tumpap  
**Dokumentasyon para sa 3 Magkakasamang Magco-code**

---

## 1. MAHAHALAGANG PATAKARAN SA PAG-CODE (GROUND RULES)

1. **BAWAL ANG EMOJI AT ICONS SA UI AT CODE**:
   - Huwag gagamit ng mga emoji (tulad ng checkmark emojis, warning emojis, smileys) o decorative icons.
   - Ang disenyo ay dapat pormal, academic, at sumusunod sa **DepEd Color Scheme: Navy Blue (`#002060`) at Pure White (`#FFFFFF`)**.
   - Gamitin ang malinaw na text labels sa halip na icons (hal. "[ Approved ]", "[ Pending ]", "[ Needs Revision ]", "Bumalik", "Isumite", "I-print").

2. **DOKUMENTASYON SA BAWAT PAGBABAGO**:
   - Bawat bagong file, database table, o API na gagawin ay dapat idagdag dito sa `DEVELOPER_LOG.md`.
   - Bago mag-commit o mag-push sa GitHub, suriin muna ang listahan dito para walang nagkakasalungat na code.

3. **STRICT MVC (Model-View-Controller)**:
   - **View Layer**: React / Next.js Components (`app/`)
   - **Controller Layer**: Next.js Server Actions (`app/actions/`)
   - **Model Layer**: PostgreSQL / Supabase Tables at RLS (`supabase/schema.sql`, `lib/supabase/`)
   - *Bawal ang direktang SQL query mula sa frontend client components!*

---

## 2. ESTRUKTURA NG PROYEKTO (FOLDER STRUCTURE)

```
dumalnext/
├── app/
│   ├── (auth)/                # Login at Register para sa 4 na user roles
│   ├── (portals)/
│   │   ├── student/           # Student Workstation (Enrollment form, Schedule, Elective Cart)
│   │   ├── teacher/           # Faculty Portal (Class Rosters, Teaching Loads)
│   │   ├── admin/             # Administrator Dashboard (Approvals, Sectioning, Schedules)
│   │   └── it-support/        # IT Support Portal (Academic Year Setup, RBAC, Logs)
│   ├── actions/               # Server Actions (Controller logic: deconfliction, approvals)
│   ├── globals.css            # DepEd Navy Blue & Pure White Stylesheet
│   ├── layout.tsx             # Main Root Layout
│   └── page.tsx               # Landing Page & Portal Switcher
├── components/                # Reusable UI Components (Puro formal, zero emoji/icons)
│   ├── ui/                    # Form inputs, tables, cards, modal alerts
│   └── forms/                 # Multi-step enrollment stepper with Canvas compressor
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase Client
│   │   └── server.ts          # Server-side Supabase Client
│   ├── engines/
│   │   └── deconfliction.ts   # Schedule Deconfliction Engine (Teacher, Room, Student)
│   └── utils/
│       └── image-compressor.ts# Client-side HTML5 Canvas Compressor (<350KB WebP/JPEG)
├── supabase/
│   └── schema.sql             # Buong PostgreSQL Database Script (Tables, RLS, Functions)
├── DEVELOPER_LOG.md           # ITO ITO - Ang Notepad ninyong 3 developers
└── .env.local                 # Supabase Project URL at API Keys (Huwag i-commit sa git!)
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
- [ ] Supabase SQL Schema (`supabase/schema.sql`) created and tested
- [ ] Git Repository initialized with clean `.gitignore`
- [ ] `.env.example` created for Supabase keys
- [ ] GitHub Remote instructions prepared
- [ ] Vercel Deployment readiness validated
