-- ==============================================================================
-- DUMAL-NEXT: ENROLLMENT SYSTEM FOR DUMALNEG NATIONAL HIGH SCHOOL
-- Database Schema for Supabase / PostgreSQL
-- Aligned 100% with:
-- 1. Lab Activity 4 (Class Diagram) & Lab Activity 5 (Architecture)
-- 2. DepEd ORDER No. 009, s. 2026 (Three-Term School Calendar in Basic Education)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. BASE USERS TABLE (Authentication & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" VARCHAR(20) UNIQUE NOT NULL, -- DNHS ID (e.g., DNHS-2026-001)
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "userRole" VARCHAR(50) NOT NULL CHECK ("userRole" IN ('student', 'teacher', 'admin', 'it_support')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STUDENTS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
    "studentID" VARCHAR(20) UNIQUE NOT NULL, -- LRN or DNHS Student ID
    "firstName" VARCHAR(50) NOT NULL,
    "middleName" VARCHAR(50),
    "lastName" VARCHAR(50) NOT NULL,
    "dateOfBirth" DATE,
    gender VARCHAR(10),
    "contactNumber" VARCHAR(20),
    barangay VARCHAR(100) NOT NULL, -- Dumalneg barangays (e.g., Cabaritan, Kalaw, San Isidro, Quibel)
    "gradeLevel" INT NOT NULL CHECK ("gradeLevel" BETWEEN 7 AND 12),
    strand VARCHAR(50), -- STEM, ABM, HUMSS, TVL (For Grades 11-12)
    "isReturning" BOOLEAN DEFAULT FALSE, -- True if renewed/transcribed automatically
    "currentSectionId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TEACHERS PROFILE TABLE (Faculty handling JHS & SHS cross-level loads)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
    "teacherID" VARCHAR(20) UNIQUE NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "middleName" VARCHAR(50),
    "lastName" VARCHAR(50) NOT NULL,
    department VARCHAR(20) NOT NULL CHECK (department IN ('JHS', 'SHS', 'CROSS_LEVEL')),
    email VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SCHOOL ADMINISTRATORS TABLE
CREATE TABLE IF NOT EXISTS public.school_administrators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
    "adminID" VARCHAR(20) UNIQUE NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    department VARCHAR(50) DEFAULT 'Academic Affairs',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. IT SUPPORT TABLE
CREATE TABLE IF NOT EXISTS public.it_supports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
    "itsupportID" VARCHAR(20) UNIQUE NOT NULL,
    "systemRole" VARCHAR(50) DEFAULT 'System Administrator',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ACADEMIC TERMS TABLE (DepEd Order No. 009, s. 2026 Three-Term Calendar)
CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "schoolYear" VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    "termNumber" INT NOT NULL CHECK ("termNumber" IN (1, 2, 3)),
    "termName" VARCHAR(50) NOT NULL,
    "totalClassDays" INT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "openingBlockStart" DATE,
    "openingBlockEnd" DATE,
    "instructionalStart" DATE NOT NULL,
    "instructionalEnd" DATE NOT NULL,
    "endOfTermStart" DATE NOT NULL,
    "endOfTermEnd" DATE NOT NULL,
    "summative1Date" DATE,
    "summative2Date" DATE, -- Term 1 Summative 2 is the hard cutoff date for Late Enrollment
    "termExamDates" VARCHAR(100),
    "reportCardDate" DATE NOT NULL, -- PTA Meeting & Report Card distribution
    "isActive" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_sy_term UNIQUE ("schoolYear", "termNumber")
);

-- 8. SECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sectionId" VARCHAR(20) UNIQUE NOT NULL,
    "sectionName" TEXT NOT NULL,
    "gradeLevel" INT NOT NULL CHECK ("gradeLevel" BETWEEN 7 AND 12),
    strand VARCHAR(50), -- Nullable for JHS (7-10), populated for SHS (11-12)
    capacity INT NOT NULL DEFAULT 40,
    "schoolYear" VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "classroomId" VARCHAR(20) UNIQUE NOT NULL,
    "roomName" TEXT NOT NULL,
    building TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. COURSE SUBJECTS TABLE (DepEd 2026 Curriculum & Max 5 Core Subjects for SHS)
CREATE TABLE IF NOT EXISTS public.course_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "subjectCode" VARCHAR(20) UNIQUE NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectType" VARCHAR(20) NOT NULL CHECK ("subjectType" IN ('Core', 'Elective', 'Applied', 'Specialized', 'Intervention')),
    "gradeLevel" INT NOT NULL CHECK ("gradeLevel" BETWEEN 7 AND 12),
    trimester INT NOT NULL CHECK (trimester IN (1, 2, 3)), -- Term 1, 2, or 3
    strand VARCHAR(50), -- Specific to SHS strand (STEM, TVL, HUMSS) or General
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. CLASS SCHEDULES TABLE (Hub for Automated Schedule Deconfliction Engine)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "scheduleId" VARCHAR(30) UNIQUE NOT NULL,
    "subjectCode" VARCHAR(20) NOT NULL REFERENCES public.course_subjects("subjectCode") ON DELETE CASCADE,
    "sectionId" UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    "teacherId" UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    "classroomId" UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE RESTRICT,
    "dayOfWeek" VARCHAR(10) NOT NULL CHECK ("dayOfWeek" IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    trimester INT NOT NULL CHECK (trimester IN (1, 2, 3)),
    "schoolYear" VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_time_order CHECK ("startTime" < "endTime")
);

-- 12. ENROLLMENT APPLICATIONS TABLE (With Late Enrollment & DepEd Guidelines)
CREATE TABLE IF NOT EXISTS public.enrollment_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "applicationId" VARCHAR(30) UNIQUE NOT NULL,
    "studentId" UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    "applicantType" VARCHAR(20) NOT NULL CHECK ("applicantType" IN ('Grade 7', 'Grade 11', 'Transferee', 'Returning')),
    "schoolYear" VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    "targetGradeLevel" INT NOT NULL CHECK ("targetGradeLevel" BETWEEN 7 AND 12),
    "targetStrand" VARCHAR(50), -- For SHS
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Needs Revision')),
    "isLateEnrollee" BOOLEAN DEFAULT FALSE,
    "submittedDocuments" JSONB DEFAULT '[]'::jsonb, -- S3 Bucket keys: birth_certificate, form_137, id_picture
    "selectedElectives" JSONB DEFAULT '[]'::jsonb, -- Cross-strand electives
    "adminFeedback" TEXT, -- Note if "Needs Revision"
    "reviewedBy" UUID REFERENCES public.school_administrators(id),
    "submissionDate" DATE DEFAULT CURRENT_DATE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. ROW-LEVEL SECURITY (RLS) & POLICIES SETUP
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_applications ENABLE ROW LEVEL SECURITY;

-- Standard Permissive Policies for Capstone Development & Testing
CREATE POLICY "Allow public read on academic_terms" ON public.academic_terms FOR SELECT USING (true);
CREATE POLICY "Allow public read on sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Allow public read on classrooms" ON public.classrooms FOR SELECT USING (true);
CREATE POLICY "Allow public read on course_subjects" ON public.course_subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read on class_schedules" ON public.class_schedules FOR SELECT USING (true);
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on school_administrators" ON public.school_administrators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on it_supports" ON public.it_supports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on enrollment_applications" ON public.enrollment_applications FOR ALL USING (true) WITH CHECK (true);

-- 14. STORAGE BUCKETS SETUP
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('student-ids', 'student-ids', true),
    ('documents', 'documents', false),
    ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 15. SEED DATA: OFFICIAL DEPED ORDER NO. 009, S. 2026 ACADEMIC TERMS
INSERT INTO public.academic_terms (
    "schoolYear", "termNumber", "termName", "totalClassDays",
    "startDate", "endDate", "openingBlockStart", "openingBlockEnd",
    "instructionalStart", "instructionalEnd", "endOfTermStart", "endOfTermEnd",
    "summative1Date", "summative2Date", "termExamDates", "reportCardDate", "isActive"
) VALUES 
(
    '2026-2027', 1, 'Term 1', 69,
    '2026-06-08', '2026-09-15', '2026-06-08', '2026-06-11',
    '2026-06-15', '2026-09-01', '2026-09-02', '2026-09-15',
    '2026-07-06', '2026-07-28', 'August 28 & September 1, 2026', '2026-09-09', TRUE
),
(
    '2026-2027', 2, 'Term 2', 65,
    '2026-09-16', '2026-12-18', NULL, NULL,
    '2026-09-16', '2026-12-04', '2026-12-07', '2026-12-18',
    '2026-10-07', '2026-10-29', 'December 3-4, 2026', '2026-12-15', FALSE
),
(
    '2026-2027', 3, 'Term 3', 67,
    '2027-01-04', '2027-04-08', NULL, NULL,
    '2027-01-04', '2027-03-23', '2027-03-24', '2027-04-08',
    '2027-01-25', '2027-02-16', 'March 15-16 (Graduating) / March 22-23 (Others)', '2027-04-08', FALSE
)
ON CONFLICT ("schoolYear", "termNumber") DO UPDATE SET
    "totalClassDays" = EXCLUDED."totalClassDays",
    "startDate" = EXCLUDED."startDate",
    "endDate" = EXCLUDED."endDate",
    "reportCardDate" = EXCLUDED."reportCardDate";

-- 16. SEED DATA: OFFICIAL DEPED 2026 CURRICULUM SUBJECTS
-- Key Stage 3: Junior High School (Grades 7 to 10 - Table 5)
INSERT INTO public.course_subjects ("subjectCode", "subjectName", "subjectType", "gradeLevel", trimester, strand) VALUES
('JHS-VAL7-T1', 'Values Education (EsP)', 'Core', 7, 1, NULL),
('JHS-FIL7-T1', 'Filipino', 'Core', 7, 1, NULL),
('JHS-ENG7-T1', 'English', 'Core', 7, 1, NULL),
('JHS-SCI7-T1', 'Science', 'Core', 7, 1, NULL),
('JHS-MTH7-T1', 'Mathematics', 'Core', 7, 1, NULL),
('JHS-AP7-T1', 'Araling Panlipunan', 'Core', 7, 1, NULL),
('JHS-TLE7-T1', 'EPP / TLE (Technology & Livelihood Education)', 'Core', 7, 1, NULL),
('JHS-MAP7-T1', 'MAPEH (Music, Arts, PE, Health)', 'Core', 7, 1, NULL),
('JHS-ARAL7-T1', 'ARAL Program (Academic Recovery)', 'Intervention', 7, 1, NULL),
('JHS-HOME7-T1', 'Homeroom and Guidance Program', 'Core', 7, 1, NULL)
ON CONFLICT ("subjectCode") DO NOTHING;

-- Key Stage 4: Senior High School (Grades 11 & 12 - Table 6: Max 5 Core Subjects per Trisem)
INSERT INTO public.course_subjects ("subjectCode", "subjectName", "subjectType", "gradeLevel", trimester, strand) VALUES
('SHS-GMATH11-T1', 'General Mathematics', 'Core', 11, 1, NULL),
('SHS-GSCI11-T1', 'General Science', 'Core', 11, 1, NULL),
('SHS-EFFCOM11-T1', 'Effective Communication / Mabisang Komunikasyon', 'Core', 11, 1, NULL),
('SHS-KASAY11-T1', 'Pag-aaral ng Kasaysayan at Lipunang Pilipino', 'Core', 11, 1, NULL),
('SHS-LCSKILLS11-T1', 'Life & Career Skills', 'Core', 11, 1, NULL),
-- Electives (Cross-Strand)
('SHS-HUMMOV11-T1', 'Human Movement 1 (PE & Health Elective)', 'Elective', 11, 1, 'General'),
('SHS-PROG11-T1', 'Introduction to Programming & Computing', 'Elective', 11, 1, 'TVL'),
('SHS-JOURN11-T1', 'Creative Writing & Journalism', 'Elective', 11, 1, 'HUMSS'),
('SHS-PRECALC11-T1', 'Pre-Calculus & STEM Principles', 'Elective', 11, 1, 'STEM'),
('SHS-ARAL11-T1', 'ARAL Program (Senior High Academic Recovery)', 'Intervention', 11, 1, NULL),
('SHS-HOME11-T1', 'Homeroom and Guidance Program', 'Core', 11, 1, NULL)
ON CONFLICT ("subjectCode") DO NOTHING;

-- Default Sections
INSERT INTO public.sections ("sectionId", "sectionName", "gradeLevel", strand, capacity) VALUES
('SEC-G7-RIZAL', 'Grade 7 - Rizal', 7, NULL, 40),
('SEC-G7-BONIFACIO', 'Grade 7 - Bonifacio', 7, NULL, 40),
('SEC-G8-MABINI', 'Grade 8 - Mabini', 8, NULL, 40),
('SEC-G9-LUNA', 'Grade 9 - Luna', 9, NULL, 40),
('SEC-G10-DELPILAR', 'Grade 10 - Del Pilar', 10, NULL, 40),
('SEC-G11-STEM-A', 'Grade 11 - STEM A', 11, 'STEM', 35),
('SEC-G11-TVL-A', 'Grade 11 - TVL A', 11, 'TVL', 35),
('SEC-G11-HUMSS-A', 'Grade 11 - HUMSS A', 11, 'HUMSS', 35),
('SEC-G12-STEM-A', 'Grade 12 - STEM A', 12, 'STEM', 35),
('SEC-G12-TVL-A', 'Grade 12 - TVL A', 12, 'TVL', 35)
ON CONFLICT ("sectionId") DO NOTHING;

-- Default Classrooms
INSERT INTO public.classrooms ("classroomId", "roomName", building, capacity) VALUES
('RM-101', 'Room 101 - General Academic', 'Main Academic Building', 45),
('RM-102', 'Room 102 - General Academic', 'Main Academic Building', 45),
('RM-201', 'Room 201 - Science Laboratory', 'Science Building', 40),
('RM-202', 'Room 202 - Computer Laboratory', 'IT Building', 40),
('RM-301', 'Room 301 - TVL Workshop', 'Vocational Building', 35)
ON CONFLICT ("classroomId") DO NOTHING;
