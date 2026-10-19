-- ==============================================================================
-- DUMAL-NEXT: ONE-CLICK DUMMY ACCOUNTS SEED SCRIPT (TEACHERS & STUDENTS)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fvybtqghtuarjzlpbwnr/sql
-- ==============================================================================
-- Safe & Idempotent: Can be re-run at any time without duplicate key errors.
-- Default Teacher Password:  Teacher@123
-- Default Student Password:  Student@123
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
  v_teacher_pw  TEXT := extensions.crypt('Teacher@123', extensions.gen_salt('bf'));
  v_student_pw  TEXT := extensions.crypt('Student@123', extensions.gen_salt('bf'));

  -- Teacher UUIDs
  v_tch1_uid UUID := '11111111-1111-4111-8111-111111111101';
  v_tch2_uid UUID := '11111111-1111-4111-8111-111111111102';
  v_tch3_uid UUID := '11111111-1111-4111-8111-111111111103';
  v_tch4_uid UUID := '11111111-1111-4111-8111-111111111104';
  v_tch5_uid UUID := '11111111-1111-4111-8111-111111111105';

  -- Student Auth User UUIDs
  v_stu1_uid UUID := '22222222-2222-4222-8222-222222222201';
  v_stu2_uid UUID := '22222222-2222-4222-8222-222222222202';
  v_stu3_uid UUID := '22222222-2222-4222-8222-222222222203';
  v_stu4_uid UUID := '22222222-2222-4222-8222-222222222204';
  v_stu5_uid UUID := '22222222-2222-4222-8222-222222222205';
  v_stu6_uid UUID := '22222222-2222-4222-8222-222222222206';

  -- Student Profile Primary Key UUIDs
  v_stu1_pid UUID := '33333333-3333-4333-8333-333333333301';
  v_stu2_pid UUID := '33333333-3333-4333-8333-333333333302';
  v_stu3_pid UUID := '33333333-3333-4333-8333-333333333303';
  v_stu4_pid UUID := '33333333-3333-4333-8333-333333333304';
  v_stu5_pid UUID := '33333333-3333-4333-8333-333333333305';
  v_stu6_pid UUID := '33333333-3333-4333-8333-333333333306';

  rec RECORD;
BEGIN
  -- ============================================================================
  -- 1. SEED 5 DUMMY FACULTY / TEACHER ACCOUNTS
  -- ============================================================================
  FOR rec IN
    SELECT * FROM (VALUES
      (v_tch1_uid, 'DNHS-TCH-101', 'teacher.santos@dnhs.edu.ph',   'Maria',   'Elena',   'Santos',    'JHS'),
      (v_tch2_uid, 'DNHS-TCH-102', 'teacher.agbayani@dnhs.edu.ph', 'Roberto', 'Marcos',  'Agbayani',  'SHS'),
      (v_tch3_uid, 'DNHS-TCH-103', 'teacher.corpus@dnhs.edu.ph',   'Lorna',   'Valdez',  'Corpus',    'CROSS_LEVEL'),
      (v_tch4_uid, 'DNHS-TCH-104', 'teacher.dumlao@dnhs.edu.ph',   'Jerome',  'Pascua',  'Dumlao',    'JHS'),
      (v_tch5_uid, 'DNHS-TCH-105', 'teacher.balisacan@dnhs.edu.ph','Grace',   'agcaoili','Balisacan', 'SHS')
    ) AS t(uid, code, email, fname, mname, lname, dept)
  LOOP
    -- Reuse existing auth.users UUID if email already exists
    SELECT id INTO rec.uid FROM auth.users WHERE email = rec.email LIMIT 1;
    IF rec.uid IS NULL THEN
      rec.uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        v_instance_id, rec.uid, 'authenticated', 'authenticated', rec.email, v_teacher_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'first_name', rec.fname,
          'last_name', rec.lname,
          'full_name', rec.fname || ' ' || rec.lname,
          'role', 'teacher'
        ),
        now(), now(),
        '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), rec.uid, rec.uid::text,
        jsonb_build_object(
          'sub', rec.uid::text,
          'email', rec.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email', now(), now(), now()
      );
    ELSE
      -- Update password & ensure confirmed
      UPDATE auth.users
      SET encrypted_password = v_teacher_pw,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          confirmation_token = COALESCE(confirmation_token, ''),
          email_change = COALESCE(email_change, ''),
          email_change_token_new = COALESCE(email_change_token_new, ''),
          recovery_token = COALESCE(recovery_token, ''),
          updated_at = now()
      WHERE id = rec.uid;
    END IF;

    -- Upsert into public.users
    INSERT INTO public.users (id, user_id, email, user_role)
    VALUES (rec.uid, rec.code, rec.email, 'teacher')
    ON CONFLICT (email) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          user_role = 'teacher';

    -- Upsert into public.teachers
    IF EXISTS (SELECT 1 FROM public.teachers WHERE email = rec.email OR teacher_id = rec.code) THEN
      UPDATE public.teachers
      SET user_id = rec.uid,
          first_name = rec.fname,
          middle_name = rec.mname,
          last_name = rec.lname,
          department = rec.dept,
          email = rec.email
      WHERE email = rec.email OR teacher_id = rec.code;
    ELSE
      INSERT INTO public.teachers (user_id, teacher_id, first_name, middle_name, last_name, department, email)
      VALUES (rec.uid, rec.code, rec.fname, rec.mname, rec.lname, rec.dept, rec.email);
    END IF;
  END LOOP;

  -- ============================================================================
  -- 2. SEED 6 DUMMY STUDENT / LEARNER ACCOUNTS + SAMPLE ENROLLMENT APPLICATIONS
  -- ============================================================================
  FOR rec IN
    SELECT * FROM (VALUES
      (
        v_stu1_uid, v_stu1_pid, 'DNHS-STU-20001', '100050260001',
        'student.juan@gmail.com', 'Juan', 'Mateo', 'Dela Cruz',
        '2013-05-14'::date, 'Male', '09171001001', 'Cabaritan',
        7, NULL, 'Grade 7', 'Approved', 'DNHS-2026-9001'
      ),
      (
        v_stu2_uid, v_stu2_pid, 'DNHS-STU-20002', '100050260002',
        'student.maria@gmail.com', 'Maria', 'Clara', 'Bautista',
        '2011-08-22'::date, 'Female', '09171001002', 'Kalabakan',
        9, NULL, 'Returning', 'Approved', 'DNHS-2026-9002'
      ),
      (
        v_stu3_uid, v_stu3_pid, 'DNHS-STU-20003', '100050260003',
        'student.carlo@gmail.com', 'Carlo', 'Ramos', 'Villanueva',
        '2010-11-03'::date, 'Male', '09171001003', 'Quibel',
        10, NULL, 'Returning', 'Pending', 'DNHS-2026-9003'
      ),
      (
        v_stu4_uid, v_stu4_pid, 'DNHS-STU-20004', '100050260004',
        'student.angela@gmail.com', 'Angela', 'Joy', 'Tolentino',
        '2009-02-19'::date, 'Female', '09171001004', 'San Isidro',
        11, 'STEM', 'Grade 11', 'Approved', 'DNHS-2026-9004'
      ),
      (
        v_stu5_uid, v_stu5_pid, 'DNHS-STU-20005', '100050260005',
        'student.mark@gmail.com', 'Mark', 'Anthony', 'Pascual',
        '2009-07-30'::date, 'Male', '09171001005', 'Cabaritan',
        11, 'HUMSS', 'Grade 11', 'Pending', 'DNHS-2026-9005'
      ),
      (
        v_stu6_uid, v_stu6_pid, 'DNHS-STU-20006', '100050260006',
        'student.bianca@gmail.com', 'Bianca', 'Mae', 'Lacson',
        '2008-12-10'::date, 'Female', '09171001006', 'Kalabakan',
        12, 'TVL', 'Returning', 'Needs Revision', 'DNHS-2026-9006'
      )
    ) AS s(uid, pid, user_code, lrn, email, fname, mname, lname, dob, gender, contact, brgy, grade, strand, app_type, app_status, app_ref)
  LOOP
    -- Reuse existing auth.users UUID if email already exists
    SELECT id INTO rec.uid FROM auth.users WHERE email = rec.email LIMIT 1;
    IF rec.uid IS NULL THEN
      rec.uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        v_instance_id, rec.uid, 'authenticated', 'authenticated', rec.email, v_student_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'first_name', rec.fname,
          'middle_name', rec.mname,
          'last_name', rec.lname,
          'full_name', rec.fname || ' ' || rec.lname,
          'lrn', rec.lrn,
          'role', 'student'
        ),
        now(), now(),
        '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), rec.uid, rec.uid::text,
        jsonb_build_object(
          'sub', rec.uid::text,
          'email', rec.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email', now(), now(), now()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = v_student_pw,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          confirmation_token = COALESCE(confirmation_token, ''),
          email_change = COALESCE(email_change, ''),
          email_change_token_new = COALESCE(email_change_token_new, ''),
          recovery_token = COALESCE(recovery_token, ''),
          updated_at = now()
      WHERE id = rec.uid;
    END IF;

    -- Upsert into public.users
    INSERT INTO public.users (id, user_id, email, user_role)
    VALUES (rec.uid, rec.user_code, rec.email, 'student')
    ON CONFLICT (email) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          user_role = 'student';

    -- Upsert into public.students
    SELECT id INTO rec.pid FROM public.students WHERE student_id = rec.lrn OR user_id = rec.uid LIMIT 1;
    IF rec.pid IS NULL THEN
      rec.pid := gen_random_uuid();
      INSERT INTO public.students (
        id, user_id, student_id, first_name, middle_name, last_name,
        date_of_birth, gender, contact_number, barangay, grade_level, strand
      ) VALUES (
        rec.pid, rec.uid, rec.lrn, rec.fname, rec.mname, rec.lname,
        rec.dob, rec.gender, rec.contact, rec.brgy, rec.grade, rec.strand
      );
    ELSE
      UPDATE public.students
      SET user_id = rec.uid,
          student_id = rec.lrn,
          first_name = rec.fname,
          middle_name = rec.mname,
          last_name = rec.lname,
          date_of_birth = rec.dob,
          gender = rec.gender,
          contact_number = rec.contact,
          barangay = rec.brgy,
          grade_level = rec.grade,
          strand = rec.strand
      WHERE id = rec.pid;
    END IF;

    -- Upsert sample Enrollment Application in public.enrollment_applications
    IF NOT EXISTS (SELECT 1 FROM public.enrollment_applications WHERE application_id = rec.app_ref) THEN
      INSERT INTO public.enrollment_applications (
        application_id,
        student_id,
        applicant_type,
        school_year,
        target_grade_level,
        target_strand,
        status,
        admin_feedback,
        selected_electives,
        submitted_documents
      ) VALUES (
        rec.app_ref,
        rec.pid,
        rec.app_type,
        '2026-2027',
        rec.grade,
        rec.strand,
        rec.app_status,
        CASE WHEN rec.app_status = 'Needs Revision'
             THEN 'Please re-upload a clearer scan of your SF9 / Form 138 Report Card.'
             ELSE NULL
        END,
        jsonb_build_array(
          jsonb_build_object(
            'lrn', rec.lrn,
            'firstName', rec.fname,
            'middleName', rec.mname,
            'lastName', rec.lname,
            'dateOfBirth', rec.dob::text,
            'gender', rec.gender,
            'contactNumber', rec.contact,
            'currentBarangay', rec.brgy,
            'currentMunicipality', 'Dumalneg',
            'currentProvince', 'Ilocos Norte',
            'schoolYear', '2026-2027',
            'semester', 'Trimester 1',
            'targetSemester', 'Trimester 1',
            'targetStrand', rec.strand,
            'step1', jsonb_build_object(
              'applicantType', rec.app_type,
              'targetGradeLevel', rec.grade,
              'targetSemester', 'Trimester 1',
              'withLrn', true
            )
          )
        ),
        '[]'::jsonb
      );
    END IF;
  END LOOP;
END $$;
