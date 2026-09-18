-- ==============================================================================
-- DUMAL-NEXT: ENROLLMENT SYSTEM FOR DUMALNEG NATIONAL HIGH SCHOOL
-- Database Schema for Supabase / PostgreSQL
-- Based strictly on:
-- 1. Lab Activity 4 (Class Diagram) & Lab Activity 5 (Architecture)
-- 2. Dynamic Academic Calendar Configuration (Managed by IT Support / Admin)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. BASE USERS TABLE (Authentication & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" VARCHAR(20) UNIQUE NOT NULL, -- DNHS ID (e.g., DNHS-USR-001)
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "userRole" VARCHAR(50) NOT NULL CHECK ("userRole" IN ('student', 'teacher', 'admin', 'it_support')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STUDENTS PROFILE TABLE (Aligned with DepEd Basic Education Enrollment Form Revised 06/01/2025)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
    "studentID" VARCHAR(20) UNIQUE NOT NULL, -- DNHS Student ID or LRN
    "lrn" VARCHAR(12), -- 12-digit DepEd Learner Reference Number
    "psaBirthCertNo" VARCHAR(50),
    "firstName" VARCHAR(50) NOT NULL,
    "middleName" VARCHAR(50),
    "lastName" VARCHAR(50) NOT NULL,
    "extensionName" VARCHAR(10), -- Jr., III, IV, etc.
    "dateOfBirth" DATE,
    age INT,
    gender VARCHAR(10), -- Male / Female
    "placeOfBirth" VARCHAR(100),
    religion VARCHAR(50),
    "motherTongue" VARCHAR(50),
    "contactNumber" VARCHAR(20),
    
    -- Indigenous Peoples (IP) Data (Vital for Dumalneg Ancestral Domain)
    "isIpCommunity" BOOLEAN DEFAULT FALSE,
    "ipCommunityName" VARCHAR(100), -- e.g., Isnag/Isneg, Tingguian/Itneg
    
    -- 4Ps Beneficiary Information
    "is4psBeneficiary" BOOLEAN DEFAULT FALSE,
    "householdId4ps" VARCHAR(30), -- 16-digit 4Ps Household ID
    
    -- Current Residential Address
    "currentHouseNo" VARCHAR(50),
    "currentSitio" VARCHAR(100),
    "currentBarangay" VARCHAR(100) NOT NULL DEFAULT 'Cabaritan', -- Cabaritan, Kalabakan, Quibel, San Isidro
    "currentMunicipality" VARCHAR(100) NOT NULL DEFAULT 'Dumalneg',
    "currentProvince" VARCHAR(100) NOT NULL DEFAULT 'Ilocos Norte',
    "currentCountry" VARCHAR(50) NOT NULL DEFAULT 'Philippines',
    "currentZipCode" VARCHAR(10) NOT NULL DEFAULT '2921',
    barangay VARCHAR(100) NOT NULL DEFAULT 'Cabaritan', -- Legacy backward compatibility
    
    -- Permanent Residential Address
    "isPermanentSameAsCurrent" BOOLEAN DEFAULT TRUE,
    "permanentHouseNo" VARCHAR(50),
    "permanentSitio" VARCHAR(100),
    "permanentBarangay" VARCHAR(100),
    "permanentMunicipality" VARCHAR(100),
    "permanentProvince" VARCHAR(100),
    "permanentCountry" VARCHAR(50),
    "permanentZipCode" VARCHAR(10),
    
    -- Parents & Legal Guardian Details
    "fatherLastName" VARCHAR(50),
    "fatherFirstName" VARCHAR(50),
    "fatherMiddleName" VARCHAR(50),
    "fatherContactNumber" VARCHAR(20),
    
    "motherMaidenLastName" VARCHAR(50),
    "motherFirstName" VARCHAR(50),
    "motherMiddleName" VARCHAR(50),
    "motherContactNumber" VARCHAR(20),
    
    "guardianLastName" VARCHAR(50),
    "guardianFirstName" VARCHAR(50),
    "guardianMiddleName" VARCHAR(50),
    "guardianContactNumber" VARCHAR(20),
    
    -- Special Needs Education (SNEd) Program
    "isSned" BOOLEAN DEFAULT FALSE,
    "snedCategory" VARCHAR(50), -- 'Diagnosis' or 'Manifestations'
    "snedDetails" JSONB DEFAULT '[]'::jsonb, -- Array of selected diagnosed conditions or manifestations
    "hasPwdId" BOOLEAN DEFAULT FALSE,
    
    -- Academic Placement
    "gradeLevel" INT NOT NULL CHECK ("gradeLevel" BETWEEN 7 AND 12),
    strand VARCHAR(50), -- STEM, TVL, HUMSS, ABM (For Grades 11-12)
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

-- 7. ACADEMIC TERMS TABLE (Dynamic Calendar Configured by IT Support)
-- No hardcoded dates: IT Support sets schoolYear, start/end dates, and trisem configuration
CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "schoolYear" VARCHAR(20) NOT NULL, -- e.g., '2026-2027', '2027-2028'
    "termNumber" INT NOT NULL CHECK ("termNumber" IN (1, 2, 3)), -- Trimester 1, 2, or 3
    "termName" VARCHAR(50) NOT NULL,
    "totalClassDays" INT,
    "startDate" DATE,
    "endDate" DATE,
    "openingBlockStart" DATE,
    "openingBlockEnd" DATE,
    "instructionalStart" DATE,
    "instructionalEnd" DATE,
    "endOfTermStart" DATE,
    "endOfTermEnd" DATE,
    "summative1Date" DATE,
    "summative2Date" DATE, -- Late Enrollment Cutoff Date configured by IT Support
    "termExamDates" VARCHAR(100),
    "reportCardDate" DATE,
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
    "schoolYear" VARCHAR(20) NOT NULL,
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

-- 10. COURSE SUBJECTS TABLE (Supporting Trisem & Max 5 Core for SHS)
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
    "schoolYear" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_time_order CHECK ("startTime" < "endTime")
);

-- 12. ENROLLMENT APPLICATIONS TABLE (DepEd Basic Education Enrollment Form Aligned)
CREATE TABLE IF NOT EXISTS public.enrollment_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "applicationId" VARCHAR(30) UNIQUE NOT NULL,
    "studentId" UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    "applicantType" VARCHAR(20) NOT NULL CHECK ("applicantType" IN ('Grade 7', 'Grade 11', 'Transferee', 'Returning')),
    "schoolYear" VARCHAR(20) NOT NULL,
    "isGraded" BOOLEAN DEFAULT TRUE, -- Graded vs Non-Graded (SNEd)
    "targetGradeLevel" INT NOT NULL CHECK ("targetGradeLevel" BETWEEN 7 AND 12),
    "targetTrack" VARCHAR(50), -- Academic, TVL
    "targetStrand" VARCHAR(50), -- For SHS: STEM, HUMSS, TVL-Agri-Fishery, TVL-ICT, TVL-HE
    
    -- Returning Learner (Balik-Aral) and Transferee / Move-In History
    "lastGradeCompleted" INT,
    "lastSchoolYearCompleted" VARCHAR(20),
    "lastSchoolAttended" VARCHAR(150),
    "lastSchoolId" VARCHAR(10), -- 6-digit DepEd School ID
    
    -- Distance Learning Modality Preferences (Section 8)
    "preferredModalities" JSONB DEFAULT '[]'::jsonb, -- e.g. ['Blended', 'Modular (Print)', 'Online']
    
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Needs Revision')),
    "isLateEnrollee" BOOLEAN DEFAULT FALSE,
    "submittedDocuments" JSONB DEFAULT '[]'::jsonb, -- S3 Bucket keys: birth_certificate, form_138, id_picture
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

-- Permissive Development Policies
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
CREATE POLICY "Allow all on academic_terms mutations" ON public.academic_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on enrollment_applications" ON public.enrollment_applications FOR ALL USING (true) WITH CHECK (true);

-- 14. STORAGE BUCKETS SETUP
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('student-ids', 'student-ids', true),
    ('documents', 'documents', false),
    ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 15. DEFAULT SUBJECT TEMPLATES (Curriculum structure only, no hardcoded calendar dates)
-- Junior High School (Grades 7 to 10)
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

-- Senior High School (Grades 11 & 12: Max 5 Core Subjects + Cross-Strand Electives)
INSERT INTO public.course_subjects ("subjectCode", "subjectName", "subjectType", "gradeLevel", trimester, strand) VALUES
('SHS-GMATH11-T1', 'General Mathematics', 'Core', 11, 1, NULL),
('SHS-GSCI11-T1', 'General Science', 'Core', 11, 1, NULL),
('SHS-EFFCOM11-T1', 'Effective Communication / Mabisang Komunikasyon', 'Core', 11, 1, NULL),
('SHS-KASAY11-T1', 'Pag-aaral ng Kasaysayan at Lipunang Pilipino', 'Core', 11, 1, NULL),
('SHS-LCSKILLS11-T1', 'Life & Career Skills', 'Core', 11, 1, NULL),
('SHS-HUMMOV11-T1', 'Human Movement 1 (PE & Health Elective)', 'Elective', 11, 1, 'General'),
('SHS-PROG11-T1', 'Introduction to Programming & Computing', 'Elective', 11, 1, 'TVL'),
('SHS-JOURN11-T1', 'Creative Writing & Journalism', 'Elective', 11, 1, 'HUMSS'),
('SHS-PRECALC11-T1', 'Pre-Calculus & STEM Principles', 'Elective', 11, 1, 'STEM'),
('SHS-ARAL11-T1', 'ARAL Program (Senior High Academic Recovery)', 'Intervention', 11, 1, NULL),
('SHS-HOME11-T1', 'Homeroom and Guidance Program', 'Core', 11, 1, NULL)
ON CONFLICT ("subjectCode") DO NOTHING;

-- Default Classrooms
INSERT INTO public.classrooms ("classroomId", "roomName", building, capacity) VALUES
('RM-101', 'Room 101 - General Academic', 'Main Academic Building', 45),
('RM-102', 'Room 102 - General Academic', 'Main Academic Building', 45),
('RM-201', 'Room 201 - Science Laboratory', 'Science Building', 40),
('RM-202', 'Room 202 - Computer Laboratory', 'IT Building', 40),
('RM-301', 'Room 301 - TVL Workshop', 'Vocational Building', 35)
ON CONFLICT ("classroomId") DO NOTHING;
