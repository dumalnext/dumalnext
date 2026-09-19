# DUMAL-NEXT: Dumalneg National High School Web Portals

Official DepEd Online Admission & Academic Resource Management System for Dumalneg National High School (School ID: 300017), Division of Ilocos Norte, Region I.

---

## Official Production Vercel Portals

| Portal | Dedicated Vercel Domain | Multi-Zones Path | Paglalarawan |
|:---|:---|:---|:---|
| **Student Admission & Enrollment** | [`https://dumalnext-student.vercel.app`](https://dumalnext-student.vercel.app) | `/` | 5-Step Online Enrollment, DepEd Form 138/PSA Uploads, Realtime Status Tracker. |
| **School Administrator & Registrar** | [`https://dumalnext-admin.vercel.app`](https://dumalnext-admin.vercel.app) | `/admin` | Adjudication Queue, DepEd 40-Quota Control, 3D Schedule Deconfliction, Control Room. |
| **Faculty & Teacher** | [`https://dumalnext-teacher.vercel.app`](https://dumalnext-teacher.vercel.app) | `/teacher` | Class Advisory Lists, Grade Submission, Section Loads. |
| **IT Support & Systems** | [`https://dumalnext-itsupport.vercel.app`](https://dumalnext-itsupport.vercel.app) | `/it-support` | Academic Calendar Terms, User Role Provisioning, System Audits. |

---

## Deployment on Vercel

This repository is structured as an npm workspaces monorepo (`apps/*`).

### Deploying Each Portal to Vercel:
1. Pumunta sa [Vercel Dashboard](https://vercel.com/new).
2. I-import ang repository: `dumalnext/dumalnext`.
3. Gumawa ng apat (4) na proyekto para sa bawat portal:
   - **Student Portal**:
     - Project Name: `dumalnext-student`
     - Root Directory: `apps/student`
   - **Admin Portal**:
     - Project Name: `dumalnext-admin`
     - Root Directory: `apps/admin`
   - **Teacher Portal**:
     - Project Name: `dumalnext-teacher`
     - Root Directory: `apps/teacher`
   - **IT Support Portal**:
     - Project Name: `dumalnext-itsupport`
     - Root Directory: `apps/it-support`

### Supabase Authentication Redirect URLs:
Sa inyong Supabase Dashboard (`Authentication` -> `URL Configuration` -> `Redirect URLs`), idagdag ang:
- `https://dumalnext-student.vercel.app/**`
- `https://dumalnext-admin.vercel.app/**`
- `https://dumalnext-teacher.vercel.app/**`
- `https://dumalnext-itsupport.vercel.app/**`

---

## Local Development (Workspaces)

```bash
# Student Portal (:3000)
npm run dev:student

# Admin Portal (:3002)
npm run dev:admin

# Teacher Portal
npm run dev:teacher

# IT Support Portal
npm run dev:it
```
