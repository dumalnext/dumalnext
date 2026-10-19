-- =================================================================================
-- DUMALNEG NATIONAL HIGH SCHOOL (DUMAL-NEXT)
-- FULL-SCHOOL DUMMY DATASET SEED SCRIPT (CLASSROOMS, SUBJECTS, SCHEDULES, 20 TEACHERS, 160 STUDENTS)
-- =================================================================================
-- HOW TO USE:
-- 1. Open your Supabase Project Dashboard:
--    https://supabase.com/dashboard/project/fvybtqghtuarjzlpbwnr/sql
-- 2. Click "New Query", paste this ENTIRE file, and click "Run".
-- 3. It is 100% idempotent (safe to run multiple times without duplicate errors).
--
-- WHAT THIS GENERATES:
-- • 8 Physical Classrooms (Capacity: 20 students per classroom = 160 total seats)
-- • 8 Classroom Sections across Grades 7–12 (linked to classrooms & advisers)
-- • 28 DepEd MATATAG JHS & Strengthened SHS Curriculum Subjects
-- • 40 Deconflicted Class Schedule Blocks across Monday–Friday
-- • 20 Teachers (75% Finished / 25% Unfinished):
--     - 15 Active Teachers (Logins: teacher1@dnhs.edu.ph .. teacher15@dnhs.edu.ph, Password: Teacher@123)
--     - 5 Pending Teacher Onboarding Invitations in IT Support (teacher16@dnhs.edu.ph .. teacher20@dnhs.edu.ph)
-- • 160 Students (20 per Classroom | 75% Finished / 25% Not Yet Finished):
--     - 120 Approved & Sectioned Students (15 per classroom -> every classroom is 15/20 = 75% full!)
--     - 24 Pending Students (3 per classroom -> waiting in Registrar Adjudication Console to fill remaining seats)
--     - 8 Needs Revision Students (1 per classroom -> flagged with Registrar feedback for re-submission testing)
--     - 8 Registered-Only Students (1 per classroom -> no BEEF submitted yet, ready to test the Enrollment Wizard)
--     - Logins: student001@gmail.com .. student160@gmail.com (Password: Student@123)
-- =================================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
  v_teacher_pw TEXT := extensions.crypt('Teacher@123', extensions.gen_salt('bf'));
  v_student_pw TEXT := extensions.crypt('Student@123', extensions.gen_salt('bf'));

  v_active_sy TEXT := '2026-2027';
  v_active_term INT := 1;
  v_active_term_name TEXT := 'Trimester 1';

  -- Arrays for deterministic Filipino names & barangays
  v_first_names_m TEXT[] := ARRAY[
    'Juan', 'Mark', 'Carlo', 'Joshua', 'Christian', 'Rafael', 'Gabriel', 'Daniel', 'Miguel', 'Kenneth',
    'Jerome', 'Angelo', 'John Paul', 'Francis', 'Vincent', 'Adrian', 'Paolo', 'Nathaniel', 'Dominic', 'renz',
    'Marco', 'Aldrin', 'Jayson', 'Kevin', 'Bryan', 'jasper', 'Liam', 'Noah', 'Ethan', 'Lucas',
    'Mateo', 'Sebastian', 'Julian', 'Leo', 'Isaac', 'Samuel', 'David', 'Joseph', 'Caleb', 'Ryan'
  ];
  v_first_names_f TEXT[] := ARRAY[
    'Maria', 'Angela', 'Bea', 'Sophia', 'Patricia', 'Camille', 'Jasmine', 'Alyssa', 'Katrina', 'Clarisse',
    'Hannah', 'Nicole', 'Gabrielle', 'Samantha', 'Angelica', 'Christine', 'Bianca', 'Denise', 'Erika', 'Therese',
    'Maricar', 'Jocelyn', 'Rica', 'Mae', 'Princess', 'Chloe', 'Isabella', 'Mia', 'Amelia', 'Harper',
    'Evelyn', 'Abigail', 'Emily', 'Eliza', 'Victoria', 'Grace', 'Zoey', 'Nora', 'Lily', 'Hanna'
  ];
  v_middle_names TEXT[] := ARRAY[
    'Reyes', 'Santos', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andres',
    'Castillo', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 'Dela Cruz'
  ];
  v_last_names TEXT[] := ARRAY[
    'Agbayani', 'Baguio', 'Cabanatan', 'Dumalneg', 'Espiritu', 'Fernandez', 'Guerrero', 'Hernandez', 'Ibanez', 'Javier',
    'Labrador', 'Macapagal', 'Narciso', 'Ortega', 'Pascual', 'Quizon', 'Rosales', 'Soriano', 'Tolentino', 'Valdez',
    'Abad', 'lagasca', 'madamba', 'Pagdilao', 'Fontanilla', 'duque', 'Calabocal', 'Simeon', 'Guzman', 'Pineda',
    'Galang', 'Dizon', 'Manalo', 'Vergara', 'Corpuz', 'Lozano', 'Fajardo', 'Salvador', 'De Guzman', 'Miranda'
  ];
  v_barangays TEXT[] := ARRAY['Cabaritan', 'Kalabakan', 'Quibel', 'San Isidro'];

  -- Teacher definitions (15 Active + 5 Pending Invitations)
  v_tch_first TEXT[] := ARRAY[
    'Maria Clara', 'Roberto Carlos', 'Elena Rose', 'Antonio Luis', 'Carmen Joy',
    'Ferdinand Mark', 'Lourdes Grace', 'Ricardo Jose', 'Theresa Mae', 'Danilo Rey',
    'Corazon Faith', 'Eduardo Noel', 'Rosario Hope', 'Victorino Jay', 'Marites Luz',
    'Gregorio Ben', 'Annaliza Joy', 'Reynaldo Paz', 'Cecilia Dawn', 'Rommel Ian'
  ];
  v_tch_middle TEXT[] := ARRAY[
    'Reyes', 'Pascual', 'Gomez', 'Aquino', 'Cruz',
    'Castro', 'Bautista', 'Agbayani', 'Salazar', 'Mendoza',
    'Villanueva', 'Ramos', 'Mercado', 'Torres', 'Soriano',
    'Dela Cruz', 'Navarro', 'Ocampo', 'Garcia', 'Valdez'
  ];
  v_tch_last TEXT[] := ARRAY[
    'Santos', 'Mendoza', 'Villanueva', 'Pascual', 'Bautista',
    'Aquino', 'Ramos', 'Agbayani', 'Tolentino', 'Guerrero',
    'Espiritu', 'Fernandez', 'Macapagal', 'Corpuz', 'Soriano',
    'Pagdilao', 'Madamba', 'Lagasca', 'Fontanilla', 'Duque'
  ];
  v_tch_dept TEXT[] := ARRAY[
    'JHS', 'JHS', 'JHS', 'JHS', 'JHS',
    'SHS', 'SHS', 'SHS', 'JHS', 'JHS',
    'JHS', 'SHS', 'SHS', 'CROSS_LEVEL', 'CROSS_LEVEL',
    'JHS', 'JHS', 'SHS', 'SHS', 'CROSS_LEVEL'
  ];
  v_tch_emails TEXT[] := ARRAY[
    'teacher1@dnhs.edu.ph', 'teacher2@dnhs.edu.ph', 'teacher3@dnhs.edu.ph', 'teacher4@dnhs.edu.ph', 'teacher5@dnhs.edu.ph',
    'teacher6@dnhs.edu.ph', 'teacher7@dnhs.edu.ph', 'teacher8@dnhs.edu.ph', 'teacher9@dnhs.edu.ph', 'teacher10@dnhs.edu.ph',
    'teacher11@dnhs.edu.ph', 'teacher12@dnhs.edu.ph', 'teacher13@dnhs.edu.ph', 'teacher14@dnhs.edu.ph', 'teacher15@dnhs.edu.ph',
    'teacher16@dnhs.edu.ph', 'teacher17@dnhs.edu.ph', 'teacher18@dnhs.edu.ph', 'teacher19@dnhs.edu.ph', 'teacher20@dnhs.edu.ph'
  ];

  -- 8 Classroom & Section Definitions
  v_room_codes TEXT[] := ARRAY['RM-101', 'RM-102', 'RM-103', 'RM-104', 'RM-105', 'RM-201', 'RM-202', 'RM-203'];
  v_room_names TEXT[] := ARRAY[
    'Room 101 - Rizal Hall',
    'Room 102 - Bonifacio Gym Annex',
    'Room 103 - Luna Hall',
    'Room 104 - Mabini Hall',
    'Room 105 - Del Pilar Hall',
    'Room 201 - Einstein Lab',
    'Room 202 - Aquino Hall',
    'Room 203 - Turing ICT Lab'
  ];
  v_room_bldgs TEXT[] := ARRAY[
    'JHS Academic Building',
    'JHS Academic Building',
    'JHS Academic Building',
    'JHS Academic Building',
    'JHS Academic Building',
    'SHS Academic Complex',
    'SHS Academic Complex',
    'SHS TVL & ICT Building'
  ];
  v_sec_codes TEXT[] := ARRAY[
    'SEC-G7-RIZAL', 'SEC-G7-BONIFACIO', 'SEC-G8-LUNA', 'SEC-G9-MABINI',
    'SEC-G10-DELPILAR', 'SEC-G11-EINSTEIN', 'SEC-G11-AQUINO', 'SEC-G12-TURING'
  ];
  v_sec_names TEXT[] := ARRAY[
    'Grade 7 - Rizal',
    'Grade 7 - Bonifacio',
    'Grade 8 - Luna',
    'Grade 9 - Mabini',
    'Grade 10 - Del Pilar',
    'Grade 11 - Einstein',
    'Grade 11 - Aquino',
    'Grade 12 - Turing'
  ];
  v_sec_grades INT[] := ARRAY[7, 7, 8, 9, 10, 11, 11, 12];
  v_sec_strands TEXT[] := ARRAY['Regular', 'SPS', 'Regular', 'Regular', 'Regular', 'Academic', 'Academic', 'Tech-Pro'];

  v_room_uuids UUID[] := ARRAY[
    'c0000000-0000-4000-8000-000000000101'::UUID,
    'c0000000-0000-4000-8000-000000000102'::UUID,
    'c0000000-0000-4000-8000-000000000103'::UUID,
    'c0000000-0000-4000-8000-000000000104'::UUID,
    'c0000000-0000-4000-8000-000000000105'::UUID,
    'c0000000-0000-4000-8000-000000000201'::UUID,
    'c0000000-0000-4000-8000-000000000202'::UUID,
    'c0000000-0000-4000-8000-000000000203'::UUID
  ];
  v_sec_uuids UUID[] := ARRAY[
    'd0000000-0000-4000-8000-000000000001'::UUID,
    'd0000000-0000-4000-8000-000000000002'::UUID,
    'd0000000-0000-4000-8000-000000000003'::UUID,
    'd0000000-0000-4000-8000-000000000004'::UUID,
    'd0000000-0000-4000-8000-000000000005'::UUID,
    'd0000000-0000-4000-8000-000000000006'::UUID,
    'd0000000-0000-4000-8000-000000000007'::UUID,
    'd0000000-0000-4000-8000-000000000008'::UUID
  ];
  v_tch_auth_uuids UUID[] := ARRAY[
    'a0000000-0000-4000-8000-000000000101'::UUID,
    'a0000000-0000-4000-8000-000000000102'::UUID,
    'a0000000-0000-4000-8000-000000000103'::UUID,
    'a0000000-0000-4000-8000-000000000104'::UUID,
    'a0000000-0000-4000-8000-000000000105'::UUID,
    'a0000000-0000-4000-8000-000000000106'::UUID,
    'a0000000-0000-4000-8000-000000000107'::UUID,
    'a0000000-0000-4000-8000-000000000108'::UUID,
    'a0000000-0000-4000-8000-000000000109'::UUID,
    'a0000000-0000-4000-8000-000000000110'::UUID,
    'a0000000-0000-4000-8000-000000000111'::UUID,
    'a0000000-0000-4000-8000-000000000112'::UUID,
    'a0000000-0000-4000-8000-000000000113'::UUID,
    'a0000000-0000-4000-8000-000000000114'::UUID,
    'a0000000-0000-4000-8000-000000000115'::UUID
  ];
  v_tch_profile_uuids UUID[] := ARRAY[
    'a0000000-0000-4000-8000-000000000201'::UUID,
    'a0000000-0000-4000-8000-000000000202'::UUID,
    'a0000000-0000-4000-8000-000000000203'::UUID,
    'a0000000-0000-4000-8000-000000000204'::UUID,
    'a0000000-0000-4000-8000-000000000205'::UUID,
    'a0000000-0000-4000-8000-000000000206'::UUID,
    'a0000000-0000-4000-8000-000000000207'::UUID,
    'a0000000-0000-4000-8000-000000000208'::UUID,
    'a0000000-0000-4000-8000-000000000209'::UUID,
    'a0000000-0000-4000-8000-000000000210'::UUID,
    'a0000000-0000-4000-8000-000000000211'::UUID,
    'a0000000-0000-4000-8000-000000000212'::UUID,
    'a0000000-0000-4000-8000-000000000213'::UUID,
    'a0000000-0000-4000-8000-000000000214'::UUID,
    'a0000000-0000-4000-8000-000000000215'::UUID
  ];

  -- Loop & scratch variables
  i INT;
  s_idx INT;
  c_idx INT;
  v_stu_num INT;
  v_gender TEXT;
  v_fname TEXT;
  v_mname TEXT;
  v_lname TEXT;
  v_lrn TEXT;
  v_stu_email TEXT;
  v_stu_code TEXT;
  v_bday DATE;
  v_brgy TEXT;
  v_contact TEXT;
  v_grade INT;
  v_strand TEXT;
  v_sec_id UUID;
  v_sec_name TEXT;
  v_assigned_sec_id UUID;
  v_status TEXT;
  v_app_type TEXT;
  v_feedback TEXT;
  v_auth_uid UUID;
  v_stu_uid UUID;
  v_app_uid UUID;
  v_electives JSONB;
  v_docs JSONB;
  v_form_payload JSONB;

  v_sections_json JSONB := '[]'::JSONB;
  v_invitations_json JSONB := '[]'::JSONB;
  v_schedules_json JSONB := '[]'::JSONB;

  v_days TEXT[] := ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  v_day TEXT;
  v_sched_uid UUID;
  v_subj_code TEXT;
  v_subj_name TEXT;
  v_tch_idx INT;
  v_temp_id UUID;
BEGIN
  -- ===============================================================================
  -- 0. DETECT OR INITIALIZE ACTIVE ACADEMIC TERM
  -- ===============================================================================
  BEGIN
    SELECT "schoolYear", "termNumber", "termName"
      INTO v_active_sy, v_active_term, v_active_term_name
      FROM public.academic_terms
     WHERE "isActive" = true
     LIMIT 1;

    IF v_active_sy IS NULL THEN
      v_active_sy := '2026-2027';
      v_active_term := 1;
      v_active_term_name := 'Trimester 1';

      INSERT INTO public.academic_terms ("schoolYear", "termNumber", "termName", "startDate", "endDate", "isActive")
      VALUES
        ('2026-2027', 1, 'Trimester 1', '2026-06-15', '2026-09-18', true),
        ('2026-2027', 2, 'Trimester 2', '2026-09-21', '2026-12-18', false),
        ('2026-2027', 3, 'Trimester 3', '2027-01-04', '2027-03-26', false)
      ON CONFLICT ("schoolYear", "termNumber") DO UPDATE
        SET "isActive" = EXCLUDED."isActive";
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_active_sy := '2026-2027';
    v_active_term := 1;
    v_active_term_name := 'Trimester 1';
  END;

  -- Clean up any previously seeded dummy rows so re-runs are 100% clean
  DELETE FROM public.enrollment_applications WHERE application_id LIKE 'DNHS-2026-SEED-%' OR application_id LIKE 'DNHS-2026-99%';
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'class_schedules' AND column_name = 'schedule_code'
    ) THEN
      EXECUTE 'DELETE FROM public.class_schedules WHERE schedule_code LIKE ''SCH-SEED-%''';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'class_schedules' AND column_name = 'schedule_id'
    ) THEN
      EXECUTE 'DELETE FROM public.class_schedules WHERE schedule_id LIKE ''SCH-SEED-%''';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- ===============================================================================
  -- 1. SEED 8 PHYSICAL CLASSROOMS (Capacity = 20 students per classroom)
  -- ===============================================================================
  FOR c_idx IN 1..8 LOOP
    INSERT INTO public.classrooms (id, classroom_id, room_name, building, capacity)
    VALUES (
      v_room_uuids[c_idx],
      v_room_codes[c_idx],
      v_room_names[c_idx],
      v_room_bldgs[c_idx],
      20
    )
    ON CONFLICT (classroom_id) DO UPDATE
      SET room_name = EXCLUDED.room_name,
          building  = EXCLUDED.building,
          capacity  = EXCLUDED.capacity
    RETURNING id INTO v_temp_id;
    v_room_uuids[c_idx] := v_temp_id;
  END LOOP;

  -- ===============================================================================
  -- 2. SEED 20 TEACHERS (15 ACTIVE ONBOARDED [75%] + 5 PENDING INVITATIONS [25%])
  -- ===============================================================================
  FOR i IN 1..20 LOOP
    IF i <= 15 THEN
      -- Active Teacher (1..15)
      SELECT id INTO v_auth_uid FROM auth.users WHERE email = v_tch_emails[i] LIMIT 1;
      IF v_auth_uid IS NULL THEN
        v_auth_uid := v_tch_auth_uuids[i];
      ELSE
        v_tch_auth_uuids[i] := v_auth_uid;
      END IF;

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        v_instance_id,
        v_auth_uid,
        'authenticated',
        'authenticated',
        v_tch_emails[i],
        v_teacher_pw,
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object(
          'full_name', v_tch_first[i] || ' ' || v_tch_middle[i] || ' ' || v_tch_last[i],
          'first_name', v_tch_first[i],
          'last_name', v_tch_last[i],
          'role', 'teacher',
          'user_role', 'teacher'
        ),
        NOW(),
        NOW(),
        '', '', '', ''
      )
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            encrypted_password = EXCLUDED.encrypted_password,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = NOW();

      DELETE FROM auth.identities WHERE user_id = v_auth_uid AND provider = 'email';
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_auth_uid,
        v_auth_uid::text,
        jsonb_build_object('sub', v_auth_uid::text, 'email', v_tch_emails[i], 'email_verified', true),
        'email',
        NOW(),
        NOW(),
        NOW()
      );

      INSERT INTO public.users (id, user_id, email, user_role)
      VALUES (
        v_auth_uid,
        'DNHS-TCH-' || LPAD((100 + i)::text, 3, '0'),
        v_tch_emails[i],
        'teacher'
      )
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            user_role = 'teacher';

      INSERT INTO public.teachers (
        id, user_id, teacher_id, first_name, middle_name, last_name, email, department
      ) VALUES (
        v_tch_profile_uuids[i],
        v_auth_uid,
        'DNHS-TCH-' || LPAD((100 + i)::text, 3, '0'),
        v_tch_first[i],
        v_tch_middle[i],
        v_tch_last[i],
        v_tch_emails[i],
        v_tch_dept[i]
      )
      ON CONFLICT (teacher_id) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            first_name = EXCLUDED.first_name,
            middle_name = EXCLUDED.middle_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            department = EXCLUDED.department
      RETURNING id INTO v_temp_id;
      v_tch_profile_uuids[i] := v_temp_id;

      -- Add as Accepted Invitation in IT Support Staff Invitations list
      v_invitations_json := v_invitations_json || jsonb_build_array(
        jsonb_build_object(
          'id', 'inv-seed-tch-' || i,
          'email', v_tch_emails[i],
          'role', 'teacher',
          'fullName', v_tch_first[i] || ' ' || v_tch_middle[i] || ' ' || v_tch_last[i],
          'department', v_tch_dept[i],
          'token', 'tok-accepted-tch-' || LPAD(i::text, 2, '0'),
          'status', 'accepted',
          'invitedAt', (NOW() - INTERVAL '14 days')::text,
          'acceptedAt', (NOW() - INTERVAL '12 days')::text,
          'expiresAt', (NOW() + INTERVAL '30 days')::text
        )
      );
    ELSE
      -- Pending / Unfinished Teacher (16..20 -> 25% of faculty not yet onboarded)
      v_invitations_json := v_invitations_json || jsonb_build_array(
        jsonb_build_object(
          'id', 'inv-seed-tch-' || i,
          'email', v_tch_emails[i],
          'role', 'teacher',
          'fullName', v_tch_first[i] || ' ' || v_tch_middle[i] || ' ' || v_tch_last[i],
          'department', v_tch_dept[i],
          'token', 'tok-pending-tch-' || LPAD(i::text, 2, '0'),
          'status', 'pending',
          'invitedAt', (NOW() - INTERVAL '2 days')::text,
          'acceptedAt', NULL,
          'expiresAt', (NOW() + INTERVAL '30 days')::text
        )
      );
    END IF;
  END LOOP;

  -- Save Staff Invitations (15 Accepted + 5 Pending) to system_settings
  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES ('staff_invitations', jsonb_build_object('invitations', v_invitations_json), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  -- ===============================================================================
  -- 3. SEED 8 SECTIONS (Linked to the 8 Classrooms & First 8 Active Teachers)
  -- ===============================================================================
  FOR c_idx IN 1..8 LOOP
    INSERT INTO public.sections (
      id, section_id, section_name, grade_level, strand, capacity, school_year
    ) VALUES (
      v_sec_uuids[c_idx],
      v_sec_codes[c_idx],
      v_sec_names[c_idx],
      v_sec_grades[c_idx],
      v_sec_strands[c_idx],
      20,
      v_active_sy
    )
    ON CONFLICT (section_id) DO UPDATE
      SET section_name = EXCLUDED.section_name,
          grade_level  = EXCLUDED.grade_level,
          strand       = EXCLUDED.strand,
          capacity     = 20,
          school_year  = v_active_sy
    RETURNING id INTO v_temp_id;
    v_sec_uuids[c_idx] := v_temp_id;

    v_sections_json := v_sections_json || jsonb_build_array(
      jsonb_build_object(
        'id', v_sec_uuids[c_idx]::text,
        'section_id', v_sec_codes[c_idx],
        'section_name', v_sec_names[c_idx],
        'grade_level', v_sec_grades[c_idx],
        'strand', v_sec_strands[c_idx],
        'room', v_room_names[c_idx] || ' (' || v_room_bldgs[c_idx] || ')',
        'adviser_name', v_tch_first[c_idx] || ' ' || v_tch_middle[c_idx] || ' ' || v_tch_last[c_idx],
        'capacity', 20,
        'school_year', v_active_sy
      )
    );
  END LOOP;

  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES (
    'sections_config',
    jsonb_build_object('customSections', v_sections_json, 'deletedIds', '[]'::jsonb),
    NOW()
  )
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  -- ===============================================================================
  -- 4. SEED COMPLETE CURRICULUM SUBJECTS (JHS MATATAG + SHS CORE & ELECTIVES)
  -- ===============================================================================
  INSERT INTO public.course_subjects (subject_code, subject_name, subject_type, grade_level, trimester, strand)
  VALUES
    -- Grade 7 Core & SPS
    ('G7-ENG',  'English 7 (MATATAG)',                        'Core',     7,  1, 'Regular'),
    ('G7-MATH', 'Mathematics 7 (MATATAG)',                    'Core',     7,  1, 'Regular'),
    ('G7-SCI',  'Science 7 (MATATAG)',                        'Core',     7,  1, 'Regular'),
    ('G7-FIL',  'Filipino 7 (MATATAG)',                       'Core',     7,  1, 'Regular'),
    ('G7-AP',   'Araling Panlipunan 7',                       'Core',     7,  1, 'Regular'),
    ('G7-SPS',  'Special Program in Sports (Athletics 7)',    'Elective', 7,  1, 'SPS'),
    -- Grade 8 Core
    ('G8-ENG',  'English 8 (Afro-Asian Literature)',          'Core',     8,  1, 'Regular'),
    ('G8-MATH', 'Mathematics 8 (Linear Algebra & Geometry)',  'Core',     8,  1, 'Regular'),
    ('G8-SCI',  'Science 8 (Force, Motion & Earth Science)',  'Core',     8,  1, 'Regular'),
    ('G8-FIL',  'Filipino 8 (Panitikang Pambansa)',           'Core',     8,  1, 'Regular'),
    ('G8-TLE',  'Technology and Livelihood Education 8',      'Core',     8,  1, 'Regular'),
    -- Grade 9 Core
    ('G9-ENG',  'English 9 (Anglo-American Literature)',      'Core',     9,  1, 'Regular'),
    ('G9-MATH', 'Mathematics 9 (Quadratic Functions)',        'Core',     9,  1, 'Regular'),
    ('G9-SCI',  'Science 9 (Chemistry & Biology)',            'Core',     9,  1, 'Regular'),
    ('G9-AP',   'Araling Panlipunan 9 (Ekonomiks)',           'Core',     9,  1, 'Regular'),
    ('G9-ESP',  'Values Education / ESP 9',                   'Core',     9,  1, 'Regular'),
    -- Grade 10 Core
    ('G10-ENG',  'English 10 (World Literature & Research)',  'Core',     10, 1, 'Regular'),
    ('G10-MATH', 'Mathematics 10 (Sequences & Probability)',  'Core',     10, 1, 'Regular'),
    ('G10-SCI',  'Science 10 (Plate Tectonics & Genetics)',   'Core',     10, 1, 'Regular'),
    ('G10-FIL',  'Filipino 10 (El Filibusterismo)',           'Core',     10, 1, 'Regular'),
    ('G10-AP',   'Araling Panlipunan 10 (Kontemporaryong Isyu)', 'Core',  10, 1, 'Regular'),
    -- Grade 11 Core & Academic Electives
    ('SHS-EFFCOM', 'Effective Communication / Mabisang Komunikasyon', 'Core', 11, 1, 'Academic'),
    ('SHS-GENMATH','General Mathematics',                     'Core',     11, 1, 'Academic'),
    ('SHS-GENSCI', 'General Science (Earth & Life)',          'Core',     11, 1, 'Academic'),
    ('SHS-CALC1',  'Calculus 1 (STEM Academic Elective)',     'Elective', 11, 1, 'Academic'),
    ('SHS-PHYS1',  'General Physics 1 (STEM Elective)',       'Elective', 11, 1, 'Academic'),
    ('SHS-CW1',    'Creative Writing (HUMSS Elective)',       'Elective', 11, 1, 'Academic'),
    ('SHS-SOCSCI', 'Philippine Politics and Governance',      'Elective', 11, 1, 'Academic'),
    -- Grade 12 Core & Tech-Pro Electives
    ('SHS-LIFECAR','Life and Career Skills',                  'Core',     12, 1, 'Tech-Pro'),
    ('SHS-PAGBASA','Pag-aaral ng Kasaysayan at Lipunang Pilipino', 'Core', 12, 1, 'Tech-Pro'),
    ('SHS-PRACRES','Practical Research & Capstone Project',   'Applied',  12, 1, 'Tech-Pro'),
    ('SHS-ICT-PRG','Computer Programming (.NET & Java NC III)','Specialized', 12, 1, 'Tech-Pro'),
    ('SHS-ICT-CSS','Computer Systems Servicing (NC II)',      'Specialized', 12, 1, 'Tech-Pro')
  ON CONFLICT (subject_code) DO UPDATE
    SET subject_name = EXCLUDED.subject_name,
        subject_type = EXCLUDED.subject_type,
        grade_level  = EXCLUDED.grade_level,
        strand       = EXCLUDED.strand;

  -- ===============================================================================
  -- 5. SEED DECONFLICTED CLASS SCHEDULES (40 BLOCKS ACROSS 8 SECTIONS & 14 TEACHERS)
  --    Note: Teacher #15 (Marites Luz Soriano) is intentionally left with 0 classes
  --    so the Admin/Registrar can test assigning schedules to an available teacher!
  -- ===============================================================================
  FOR c_idx IN 1..8 LOOP
    FOR i IN 1..5 LOOP
      v_day := v_days[i];
      v_sched_uid := ('e0000000-0000-4000-8000-000000000' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'))::UUID;

      -- Pick subject based on section grade
      IF c_idx = 1 THEN
        v_subj_code := (ARRAY['G7-ENG','G7-MATH','G7-SCI','G7-FIL','G7-AP'])[i];
      ELSIF c_idx = 2 THEN
        v_subj_code := (ARRAY['G7-SPS','G7-ENG','G7-MATH','G7-SCI','G7-FIL'])[i];
      ELSIF c_idx = 3 THEN
        v_subj_code := (ARRAY['G8-ENG','G8-MATH','G8-SCI','G8-FIL','G8-TLE'])[i];
      ELSIF c_idx = 4 THEN
        v_subj_code := (ARRAY['G9-ENG','G9-MATH','G9-SCI','G9-AP','G9-ESP'])[i];
      ELSIF c_idx = 5 THEN
        v_subj_code := (ARRAY['G10-ENG','G10-MATH','G10-SCI','G10-FIL','G10-AP'])[i];
      ELSIF c_idx = 6 THEN
        v_subj_code := (ARRAY['SHS-EFFCOM','SHS-GENMATH','SHS-GENSCI','SHS-CALC1','SHS-PHYS1'])[i];
      ELSIF c_idx = 7 THEN
        v_subj_code := (ARRAY['SHS-EFFCOM','SHS-GENMATH','SHS-GENSCI','SHS-CW1','SHS-SOCSCI'])[i];
      ELSE
        v_subj_code := (ARRAY['SHS-LIFECAR','SHS-PAGBASA','SHS-PRACRES','SHS-ICT-PRG','SHS-ICT-CSS'])[i];
      END IF;

      SELECT subject_name INTO v_subj_name FROM public.course_subjects WHERE subject_code = v_subj_code LIMIT 1;

      -- Rotate across Active Teachers 1..14 without time collision:
      -- Each section c_idx meets in its dedicated classroom v_room_uuids[c_idx].
      -- On day i, section c_idx is taught at slot c_idx or by teacher ((c_idx + i - 2) % 14) + 1
      v_tch_idx := ((c_idx + i - 2) % 14) + 1;

      -- Insert into public.class_schedules supporting both schedule_code and schedule_id
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'class_schedules' AND column_name = 'schedule_code'
        ) THEN
          EXECUTE 'DELETE FROM public.class_schedules WHERE schedule_code = $1 OR id = $2'
            USING 'SCH-SEED-' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'), v_sched_uid;
          EXECUTE 'INSERT INTO public.class_schedules (id, schedule_code, subject_code, section_id, teacher_id, classroom_id, day_of_week, start_time, end_time, trimester, school_year)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)'
            USING v_sched_uid, 'SCH-SEED-' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'), v_subj_code, v_sec_uuids[c_idx], v_tch_profile_uuids[v_tch_idx], v_room_uuids[c_idx], v_day, '08:00:00'::TIME, '09:30:00'::TIME, v_active_term, v_active_sy;
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'class_schedules' AND column_name = 'schedule_id'
        ) THEN
          EXECUTE 'DELETE FROM public.class_schedules WHERE schedule_id = $1 OR id = $2'
            USING 'SCH-SEED-' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'), v_sched_uid;
          EXECUTE 'INSERT INTO public.class_schedules (id, schedule_id, subject_code, section_id, teacher_id, classroom_id, day_of_week, start_time, end_time, trimester, school_year)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)'
            USING v_sched_uid, 'SCH-SEED-' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'), v_subj_code, v_sec_uuids[c_idx], v_tch_profile_uuids[v_tch_idx], v_room_uuids[c_idx], v_day, '08:00:00'::TIME, '09:30:00'::TIME, v_active_term, v_active_sy;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      v_schedules_json := v_schedules_json || jsonb_build_array(
        jsonb_build_object(
          'id', v_sched_uid::text,
          'schedule_id', 'SCH-SEED-' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'),
          'section_id', v_sec_uuids[c_idx]::text,
          'section_name', v_sec_names[c_idx],
          'teacher_id', v_tch_profile_uuids[v_tch_idx]::text,
          'teacher_name', v_tch_first[v_tch_idx] || ' ' || v_tch_middle[v_tch_idx] || ' ' || v_tch_last[v_tch_idx],
          'teacher_email', v_tch_emails[v_tch_idx],
          'classroom_id', v_room_uuids[c_idx]::text,
          'classroom_name', v_room_names[c_idx],
          'building', v_room_bldgs[c_idx],
          'subject_code', v_subj_code,
          'subject_name', COALESCE(v_subj_name, v_subj_code),
          'day_of_week', v_day,
          'start_time', '08:00',
          'end_time', '09:30',
          'school_year', v_active_sy,
          'trimester', v_active_term
        )
      );
    END LOOP;
  END LOOP;

  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES ('class_schedules_config', jsonb_build_object('schedules', v_schedules_json), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  -- ===============================================================================
  -- 6. SEED 160 STUDENTS (20 PER CLASSROOM x 8 CLASSROOMS)
  --    Per Classroom of 20 Students:
  --      • Students 1..15  (75% = 120 Total): APPROVED & Enrolled in their classroom!
  --      • Students 16..18 (15% = 24 Total):  PENDING in Registrar Adjudication Console
  --      • Student  19     (5%  = 8 Total):   NEEDS REVISION (with Registrar feedback)
  --      • Student  20     (5%  = 8 Total):   REGISTERED ONLY (has login, no BEEF form yet)
  --    Total Unfinished = 5 per classroom (25% = 40 students ready for you to test!)
  -- ===============================================================================
  FOR c_idx IN 1..8 LOOP
    v_grade    := v_sec_grades[c_idx];
    v_strand   := v_sec_strands[c_idx];
    v_sec_id   := v_sec_uuids[c_idx];
    v_sec_name := v_sec_names[c_idx];

    FOR s_idx IN 1..20 LOOP
      v_stu_num := (c_idx - 1) * 20 + s_idx; -- 1 .. 160

      IF (v_stu_num % 2) = 1 THEN
        v_gender := 'Male';
        v_fname  := INITCAP(v_first_names_m[((v_stu_num - 1) % array_length(v_first_names_m, 1)) + 1]);
      ELSE
        v_gender := 'Female';
        v_fname  := INITCAP(v_first_names_f[((v_stu_num - 1) % array_length(v_first_names_f, 1)) + 1]);
      END IF;

      v_mname := INITCAP(v_middle_names[((v_stu_num * 3) % array_length(v_middle_names, 1)) + 1]);
      v_lname := INITCAP(v_last_names[((v_stu_num * 7) % array_length(v_last_names, 1)) + 1]);

      -- Unique 12-digit LRN: 100050260001 .. 100050260160
      v_lrn       := '100050260' || LPAD(v_stu_num::text, 3, '0');
      v_stu_email := 'student' || LPAD(v_stu_num::text, 3, '0') || '@gmail.com';
      v_stu_code  := 'DNHS-STU-' || (20000 + v_stu_num)::text;
      v_brgy      := v_barangays[((v_stu_num - 1) % 4) + 1];
      v_contact   := '0917' || LPAD((5000000 + v_stu_num * 137)::text, 7, '0');
      v_bday      := MAKE_DATE(2026 - (v_grade + 5), ((v_stu_num % 12) + 1), ((v_stu_num % 27) + 1));

      -- Deterministic UUIDs
      SELECT id INTO v_auth_uid FROM auth.users WHERE email = v_stu_email LIMIT 1;
      IF v_auth_uid IS NULL THEN
        v_auth_uid := ('b0000000-0000-4000-8000-000000001' || LPAD(v_stu_num::text, 3, '0'))::UUID;
      END IF;
      v_stu_uid := ('b0000000-0000-4000-8000-000000002' || LPAD(v_stu_num::text, 3, '0'))::UUID;
      v_app_uid := ('b0000000-0000-4000-8000-000000003' || LPAD(v_stu_num::text, 3, '0'))::UUID;

      -- Status & Section Assignment (15 Approved / 5 Unfinished per classroom)
      IF s_idx <= 15 THEN
        v_status          := 'Approved';
        v_assigned_sec_id := v_sec_id;
        v_feedback        := 'Enrollment verified and approved. Assigned to ' || v_sec_name || '.';
      ELSIF s_idx <= 18 THEN
        v_status          := 'Pending';
        v_assigned_sec_id := NULL;
        v_feedback        := NULL;
      ELSIF s_idx = 19 THEN
        v_status          := 'Needs Revision';
        v_assigned_sec_id := NULL;
        v_feedback        := 'Please re-upload a clearer, high-resolution copy of your PSA Birth Certificate and SF9 Report Card (front and back pages).';
      ELSE
        -- s_idx = 20: Registered student account only (has not submitted BEEF form yet)
        v_status          := 'UNSUBMITTED';
        v_assigned_sec_id := NULL;
        v_feedback        := NULL;
      END IF;

      -- Determine Applicant Type
      IF v_grade = 7 THEN
        v_app_type := 'Grade 7';
      ELSIF v_grade = 11 THEN
        v_app_type := 'Grade 11';
      ELSIF (s_idx = 18) THEN
        v_app_type := 'Transferee';
      ELSE
        v_app_type := 'Returning';
      END IF;

      -- 6A. Upsert auth.users
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        v_instance_id,
        v_auth_uid,
        'authenticated',
        'authenticated',
        v_stu_email,
        v_student_pw,
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object(
          'full_name', v_fname || ' ' || v_mname || ' ' || v_lname,
          'first_name', v_fname,
          'middle_name', v_mname,
          'last_name', v_lname,
          'lrn', v_lrn,
          'role', 'student',
          'user_role', 'student'
        ),
        NOW(),
        NOW(),
        '', '', '', ''
      )
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            encrypted_password = EXCLUDED.encrypted_password,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = NOW();

      DELETE FROM auth.identities WHERE user_id = v_auth_uid AND provider = 'email';
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_auth_uid,
        v_auth_uid::text,
        jsonb_build_object('sub', v_auth_uid::text, 'email', v_stu_email, 'email_verified', true),
        'email',
        NOW(),
        NOW(),
        NOW()
      );

      -- 6B. Upsert public.users
      INSERT INTO public.users (id, user_id, email, user_role)
      VALUES (v_auth_uid, v_stu_code, v_stu_email, 'student')
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            user_role = 'student';

      -- 6C. Upsert public.students
      INSERT INTO public.students (
        id, user_id, student_id, first_name, middle_name, last_name,
        date_of_birth, gender, contact_number, barangay,
        grade_level, strand, current_section_id
      ) VALUES (
        v_stu_uid,
        v_auth_uid,
        v_lrn,
        v_fname,
        v_mname,
        v_lname,
        v_bday,
        v_gender,
        v_contact,
        v_brgy,
        v_grade,
        v_strand,
        v_assigned_sec_id
      )
      ON CONFLICT (student_id) DO UPDATE
        SET user_id            = EXCLUDED.user_id,
            first_name         = EXCLUDED.first_name,
            middle_name        = EXCLUDED.middle_name,
            last_name          = EXCLUDED.last_name,
            date_of_birth      = EXCLUDED.date_of_birth,
            gender             = EXCLUDED.gender,
            contact_number     = EXCLUDED.contact_number,
            barangay           = EXCLUDED.barangay,
            grade_level        = EXCLUDED.grade_level,
            strand             = EXCLUDED.strand,
            current_section_id = EXCLUDED.current_section_id
      RETURNING id INTO v_stu_uid;

      -- 6D. Insert Enrollment Application for Students 1..19 (Leave Student 20 unsubmitted)
      IF v_status <> 'UNSUBMITTED' THEN
        -- Build Electives array for SHS or SPS
        IF c_idx = 6 THEN
          v_electives := '["SHS-CALC1", "SHS-PHYS1"]'::JSONB;
        ELSIF c_idx = 7 THEN
          v_electives := '["SHS-CW1", "SHS-SOCSCI"]'::JSONB;
        ELSIF c_idx = 8 THEN
          v_electives := '["SHS-ICT-PRG", "SHS-ICT-CSS"]'::JSONB;
        ELSIF c_idx = 2 THEN
          v_electives := '["G7-SPS"]'::JSONB;
        ELSE
          v_electives := '[]'::JSONB;
        END IF;

        v_form_payload := jsonb_build_array(
          jsonb_build_object(
            'lrn', v_lrn,
            'hasLrn', 'Yes',
            'firstName', v_fname,
            'middleName', v_mname,
            'lastName', v_lname,
            'birthdate', v_bday::text,
            'age', (v_grade + 5),
            'sex', v_gender,
            'placeOfBirth', 'Dumalneg, Ilocos Norte',
            'motherTongue', 'Ilocano',
            'isIp', 'No',
            'is4ps', CASE WHEN (v_stu_num % 4) = 0 THEN 'Yes' ELSE 'No' END,
            'isPwd', 'No',
            'currentSitio', 'Purok ' || ((v_stu_num % 6) + 1)::text,
            'currentBarangay', v_brgy,
            'currentMunicipality', 'Dumalneg',
            'currentProvince', 'Ilocos Norte',
            'currentZipCode', '2921',
            'sameAddress', true,
            'fatherFirstName', 'Roberto',
            'fatherLastName', v_lname,
            'fatherContact', v_contact,
            'motherFirstName', 'Elena',
            'motherLastName', v_mname,
            'motherContact', v_contact,
            'guardianRelationship', 'Parents',
            'gradeLevel', v_grade::text,
            'enrolleeType', CASE
              WHEN v_grade = 7 THEN 'New Entrant (Grade 7)'
              WHEN v_grade = 11 THEN 'SHS Entrant (Grade 11)'
              WHEN s_idx = 18 THEN 'Transferee'
              ELSE 'Continuing / Balik-Aral'
            END,
            'schoolYear', v_active_sy,
            'termNumber', v_active_term,
            'termName', v_active_term_name,
            'trimester', v_active_term_name,
            'jhsProgram', CASE WHEN c_idx = 2 THEN 'Special Program in Sports (SPS)' ELSE 'Regular Program' END,
            'shsCluster', CASE
              WHEN c_idx IN (6, 7) THEN 'Academic Cluster'
              WHEN c_idx = 8 THEN 'Tech-Pro (TVL) Cluster'
              ELSE ''
            END,
            'selectedElectives', v_electives,
            'learningModality', 'In-Person (Face-to-Face)',
            'assignedSectionId', CASE WHEN v_assigned_sec_id IS NOT NULL THEN v_assigned_sec_id::text ELSE NULL END,
            'assignedSectionName', CASE WHEN v_assigned_sec_id IS NOT NULL THEN v_sec_name ELSE NULL END
          )
        );

        v_docs := jsonb_build_array(
          jsonb_build_object(
            'name', 'PSA_Birth_Certificate_' || v_lname || '_' || v_lrn || '.pdf',
            'type', 'PSA Birth Certificate',
            'url', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            'status', CASE WHEN v_status = 'Needs Revision' THEN 'Flagged' ELSE 'Uploaded' END
          ),
          jsonb_build_object(
            'name', 'SF9_Report_Card_' || v_lname || '_' || v_lrn || '.pdf',
            'type', 'SF9 Learner Progress Report Card',
            'url', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            'status', 'Uploaded'
          )
        );

        INSERT INTO public.enrollment_applications (
          id, application_id, student_id, applicant_type, school_year,
          target_grade_level, target_strand, status, admin_feedback,
          selected_electives, submitted_documents, created_at, updated_at
        ) VALUES (
          v_app_uid,
          'DNHS-2026-SEED-' || LPAD(v_stu_num::text, 3, '0'),
          v_stu_uid,
          v_app_type,
          v_active_sy,
          v_grade,
          v_strand,
          v_status,
          v_feedback,
          v_form_payload,
          v_docs,
          NOW() - ((170 - v_stu_num) || ' hours')::INTERVAL,
          NOW()
        )
        ON CONFLICT (application_id) DO UPDATE
          SET student_id          = EXCLUDED.student_id,
              school_year         = EXCLUDED.school_year,
              target_grade_level  = EXCLUDED.target_grade_level,
              target_strand       = EXCLUDED.target_strand,
              status              = EXCLUDED.status,
              admin_feedback      = EXCLUDED.admin_feedback,
              selected_electives  = EXCLUDED.selected_electives,
              submitted_documents = EXCLUDED.submitted_documents,
              updated_at          = NOW();
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- =================================================================================
-- SUMMARY VERIFICATION QUERY (Displays Classrooms & 75% Finished vs 25% Unfinished Breakdown)
-- =================================================================================
SELECT
  s.section_name AS "Classroom / Section",
  s.grade_level AS "Grade",
  s.strand AS "Program / Cluster",
  s.capacity AS "Room Capacity",
  COUNT(st.id) FILTER (WHERE st.current_section_id = s.id) AS "Approved & Enrolled (75%)",
  (s.capacity - COUNT(st.id) FILTER (WHERE st.current_section_id = s.id)) AS "Remaining Open Seats (25%)"
FROM public.sections s
LEFT JOIN public.students st ON st.current_section_id = s.id
WHERE s.section_id LIKE 'SEC-G%'
GROUP BY s.id, s.section_name, s.grade_level, s.strand, s.capacity
ORDER BY s.grade_level, s.section_name;
