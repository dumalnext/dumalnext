# DUMAL-NEXT: TECHNICAL REQUIREMENTS DOCUMENT (TRD)

**System Title**: Dumal-NEXT Architecture & Technical Stack Specification  
**Deployment Infrastructure**: Vercel Multi-Zones & Supabase Enterprise Cloud (AWS ap-southeast-1)  
**Monorepo Strategy**: NPM Workspaces (`apps/*`)  
**Target Environment**: Node.js v20.x LTS / v22.x LTS  
**Document Version**: 1.0 (Production Architecture)  

---

## 1. Technical Stack Overview

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Language** | **TypeScript** | `^5.0.0` | End-to-end static type safety, eliminating runtime null pointer exceptions across complex student demographic objects. |
| **Framework** | **Next.js (App Router)** | `16.3.5` | React Server Components (RSC), optimized server actions, hybrid static/dynamic page generation, and built-in routing. |
| **UI Library** | **React** | `19.2.8` | Component-driven declarative UI with concurrent rendering, actions, and modern transitions. |
| **Styling** | **Tailwind CSS** | `^4.0.0` | High-performance CSS utility engine with zero-runtime overhead via `@tailwindcss/postcss`. |
| **Database & ORM** | **PostgreSQL (Supabase)** | `15.x` | Relational 3NF ACID-compliant storage with relational triggers, foreign keys, and stored procedures. |
| **Authentication** | **Supabase Auth** | `@supabase/ssr ^0.12.7` | Cookie-based session management, JWT verification, and email OTP handling across client and server components. |
| **Object Storage** | **Supabase Storage** | `S3-Compatible` | Encrypted cloud bucket storage for scanned documents (PSA certificates, Form 138, ID pictures). |
| **PDF Generation** | **pdf-lib** | `^1.17.1` | Programmatic vector PDF manipulation and form coordinate encoding to produce official 2-Page DepEd enrollment forms. |
| **Client Compression**| **HTML5 Canvas API** | `Native Browser` | In-memory image downscaling and JPEG quality compression before network transmission. |
| **Realtime Sync** | **Supabase Realtime** | `WebSockets` | Postgres change data capture (CDC) for zero-refresh status updates on student applications and section changes. |

---

## 2. System Architecture & Repository Structure

The project is structured as an **NPM Workspaces Monorepo** separating the 4 distinct user workstations into standalone Next.js applications sharing common configuration and utilities.

```
dumalnext/
├── apps/
│   ├── student/                # PORTAL 01: Student Admission & Application Tracker
│   │   ├── app/                # Next.js App Router (page.tsx, enroll/, track/, section/)
│   │   ├── components/         # 5-Step Stepper, OTP Input, Video Guides, Custom Select
│   │   ├── lib/                # Auth context, Supabase client/server, PDF generator, compressor
│   │   ├── public/             # Institutional logos and static assets
│   │   └── package.json        # Workspace: @dumalnext/student (Port 3000)
│   │
│   ├── teacher/                # PORTAL 02: Faculty & Class Adviser Workstation
│   │   ├── app/                # Overview, /schedule, /roster, /profile
│   │   ├── components/         # Timetable cards, Roster data tables, Header nav
│   │   ├── lib/                # Teacher Auth context & Supabase connectors
│   │   └── package.json        # Workspace: @dumalnext/teacher (Port 3001)
│   │
│   ├── admin/                  # PORTAL 03: School Administrator & Registrar Console
│   │   ├── app/                # /adjudication, /sections, /scheduling, /control-room, /subjects
│   │   ├── components/         # Quota consoles, Schedule deconfliction, Document preview modal
│   │   ├── lib/                # Deconfliction engine, Admin auth context
│   │   └── package.json        # Workspace: @dumalnext/admin (Port 3002)
│   │
│   └── it-support/             # PORTAL 04: IT Support, Calendar & Security Auditor
│       ├── app/                # Calendar manager, Classroom facilities, Role auditor, Diagnostics
│       ├── components/         # Academic term creator, User table, Health monitor
│       ├── lib/                # IT Auth context & Supabase connectors
│       └── package.json        # Workspace: @dumalnext/it-support (Port 3003)
│
├── docs/                       # Technical & Architectural System Documentation
├── supabase/
│   ├── schema.sql              # Consolidated PostgreSQL schema, functions & RLS scripts
│   └── migrations/             # Incremental migration files
├── package.json                # Root package.json managing workspaces and root build scripts
└── vercel.json                 # Vercel deployment configuration & security headers
```

---

## 3. Key Algorithmic Engines

### 3.1. Client-Side Image Compression Engine (`image-compressor.ts`)
* **Problem**: Parents and students uploading multi-megabyte smartphone camera photos (3 MB – 12 MB) over rural 2G/3G mobile data networks experience upload timeouts and high bandwidth costs.
* **Solution**: Client-side preprocessing using HTML5 Canvas:
  ```typescript
  // Algorithmic flow:
  // 1. Intercept file input before FormData construction.
  // 2. Read image into HTMLImageElement via URL.createObjectURL.
  // 3. Scale down maximum dimension to 1600px while maintaining aspect ratio.
  // 4. Render to offscreen Canvas and export to Blob via canvas.toBlob('image/jpeg', 0.72).
  // 5. Result: Output file size is reduced by 75-90% (< 800 KB) with crisp document readability.
  ```

### 3.2. Automated Schedule Deconfliction Engine (`deconfliction.ts`)
* **Problem**: Assigning teachers, classrooms, and student sections manually leads to double-booked rooms or faculty members assigned to teach in two different rooms at the same time.
* **Solution**: Three-dimensional collision matrix check:
  $$\text{Collision} = (T_A = T_B \land D_A = D_B) \land \left( [S_A, E_A) \cap [S_B, E_B) \neq \emptyset \right)$$
  Where $T$ is the shared resource (Teacher, Room, or Section), $D$ is the Day of week, and $[S, E)$ represents the start and end time interval.
* If any interval overlap occurs, the engine flags the specific conflicting entity, preventing invalid timetable persistence.

### 3.3. DepEd Form 138 / Enrollment PDF Engine (`depedPdfGenerator.ts`)
* Utilizes `pdf-lib` to dynamically embed student demographic data, LRN, academic background, and guardian details directly into standard DepEd Form coordinates.
* Generates an official 2-Page vectorized PDF with DepEd Region I headers, ready for direct archiving and printing.

---

## 4. Environment Variables & Secret Management

All environment variables must be configured in `.env.local` for local development and in the **Vercel Project Settings** for production:

```ini
# ==============================================================================
# SUPABASE CLOUD CONNECTION
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...<public-anon-key>

# Service Role Key (Used strictly in protected server API routes / Server Actions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...<service-role-key>

# ==============================================================================
# PORTAL DOMAIN RESOLUTION (For Vercel Multi-Zones & OAuth Redirects)
# ==============================================================================
NEXT_PUBLIC_STUDENT_PORTAL_URL=https://dumalnext-student.vercel.app
NEXT_PUBLIC_ADMIN_PORTAL_URL=https://dumalnext-admin.vercel.app
NEXT_PUBLIC_TEACHER_PORTAL_URL=https://dumalnext-teacher.vercel.app
NEXT_PUBLIC_ITSUPPORT_PORTAL_URL=https://dumalnext-itsupport.vercel.app
```

---

## 5. Security Architecture & HTTP Headers

In accordance with institutional guidelines and `vercel.json`, all web responses enforce strict HTTP security headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

1. **Authentication State Verification**:
   * Client-side auth uses Supabase session cookies handled by `@supabase/ssr`.
   * Protected server endpoints verify user identity and role claims before serving adjudication or section quota records.
2. **Storage Bucket Access Control**:
   * Storage bucket `enrollment-documents` allows authenticated student uploads into folder paths matching their `cleanStudentId`.
   * Public anonymous read access is disallowed; document downloads are signed with expiring access tokens or restricted to Registrar and Administrator roles.
