# DUMAL-NEXT: BACKEND SCHEMA & ACCESS CONTROL SPECIFICATION (BSD)

**Database Engine**: PostgreSQL 15.x on Supabase Cloud Infrastructure  
**Data Architecture**: Third Normal Form (3NF) Relational Database  
**Security Model**: Kernel-Level Row-Level Security (RLS) & Role-Based Access Control (RBAC)  
**Regulatory Compliance**: Republic Act No. 10173 (Philippine Data Privacy Act of 2012)  
**Document Version**: 1.0 (Production Specification)  

---

## 1. Database Architecture & Entity Relationships

The **Dumal-NEXT** database utilizes an **Object-Relational Inheritance Model** centered around a core `users` entity with specialized sub-tables (`students`, `teachers`, `school_administrators`, `it_support_staff`). All dates and terms are dynamically bound to `academic_terms`, eliminating hardcoded scheduling logic.

```
                    ┌────────────────────────┐
                    │         users          │
                    │  (Base Authentication) │
                    └───────────┬────────────┘
         ┌──────────────┬───────┴────────┬──────────────┐
         ▼              ▼                ▼              ▼
   ┌──────────┐   ┌──────────┐    ┌─────────────┐ ┌────────────┐
   │ students │   │ teachers │    │school_admins│ │ it_support │
   └────┬─────┘   └────┬─────┘    └──────┬──────┘ └────────────┘
        │              │                 │
        ▼              ▼                 ▼
 ┌──────────────┐ ┌──────────────┐ ┌───────────────────────────┐
 │  enrollment  │ │schedule_slots│ │      academic_terms       │
 │ applications │ └──────┬───────┘ │(Dynamic Year / Trimester) │
 └──────┬───────┘        │         └───────────────────────────┘
        ▼                ▼
 ┌──────────────┐ ┌──────────────┐
 │  documents   │ │   sections   │
 └──────────────┘ └──────────────┘
```

---

## 2. Relational Table Specifications

### 2.1. Base Entity: `users`
Central authentication directory managing credential verification and role assignment.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, default `gen_random_uuid()` | Internal user identity key. |
| `user_id` | `VARCHAR(20)`| UNIQUE, NOT NULL | Institutional DNHS user ID (e.g., `DNHS-USR-001`). |
| `email` | `VARCHAR(100)`| UNIQUE, NOT NULL | Active email address. |
| `user_role` | `VARCHAR(20)`| CHECK in (`student`, `teacher`, `admin`, `it_support`) | System access role. |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, default `NOW()` | Account creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| NOT NULL, default `NOW()` | Timestamp of last record update. |

---

### 2.2. Student Profiles: `students`
Stores official learner records conforming to the DepEd Basic Education Enrollment Form.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, default `gen_random_uuid()` | Student record ID. |
| `user_id` | `UUID` | FOREIGN KEY (`users.id`) ON DELETE CASCADE | Associated authentication record. |
| `student_id` | `VARCHAR(20)`| UNIQUE, NOT NULL | Student ID / LRN identifier. |
| `lrn` | `VARCHAR(12)`| UNIQUE, NULLABLE | 12-digit DepEd Learner Reference Number. |
| `psa_birth_cert_no`| `VARCHAR(50)`| NULLABLE | PSA Birth Certificate Registry number. |
| `first_name` | `VARCHAR(50)`| NOT NULL | Learner legal first name. |
| `middle_name` | `VARCHAR(50)`| NULLABLE | Learner legal middle name. |
| `last_name` | `VARCHAR(50)`| NOT NULL | Learner legal last name. |
| `extension_name`| `VARCHAR(10)`| NULLABLE | Name extension (Jr., III, etc.). |
| `date_of_birth`| `DATE` | NOT NULL | Learner birth date. |
| `age` | `INT` | CHECK (`age >= 10 AND age <= 30`) | Calculated learner age. |
| `gender` | `VARCHAR(10)`| CHECK (`gender IN ('Male', 'Female')`) | Learner legal gender. |
| `mother_tongue`| `VARCHAR(50)`| NULLABLE | Native language (Ilokano, Isnag, etc.). |
| `is_ip_community`| `BOOLEAN` | NOT NULL, default `FALSE` | Indigenous Peoples (IP) status. |
| `ip_community_name`| `VARCHAR(100)`| NULLABLE | Name of IP Community (e.g., Isnag). |
| `is_4ps_beneficiary`| `BOOLEAN` | NOT NULL, default `FALSE` | Pantawid Pamilyang Pilipino Program status. |
| `household_id_4ps`| `VARCHAR(30)` | NULLABLE | 16-digit 4Ps Household ID number. |
| `current_barangay`| `VARCHAR(100)`| NOT NULL | Barangay (Cabaritan, Kalabakan, Quibel, San Isidro). |
| `current_municipality`| `VARCHAR(100)`| NOT NULL, default `'Dumalneg'` | Municipality. |
| `current_province`| `VARCHAR(100)`| NOT NULL, default `'Ilocos Norte'`| Province. |
| `current_zip_code`| `VARCHAR(10)` | NOT NULL, default `'2921'` | Postal code. |
| `is_sned` | `BOOLEAN` | NOT NULL, default `FALSE` | Special Needs Education status. |
| `sned_details` | `JSONB` | default `'[]'::jsonb` | SNEd manifestation/diagnosis details. |
| `has_pwd_id` | `BOOLEAN` | NOT NULL, default `FALSE` | Official PWD card holder status. |
| `current_section_id`| `UUID` | FOREIGN KEY (`sections.id`) NULLABLE | Currently assigned class section. |

---

### 2.3. Enrollment Applications: `enrollment_applications`
Tracks formal term admission submissions, verification workflow, and Registrar remarks.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, default `gen_random_uuid()` | Application tracking ID. |
| `application_id`| `VARCHAR(30)`| UNIQUE, NOT NULL | Human-readable reference (e.g., `APP-2026-001`). |
| `student_id` | `UUID` | FOREIGN KEY (`students.id`) ON DELETE CASCADE | Submitting student record. |
| `school_year` | `VARCHAR(20)`| NOT NULL | Target School Year (e.g., `'2026-2027'`). |
| `target_grade_level`| `INT` | CHECK (`target_grade_level BETWEEN 7 AND 12`) | Requested grade level. |
| `applicant_type`| `VARCHAR(30)`| CHECK (`applicant_type IN ('New', 'Transferee', 'Continuing')`) | Applicant category. |
| `target_track` | `VARCHAR(50)`| NULLABLE | Academic or TVL track (for SHS). |
| `target_strand` | `VARCHAR(50)`| NULLABLE | Strand name (STEM, HUMSS, etc.). |
| `status` | `VARCHAR(20)`| CHECK (`status IN ('Pending', 'Approved', 'Needs Revision')`) | Evaluation state. |
| `admin_feedback`| `TEXT` | NULLABLE | Feedback/revision instructions from Registrar. |
| `selected_electives`| `JSONB` | default `'[]'::jsonb` | Chosen trimester electives & snapshot form data. |
| `section_id` | `UUID` | FOREIGN KEY (`sections.id`) NULLABLE | Section allocated upon approval. |
| `submission_date`| `TIMESTAMPTZ`| NOT NULL, default `NOW()` | Timestamp of application submission. |

---

### 2.4. Dynamic Academic Terms: `academic_terms`
Controls the school calendar dynamically without code redeployment.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, default `gen_random_uuid()` | Term ID. |
| `school_year` | `VARCHAR(20)`| NOT NULL | Academic year (e.g., `'2026-2027'`). |
| `term_number` | `INT` | CHECK (`term_number BETWEEN 1 AND 3`) | Term index (Trimester 1, 2, or 3). |
| `term_name` | `VARCHAR(50)`| NOT NULL | Display label (e.g., `'Trimester 1'`). |
| `is_active` | `BOOLEAN` | NOT NULL, default `FALSE` | Global active status flag. |
| `is_enrollment_open`| `BOOLEAN` | NOT NULL, default `TRUE` | Whether online intake is active. |
| `start_date` | `DATE` | NOT NULL | Official term start date. |
| `end_date` | `DATE` | NOT NULL | Official term end date. |

---

### 2.5. Sections & Class Quotas: `sections`
Enforces class capacity constraints and links learners to faculty advisers.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, default `gen_random_uuid()` | Section ID. |
| `section_name` | `VARCHAR(50)`| NOT NULL | Display name (e.g., `'Grade 7 - Rizal'`). |
| `grade_level` | `INT` | CHECK (`grade_level BETWEEN 7 AND 12`) | Grade level. |
| `strand` | `VARCHAR(50)`| NULLABLE | Strand name (for Senior High School). |
| `max_capacity` | `INT` | NOT NULL, default `40` | DepEd 40-learner class size ceiling. |
| `current_count`| `INT` | NOT NULL, default `0` | Active enrolled student tally. |
| `adviser_id` | `UUID` | FOREIGN KEY (`teachers.id`) NULLABLE | Assigned faculty class adviser. |
| `room_id` | `UUID` | FOREIGN KEY (`classrooms.id`) NULLABLE | Assigned default classroom. |

---

### 2.6. Master Timetable: `schedule_slots`
Stores scheduled subjects, classrooms, and teachers, validated by the Deconfliction Engine.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, default `gen_random_uuid()` | Schedule slot ID. |
| `section_id` | `UUID` | FOREIGN KEY (`sections.id`) ON DELETE CASCADE | Associated student section. |
| `subject_id` | `UUID` | FOREIGN KEY (`subjects.id`) ON DELETE CASCADE | Associated curriculum subject. |
| `teacher_id` | `UUID` | FOREIGN KEY (`teachers.id`) ON DELETE CASCADE | Assigned faculty member. |
| `classroom_id`| `UUID` | FOREIGN KEY (`classrooms.id`) ON DELETE CASCADE | Assigned classroom facility. |
| `day_of_week` | `VARCHAR(15)`| CHECK (`day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday')`) | Class day. |
| `start_time` | `TIME` | NOT NULL | Class start time. |
| `end_time` | `TIME` | NOT NULL | Class end time. |

---

## 3. Row-Level Security (RLS) & Access Control Matrix

Row-Level Security is compiled directly into the PostgreSQL kernel. No user query can circumvent these rules.

| Table Name | Public / Anon | Student Role | Teacher Role | Admin / Registrar | IT Support |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | Denied | Read/Update own record | Read own record | Read all; Create staff | Full CRUD |
| `students` | Denied | Read/Update own profile | Read enrolled learners in advisory/teaching load | Full Read/Update for admission adjudication | Read all; Audit only |
| `enrollment_applications` | Denied | Read/Create/Update own application | Read applications in assigned section | Full CRUD; Approve & set feedback remarks | Read all; Audit only |
| `sections` | Read Active | Read assigned section | Read assigned sections & schedules | Full CRUD; Allocate capacity | Full CRUD |
| `schedule_slots` | Read Active | Read assigned section timetable | Read personal teaching load timetable | Full CRUD; Run deconfliction | Full CRUD |
| `academic_terms` | Read Active | Read active term & enrollment status | Read active term | Read active term | Full CRUD; Set active term switch |
| `classrooms` | Denied | Read assigned room | Read assigned rooms | Read all facilities | Full CRUD |
| `audit_logs` | Denied | Denied | Denied | Read-Only | Read-Only |

---

## 4. Document Storage Security (`enrollment-documents`)

Client documents (PSA Birth Certificates, Form 138, ID pictures) are stored in an encrypted Supabase Storage Bucket:

1. **Storage Bucket Name**: `enrollment-documents`
2. **Access Hierarchy**:
   * **Write Access**: Restricted to authenticated users uploading into a folder corresponding to their own `cleanStudentId`:
     ```sql
     -- Storage RLS Policy (Upload):
     CREATE POLICY "Learner document upload"
     ON storage.objects FOR INSERT TO authenticated
     WITH CHECK (bucket_id = 'enrollment-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
     ```
   * **Read Access**:
     * Students may read documents within their own user folder.
     * School Administrators and Registrars hold tenant-level read access for adjudication.
     * Anonymous public access is blocked.
3. **Storage Retention & Encryption**:
   * Files encrypted at rest with AES-256.
   * Signed ephemeral URLs (expiring in 300 seconds) generated dynamically for the in-browser document preview modal.
