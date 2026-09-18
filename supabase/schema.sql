-- ==============================================================================
-- DUMAL-NEXT: ENROLLMENT SYSTEM FOR DUMALNEG NATIONAL HIGH SCHOOL
-- Database Schema for Supabase / PostgreSQL
-- Based strictly on Lab Activity 4 (Class Diagram) & Activity 5 (Architecture)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. BASE USERS TABLE (Authentication & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(20) UNIQUE NOT NULL, -- DNHS ID (e.g., DNHS-2026-001)
    email VARCHAR(100) UNIQUE NOT NULL,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('student', 'teacher', 'admin', 'it_support')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STUDENTS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id VARCHAR(20) UNIQUE NOT NULL, -- LRN or DNHS Student ID
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    contact_number VARCHAR(20),
    barangay VARCHAR(100) NOT NULL, -- Dumalneg barangays (e.g., Cabaritan, Kalaw, San Isidro, Quibel)
    grade_level INT NOT NULL CHECK (grade_level BETWEEN 7 AND 12),
    strand VARCHAR(50), -- STEM, ABM, HUMSS, TVL (Required if Grade 11 or 12)
    is_returning BOOLEAN DEFAULT FALSE, -- True if renewed/transcribed automatically
    current_section_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TEACHERS PROFILE TABLE (Faculty handling JHS & SHS cross-level loads)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    department VARCHAR(20) NOT NULL CHECK (department IN ('JHS', 'SHS', 'CROSS_LEVEL')),
    email VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SCHOOL ADMINISTRATORS TABLE
CREATE TABLE IF NOT EXISTS public.school_administrators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    admin_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    department VARCHAR(50) DEFAULT 'Academic Affairs',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. IT SUPPORT TABLE
CREATE TABLE IF NOT EXISTS public.it_supports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    itsupport_id VARCHAR(20) UNIQUE NOT NULL,
    system_role VARCHAR(50) DEFAULT 'System Administrator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. SECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_name VARCHAR(50) NOT NULL,
    grade_level INT NOT NULL CHECK (grade_level BETWEEN 7 AND 12),
    strand VARCHAR(50), -- Nullable for JHS (7-10), populated for SHS (11-12)
    capacity INT NOT NULL DEFAULT 40,
    school_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id VARCHAR(20) UNIQUE NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    building VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 40,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. COURSE SUBJECTS TABLE (Supporting Trimestral & Core Subject Limits)
CREATE TABLE IF NOT EXISTS public.course_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('Core', 'Elective', 'Applied', 'Specialized')),
    grade_level INT NOT NULL CHECK (grade_level BETWEEN 7 AND 12),
    trimester INT NOT NULL CHECK (trimester IN (1, 2, 3)), -- 1st, 2nd, 3rd Trimester
    strand VARCHAR(50), -- Specific to SHS strand, or General
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. CLASS SCHEDULES TABLE (Hub for Automated Schedule Deconfliction Engine)
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_code VARCHAR(30) UNIQUE NOT NULL,
    subject_code VARCHAR(20) NOT NULL REFERENCES public.course_subjects(subject_code) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE RESTRICT,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    trimester INT NOT NULL CHECK (trimester IN (1, 2, 3)),
    school_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_time_order CHECK (start_time < end_time)
);

-- 11. ENROLLMENT APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.enrollment_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id VARCHAR(30) UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    applicant_type VARCHAR(20) NOT NULL CHECK (applicant_type IN ('Grade 7', 'Grade 11', 'Transferee', 'Returning')),
    school_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    target_grade_level INT NOT NULL CHECK (target_grade_level BETWEEN 7 AND 12),
    target_strand VARCHAR(50), -- For SHS
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Needs Revision')),
    submitted_documents JSONB DEFAULT '[]'::jsonb, -- S3 Bucket keys: birth_certificate, form_137, id_picture
    selected_electives JSONB DEFAULT '[]'::jsonb, -- Array of elective subject codes (Cross-strand)
    admin_feedback TEXT, -- Reason when marked as "Needs Revision"
    reviewed_by UUID REFERENCES public.school_administrators(id),
    submission_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. ROW-LEVEL SECURITY (RLS) & POLICIES SETUP
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_applications ENABLE ROW LEVEL SECURITY;

-- Standard Permissive Policies for Capstone Project Testing
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

-- 13. STORAGE BUCKETS SETUP (For S3 Compatible Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('student-ids', 'student-ids', true),
    ('documents', 'documents', false),
    ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 14. SEED INITIAL DATA (Dumalneg National High School Defaults)
-- Sections
INSERT INTO public.sections (section_name, grade_level, strand, capacity) VALUES
('Grade 7 - Rizal', 7, NULL, 40),
('Grade 7 - Bonifacio', 7, NULL, 40),
('Grade 8 - Mabini', 8, NULL, 40),
('Grade 9 - Luna', 9, NULL, 40),
('Grade 10 - Del Pilar', 10, NULL, 40),
('Grade 11 - STEM A', 11, 'STEM', 35),
('Grade 11 - TVL A', 11, 'TVL', 35),
('Grade 11 - HUMSS A', 11, 'HUMSS', 35),
('Grade 12 - STEM A', 12, 'STEM', 35),
('Grade 12 - TVL A', 12, 'TVL', 35)
ON CONFLICT DO NOTHING;

-- Classrooms
INSERT INTO public.classrooms (classroom_id, room_name, building, capacity) VALUES
('RM-101', 'Room 101', 'Main Academic Building', 45),
('RM-102', 'Room 102', 'Main Academic Building', 45),
('RM-201', 'Room 201 - Science Lab', 'Science Building', 40),
('RM-202', 'Room 202 - Computer Lab', 'IT Building', 40),
('RM-301', 'Room 301 - TVL Workshop', 'Vocational Building', 35)
ON CONFLICT (classroom_id) DO NOTHING;

-- Course Subjects (Trisem Sample)
INSERT INTO public.course_subjects (subject_code, subject_name, subject_type, grade_level, trimester, strand) VALUES
-- JHS Subjects (Trisem 1)
('JHS-ENG7-T1', 'English 7 (Trimester 1)', 'Core', 7, 1, NULL),
('JHS-MTH7-T1', 'Mathematics 7 (Trimester 1)', 'Core', 7, 1, NULL),
('JHS-SCI7-T1', 'Science 7 (Trimester 1)', 'Core', 7, 1, NULL),
('JHS-FIL7-T1', 'Filipino 7 (Trimester 1)', 'Core', 7, 1, NULL),
('JHS-AP7-T1', 'Araling Panlipunan 7 (Trimester 1)', 'Core', 7, 1, NULL),
-- SHS Grade 11 Core Subjects (Trisem 1 - Max 5 Core Subjects per Trisem rule)
('SHS-ORAL11-T1', 'Oral Communication in Context', 'Core', 11, 1, NULL),
('SHS-KOM11-T1', 'Komunikasyon at Pananaliksik', 'Core', 11, 1, NULL),
('SHS-GENM11-T1', 'General Mathematics', 'Core', 11, 1, NULL),
('SHS-EARTH11-T1', 'Earth and Life Science', 'Core', 11, 1, NULL),
('SHS-PE11-T1', 'Physical Education and Health 1', 'Core', 11, 1, NULL),
-- SHS Electives (Cross-strand available)
('ELEC-PROG11-T1', 'Introduction to Computer Programming', 'Elective', 11, 1, 'TVL'),
('ELEC-JOURN11-T1', 'Campus Journalism & Creative Writing', 'Elective', 11, 1, 'HUMSS'),
('ELEC-ENGR11-T1', 'Pre-Calculus & Engineering Principles', 'Elective', 11, 1, 'STEM')
ON CONFLICT (subject_code) DO NOTHING;
