-- =================================================================================
-- DUMALNEG NATIONAL HIGH SCHOOL (DUMAL-NEXT)
-- FULL-SCHOOL DUMMY DATASET SEED SCRIPT (CLEAN SUBJECTS, 40 MAX PER ROOM, RANDOMIZED 70-80% PROGRESS)
-- =================================================================================
-- IMPORTANT: When running in Supabase SQL Editor, make sure NO blank line is
-- highlighted/selected (or press Ctrl+A to select the whole file) before clicking "Run".
-- =================================================================================

DO $$
DECLARE
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
  v_teacher_pw TEXT;
  v_student_pw TEXT;

  v_active_sy TEXT := '2026-2027';
  v_active_term INT := 1;
  v_active_term_name TEXT := 'Trimester 1';

  v_first_names_m TEXT[] := ARRAY[
    'Juan', 'Mark', 'Carlo', 'Joshua', 'Christian', 'Rafael', 'Gabriel', 'Daniel', 'Miguel', 'Kenneth',
    'Jerome', 'Angelo', 'John Paul', 'Francis', 'Vincent', 'Adrian', 'Paolo', 'Nathaniel', 'Dominic', 'Renz',
    'Marco', 'Aldrin', 'Jayson', 'Kevin', 'Bryan', 'Jasper', 'Liam', 'Noah', 'Ethan', 'Lucas',
    'Mateo', 'Sebastian', 'Julian', 'Leo', 'Isaac', 'Samuel', 'David', 'Joseph', 'Caleb', 'Ryan',
    'Kurt', 'Tristan', 'Clarence', 'Cedric', 'Harvey', 'Lance', 'Andrei', 'Xander', 'Joaquin', 'Inigo'
  ];
  v_first_names_f TEXT[] := ARRAY[
    'Maria', 'Angela', 'Bea', 'Sophia', 'Patricia', 'Camille', 'Jasmine', 'Alyssa', 'Katrina', 'Clarisse',
    'Hannah', 'Nicole', 'Gabrielle', 'Samantha', 'Angelica', 'Christine', 'Bianca', 'Denise', 'Erika', 'Therese',
    'Maricar', 'Jocelyn', 'Rica', 'Mae', 'Princess', 'Chloe', 'Isabella', 'Mia', 'Amelia', 'Harper',
    'Evelyn', 'Abigail', 'Emily', 'Eliza', 'Victoria', 'Grace', 'Zoey', 'Nora', 'Lily', 'Hanna',
    'Kyla', 'Andrea', 'Danica', 'Faith', 'Gwyneth', 'Irish', 'Janelle', 'Kristine', 'Loraine', 'Nadine'
  ];
  v_middle_names TEXT[] := ARRAY[
    'Reyes', 'Santos', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andres',
    'Castillo', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 'Dela Cruz',
    'Domingo', 'Gomez', 'Marquez', 'Beltran', 'Carpio'
  ];
  v_last_names TEXT[] := ARRAY[
    'Agbayani', 'Baguio', 'Cabanatan', 'Dumalneg', 'Espiritu', 'Fernandez', 'Guerrero', 'Hernandez', 'Ibanez', 'Javier',
    'Labrador', 'Macapagal', 'Narciso', 'Ortega', 'Pascual', 'Quizon', 'Rosales', 'Soriano', 'Tolentino', 'Valdez',
    'Abad', 'Lagasca', 'Madamba', 'Pagdilao', 'Fontanilla', 'Duque', 'Calabocal', 'Simeon', 'Guzman', 'Pineda',
    'Galang', 'Dizon', 'Manalo', 'Vergara', 'Corpuz', 'Lozano', 'Fajardo', 'Salvador', 'De Guzman', 'Miranda',
    'Acosta', 'Barrientos', 'Catubig', 'Esteban', 'Flores', 'Garvida', 'Ilagan', 'Lucero', 'Magsaysay', 'Tamayo'
  ];
  v_barangays TEXT[] := ARRAY['Cabaritan', 'Kalabakan', 'Quibel', 'San Isidro'];

  v_revision_reasons TEXT[] := ARRAY[
    'Blurred PSA Birth Certificate scan - please upload a clearer, readable copy.',
    'SF9 Report Card is missing the back page showing signed final general average.',
    'Learner Reference Number (LRN) on the form does not match the uploaded SF9 card.',
    'Parent/Guardian emergency contact number is incomplete (missing 1 digit).',
    'Uploaded Good Moral Certificate is cut off at the bottom signature block.',
    'Please upload the official PSA Birth Certificate instead of a local civil registry draft.'
  ];

  -- 22 Teachers (16 Active Onboarded + 6 Pending Invitations interleaved at 4, 9, 13, 17, 20, 22)
  v_tch_first TEXT[] := ARRAY[
    'Maria Clara', 'Roberto Carlos', 'Elena Rose', 'Gregorio Ben', 'Antonio Luis',
    'Carmen Joy', 'Ferdinand Mark', 'Lourdes Grace', 'Annaliza Joy', 'Ricardo Jose',
    'Theresa Mae', 'Danilo Rey', 'Reynaldo Paz', 'Corazon Faith', 'Eduardo Noel',
    'Rosario Hope', 'Cecilia Dawn', 'Victorino Jay', 'Marites Luz', 'Rommel Ian',
    'Leandro Paul', 'Glenda Marie'
  ];
  v_tch_middle TEXT[] := ARRAY[
    'Reyes', 'Pascual', 'Gomez', 'Dela Cruz', 'Aquino',
    'Cruz', 'Castro', 'Bautista', 'Navarro', 'Agbayani',
    'Salazar', 'Mendoza', 'Ocampo', 'Villanueva', 'Ramos',
    'Mercado', 'Garcia', 'Torres', 'Soriano', 'Valdez',
    'Carpio', 'Domingo'
  ];
  v_tch_last TEXT[] := ARRAY[
    'Santos', 'Mendoza', 'Villanueva', 'Pagdilao', 'Pascual',
    'Bautista', 'Aquino', 'Ramos', 'Madamba', 'Agbayani',
    'Tolentino', 'Guerrero', 'Lagasca', 'Espiritu', 'Fernandez',
    'Macapagal', 'Fontanilla', 'Corpuz', 'Soriano', 'Duque',
    'Barrientos', 'Garvida'
  ];
  v_tch_dept TEXT[] := ARRAY[
    'JHS', 'JHS', 'JHS', 'JHS', 'JHS',
    'JHS', 'SHS', 'SHS', 'JHS', 'SHS',
    'JHS', 'JHS', 'SHS', 'JHS', 'SHS',
    'SHS', 'SHS', 'CROSS_LEVEL', 'CROSS_LEVEL', 'CROSS_LEVEL',
    'JHS', 'SHS'
  ];
  v_tch_is_pending BOOLEAN[] := ARRAY[
    false, false, false, true,  false,
    false, false, false, true,  false,
    false, false, true,  false, false,
    false, true,  false, false, true,
    false, true
  ];
  v_tch_profile_ids UUID[] := ARRAY[
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
    'a0000000-0000-4000-8000-000000000215'::UUID,
    'a0000000-0000-4000-8000-000000000216'::UUID,
    'a0000000-0000-4000-8000-000000000217'::UUID,
    'a0000000-0000-4000-8000-000000000218'::UUID,
    'a0000000-0000-4000-8000-000000000219'::UUID,
    'a0000000-0000-4000-8000-000000000220'::UUID,
    'a0000000-0000-4000-8000-000000000221'::UUID,
    'a0000000-0000-4000-8000-000000000222'::UUID
  ];
  v_active_tch_indices INT[] := ARRAY[1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 21];

  -- 8 Classrooms & Sections (40 Max Capacity per Classroom)
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
  v_sec_strands TEXT[] := ARRAY['Regular', 'SPS', 'Regular', 'Regular', 'Regular', 'Academic', 'Academic', 'TechPro'];

  v_sec_approved_target INT[] := ARRAY[31, 27, 33, 29, 32, 28, 30, 26];
  v_sec_pending_target INT[]  := ARRAY[6,  8,  4,  7,  5,  7,  6,  9];
  v_sec_revision_target INT[] := ARRAY[2,  3,  2,  2,  2,  3,  2,  2];
  v_sec_sched_days INT[]      := ARRAY[5, 4, 5, 3, 4, 4, 3, 3];

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

  i INT;
  s_idx INT;
  c_idx INT;
  v_stu_num INT;
  v_perm_slot INT;
  v_app_cut INT;
  v_pend_cut INT;
  v_rev_cut INT;
  v_gender TEXT;
  v_fname TEXT;
  v_mname TEXT;
  v_lname TEXT;
  v_lrn TEXT;
  v_stu_email TEXT;
  v_tch_email TEXT;
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
  v_random_hours INT;
  v_random_mins INT;

  v_sections_json JSONB := '[]'::JSONB;
  v_invitations_json JSONB := '[]'::JSONB;
  v_schedules_json JSONB := '[]'::JSONB;

  v_days TEXT[] := ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  v_day TEXT;
  v_sched_uid UUID;
  v_subj_code TEXT;
  v_subj_name TEXT;
  v_tch_idx INT;
  v_adviser_idx INT;
  v_tmp_uid UUID;
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

  v_teacher_pw := extensions.crypt('Teacher@123', extensions.gen_salt('bf'));
  v_student_pw := extensions.crypt('Student@123', extensions.gen_salt('bf'));

  -- 0. Detect or initialize active academic term
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

  -- 1. Clean up previous seed data in strict foreign-key order
  DELETE FROM public.enrollment_applications
   WHERE application_id LIKE 'DNHS-2026-SEED-%'
      OR application_id LIKE 'DNHS-2026-99%'
      OR student_id IN (SELECT id FROM public.students WHERE student_id LIKE '100050260%');

  DELETE FROM public.class_schedules;
  DELETE FROM public.course_subjects;
  DELETE FROM public.system_settings WHERE key = 'subjects_config';

  DELETE FROM public.students WHERE student_id LIKE '100050260%';
  DELETE FROM public.teachers WHERE teacher_id LIKE 'DNHS-TCH-1%';
  DELETE FROM public.users
   WHERE user_id LIKE 'DNHS-TCH-1%'
      OR user_id LIKE 'DNHS-STU-2%'
      OR email LIKE 'teacher%@dnhs.edu.ph'
      OR email LIKE 'student%@gmail.com';

  DELETE FROM auth.identities
   WHERE user_id IN (
     SELECT id FROM auth.users
      WHERE email LIKE 'teacher%@dnhs.edu.ph'
         OR email LIKE 'student%@gmail.com'
   );

  DELETE FROM auth.users
   WHERE email LIKE 'teacher%@dnhs.edu.ph'
      OR email LIKE 'student%@gmail.com';

  -- Update course_subjects check constraint while table is empty
  BEGIN
    ALTER TABLE public.course_subjects DROP CONSTRAINT IF EXISTS course_subjects_subject_type_check;
    ALTER TABLE public.course_subjects ADD CONSTRAINT course_subjects_subject_type_check
      CHECK (subject_type IN ('Core', 'Elective', 'Applied', 'Specialized', 'Intervention'));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Insert official curriculum subjects (matching DEFAULT_FALLBACK_SUBJECTS without duplicates)
  INSERT INTO public.course_subjects (subject_code, subject_name, subject_type, grade_level, trimester, strand)
  VALUES
    ('JHS-VAL7',  'Values Education (EsP)',                       'Core',         7,  1, 'Regular'),
    ('JHS-FIL7',  'Filipino',                                     'Core',         7,  1, 'Regular'),
    ('JHS-ENG7',  'English',                                      'Core',         7,  1, 'Regular'),
    ('JHS-SCI7',  'Science',                                      'Core',         7,  1, 'Regular'),
    ('JHS-MTH7',  'Mathematics',                                  'Core',         7,  1, 'Regular'),
    ('JHS-AP7',   'Araling Panlipunan',                           'Core',         7,  1, 'Regular'),
    ('JHS-TLE7',  'Technology & Livelihood Education (TLE)',      'Core',         7,  1, 'Regular'),
    ('JHS-MAP7',  'MAPEH (Music, Arts, PE, Health)',              'Core',         7,  1, 'Regular'),
    ('JHS-SPS7',  'General Sports & Athletic Training',           'Specialized',  7,  1, 'SPS'),
    ('JHS-ARAL7', 'ARAL Program (Academic Recovery)',             'Intervention', 7,  1, 'Regular'),
    ('JHS-VAL8',  'Values Education (EsP)',                       'Core',         8,  1, 'Regular'),
    ('JHS-FIL8',  'Filipino',                                     'Core',         8,  1, 'Regular'),
    ('JHS-ENG8',  'English',                                      'Core',         8,  1, 'Regular'),
    ('JHS-SCI8',  'Science',                                      'Core',         8,  1, 'Regular'),
    ('JHS-MTH8',  'Mathematics',                                  'Core',         8,  1, 'Regular'),
    ('JHS-AP8',   'Araling Panlipunan',                           'Core',         8,  1, 'Regular'),
    ('JHS-TLE8',  'Technology & Livelihood Education (TLE)',      'Core',         8,  1, 'Regular'),
    ('JHS-MAP8',  'MAPEH (Music, Arts, PE, Health)',              'Core',         8,  1, 'Regular'),
    ('JHS-SPS8',  'General Sports & Athletic Training',           'Specialized',  8,  1, 'SPS'),
    ('JHS-VAL9',  'Values Education (EsP)',                       'Core',         9,  1, 'Regular'),
    ('JHS-FIL9',  'Filipino',                                     'Core',         9,  1, 'Regular'),
    ('JHS-ENG9',  'English',                                      'Core',         9,  1, 'Regular'),
    ('JHS-SCI9',  'Science',                                      'Core',         9,  1, 'Regular'),
    ('JHS-MTH9',  'Mathematics',                                  'Core',         9,  1, 'Regular'),
    ('JHS-AP9',   'Araling Panlipunan',                           'Core',         9,  1, 'Regular'),
    ('JHS-TLE9',  'Technology & Livelihood Education (TLE)',      'Core',         9,  1, 'Regular'),
    ('JHS-MAP9',  'MAPEH (Music, Arts, PE, Health)',              'Core',         9,  1, 'Regular'),
    ('JHS-SPS9',  'General Sports & Athletic Training',           'Specialized',  9,  1, 'SPS'),
    ('JHS-VAL10', 'Values Education (EsP)',                       'Core',         10, 1, 'Regular'),
    ('JHS-FIL10', 'Filipino',                                     'Core',         10, 1, 'Regular'),
    ('JHS-ENG10', 'English',                                      'Core',         10, 1, 'Regular'),
    ('JHS-SCI10', 'Science',                                      'Core',         10, 1, 'Regular'),
    ('JHS-MTH10', 'Mathematics',                                  'Core',         10, 1, 'Regular'),
    ('JHS-AP10',  'Araling Panlipunan',                           'Core',         10, 1, 'Regular'),
    ('JHS-TLE10', 'Technology & Livelihood Education (TLE)',      'Core',         10, 1, 'Regular'),
    ('JHS-MAP10', 'MAPEH (Music, Arts, PE, Health)',              'Core',         10, 1, 'Regular'),
    ('JHS-SPS10', 'General Sports & Athletic Training',           'Specialized',  10, 1, 'SPS'),
    ('SHS-EFFCOM11',       'Effective Communication / Mabisang Komunikasyon', 'Core', 11, 1, 'General'),
    ('SHS-GMATH11',        'General Mathematics',                     'Core',         11, 1, 'General'),
    ('SHS-GSCI11',         'General Science',                         'Core',         11, 1, 'General'),
    ('SHS-LCSKILLS11',     'Life and Career Skills',                  'Core',         11, 1, 'General'),
    ('SHS-KASAY11',        'Pag-aaral ng Kasaysayan at Lipunang Pilipino', 'Core',    11, 1, 'General'),
    ('ACAD-PHYS1',         'Physics 1',                               'Elective',     11, 1, 'Academic'),
    ('ACAD-CHEM1',         'Chemistry 1',                             'Elective',     11, 1, 'Academic'),
    ('ACAD-BIO1',          'Biology 1',                               'Elective',     11, 1, 'Academic'),
    ('ACAD-MALIKPAG',      'Malikhaing Pagsulat',                     'Elective',     11, 1, 'Academic'),
    ('ACAD-GOV',           'Philippine Governance (Politics and Governance)', 'Elective', 11, 1, 'Academic'),
    ('ACAD-SOCSCI',        'Social Sciences (Theory and Practice)',   'Elective',     11, 1, 'Academic'),
    ('ACAD-PRECAL1',       'Pre-calculus 1',                          'Elective',     12, 1, 'Academic'),
    ('ACAD-ADVMATH1',      'Advanced Mathematics 1',                  'Elective',     12, 1, 'Academic'),
    ('ACAD-RESMETH',       'Research Methods',                        'Applied',      12, 1, 'Academic'),
    ('TECH-JAVA',          'Computer Programming (Java NC III)',      'Specialized',  11, 1, 'TechPro'),
    ('TECH-DOTNET',        'Computer Programming (.Net Technology NC III)', 'Specialized', 11, 1, 'TechPro'),
    ('TECH-CSS',           'Computer Systems Servicing (NC II)',      'Specialized',  11, 1, 'TechPro'),
    ('TECH-WORKIMMERSION', 'Work Immersion (Mandatory TechPro Apprenticeship)', 'Specialized', 12, 1, 'TechPro')
  ON CONFLICT (subject_code) DO UPDATE
    SET subject_name = EXCLUDED.subject_name,
        subject_type = EXCLUDED.subject_type,
        grade_level  = EXCLUDED.grade_level,
        strand       = EXCLUDED.strand;

  -- 2. Seed 8 Physical Classrooms (Capacity = 40 Max Students per Classroom)
  FOR c_idx IN 1..8 LOOP
    INSERT INTO public.classrooms (id, classroom_id, room_name, building, capacity)
    VALUES (
      v_room_uuids[c_idx],
      v_room_codes[c_idx],
      v_room_names[c_idx],
      v_room_bldgs[c_idx],
      40
    )
    ON CONFLICT (classroom_id) DO UPDATE
      SET room_name = EXCLUDED.room_name,
          building  = EXCLUDED.building,
          capacity  = 40
    RETURNING id INTO v_tmp_uid;
    v_room_uuids[c_idx] := v_tmp_uid;
  END LOOP;

  -- 3. Seed 22 Teachers (16 Active Onboarded + 6 Pending Invitations interleaved)
  FOR i IN 1..22 LOOP
    v_tch_email := 'teacher' || i::text || '@dnhs.edu.ph';

    IF NOT v_tch_is_pending[i] THEN
      v_auth_uid := ('a0000000-0000-4000-8000-000000000' || LPAD((100 + i)::text, 3, '0'))::UUID;

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        v_instance_id,
        v_auth_uid,
        'authenticated',
        'authenticated',
        v_tch_email,
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

      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_auth_uid,
        v_auth_uid::text,
        jsonb_build_object('sub', v_auth_uid::text, 'email', v_tch_email, 'email_verified', true),
        'email',
        NOW(),
        NOW(),
        NOW()
      );

      INSERT INTO public.users (id, user_id, email, user_role)
      VALUES (
        v_auth_uid,
        'DNHS-TCH-' || LPAD((100 + i)::text, 3, '0'),
        v_tch_email,
        'teacher'
      )
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            user_role = 'teacher';

      INSERT INTO public.teachers (
        id, user_id, teacher_id, first_name, middle_name, last_name, email, department
      ) VALUES (
        v_tch_profile_ids[i],
        v_auth_uid,
        'DNHS-TCH-' || LPAD((100 + i)::text, 3, '0'),
        v_tch_first[i],
        v_tch_middle[i],
        v_tch_last[i],
        v_tch_email,
        v_tch_dept[i]
      )
      ON CONFLICT (teacher_id) DO UPDATE
        SET user_id     = EXCLUDED.user_id,
            first_name  = EXCLUDED.first_name,
            middle_name = EXCLUDED.middle_name,
            last_name   = EXCLUDED.last_name,
            email       = EXCLUDED.email,
            department  = EXCLUDED.department
      RETURNING id INTO v_tmp_uid;
      v_tch_profile_ids[i] := v_tmp_uid;

      v_invitations_json := v_invitations_json || jsonb_build_array(
        jsonb_build_object(
          'id', 'inv-seed-tch-' || i,
          'email', v_tch_email,
          'role', 'teacher',
          'fullName', v_tch_first[i] || ' ' || v_tch_middle[i] || ' ' || v_tch_last[i],
          'department', v_tch_dept[i],
          'token', 'tok-accepted-tch-' || LPAD(i::text, 2, '0'),
          'status', 'accepted',
          'invitedAt', (NOW() - ((25 - i) || ' days')::INTERVAL)::text,
          'acceptedAt', (NOW() - ((23 - i) || ' days')::INTERVAL)::text,
          'expiresAt', (NOW() + INTERVAL '30 days')::text
        )
      );
    ELSE
      v_invitations_json := v_invitations_json || jsonb_build_array(
        jsonb_build_object(
          'id', 'inv-seed-tch-' || i,
          'email', v_tch_email,
          'role', 'teacher',
          'fullName', v_tch_first[i] || ' ' || v_tch_middle[i] || ' ' || v_tch_last[i],
          'department', v_tch_dept[i],
          'token', 'tok-pending-tch-' || LPAD(i::text, 2, '0'),
          'status', 'pending',
          'invitedAt', (NOW() - (((i % 5) + 1) || ' days')::INTERVAL)::text,
          'acceptedAt', NULL,
          'expiresAt', (NOW() + INTERVAL '30 days')::text
        )
      );
    END IF;
  END LOOP;

  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES ('staff_invitations', jsonb_build_object('invitations', v_invitations_json), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

  -- 4. Seed 8 Sections (Capacity = 40 Max per Classroom)
  FOR c_idx IN 1..8 LOOP
    v_adviser_idx := v_active_tch_indices[c_idx];

    INSERT INTO public.sections (
      id, section_id, section_name, grade_level, strand, capacity, school_year
    ) VALUES (
      v_sec_uuids[c_idx],
      v_sec_codes[c_idx],
      v_sec_names[c_idx],
      v_sec_grades[c_idx],
      v_sec_strands[c_idx],
      40,
      v_active_sy
    )
    ON CONFLICT (section_id) DO UPDATE
      SET section_name = EXCLUDED.section_name,
          grade_level  = EXCLUDED.grade_level,
          strand       = EXCLUDED.strand,
          capacity     = 40,
          school_year  = v_active_sy
    RETURNING id INTO v_tmp_uid;
    v_sec_uuids[c_idx] := v_tmp_uid;

    v_sections_json := v_sections_json || jsonb_build_array(
      jsonb_build_object(
        'id', v_sec_uuids[c_idx]::text,
        'section_id', v_sec_codes[c_idx],
        'section_name', v_sec_names[c_idx],
        'grade_level', v_sec_grades[c_idx],
        'strand', v_sec_strands[c_idx],
        'room', v_room_names[c_idx] || ' (' || v_room_bldgs[c_idx] || ')',
        'adviser_name', v_tch_first[v_adviser_idx] || ' ' || v_tch_middle[v_adviser_idx] || ' ' || v_tch_last[v_adviser_idx],
        'capacity', 40,
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

  -- 5. Seed Deconflicted Class Schedules (31 of 40 slots filled = 77.5% complete)
  FOR c_idx IN 1..8 LOOP
    FOR i IN 1..v_sec_sched_days[c_idx] LOOP
      v_day := v_days[i];
      v_sched_uid := ('e0000000-0000-4000-8000-000000000' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'))::UUID;

      IF c_idx = 1 THEN
        v_subj_code := (ARRAY['JHS-ENG7','JHS-MTH7','JHS-SCI7','JHS-FIL7','JHS-AP7'])[i];
      ELSIF c_idx = 2 THEN
        v_subj_code := (ARRAY['JHS-SPS7','JHS-ENG7','JHS-MTH7','JHS-SCI7','JHS-FIL7'])[i];
      ELSIF c_idx = 3 THEN
        v_subj_code := (ARRAY['JHS-ENG8','JHS-MTH8','JHS-SCI8','JHS-FIL8','JHS-TLE8'])[i];
      ELSIF c_idx = 4 THEN
        v_subj_code := (ARRAY['JHS-ENG9','JHS-MTH9','JHS-SCI9','JHS-AP9','JHS-VAL9'])[i];
      ELSIF c_idx = 5 THEN
        v_subj_code := (ARRAY['JHS-ENG10','JHS-MTH10','JHS-SCI10','JHS-FIL10','JHS-AP10'])[i];
      ELSIF c_idx = 6 THEN
        v_subj_code := (ARRAY['SHS-EFFCOM11','SHS-GMATH11','SHS-GSCI11','ACAD-PHYS1','ACAD-CHEM1'])[i];
      ELSIF c_idx = 7 THEN
        v_subj_code := (ARRAY['SHS-EFFCOM11','SHS-GMATH11','SHS-GSCI11','ACAD-MALIKPAG','ACAD-GOV'])[i];
      ELSE
        v_subj_code := (ARRAY['SHS-LCSKILLS11','SHS-KASAY11','TECH-JAVA','TECH-DOTNET','TECH-CSS'])[i];
      END IF;

      SELECT subject_name INTO v_subj_name FROM public.course_subjects WHERE subject_code = v_subj_code LIMIT 1;

      v_tch_idx := v_active_tch_indices[((c_idx + i - 2) % 14) + 1];

      INSERT INTO public.class_schedules (
        id, schedule_id, subject_code, section_id, teacher_id, classroom_id,
        day_of_week, start_time, end_time, trimester, school_year
      ) VALUES (
        v_sched_uid,
        'SCH-SEED-' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'),
        v_subj_code,
        v_sec_uuids[c_idx],
        v_tch_profile_ids[v_tch_idx],
        v_room_uuids[c_idx],
        v_day,
        '08:00:00'::TIME,
        '09:30:00'::TIME,
        v_active_term,
        v_active_sy
      )
      ON CONFLICT (schedule_id) DO UPDATE
        SET subject_code = EXCLUDED.subject_code,
            section_id   = EXCLUDED.section_id,
            teacher_id   = EXCLUDED.teacher_id,
            classroom_id = EXCLUDED.classroom_id,
            day_of_week  = EXCLUDED.day_of_week,
            school_year  = EXCLUDED.school_year;

      v_schedules_json := v_schedules_json || jsonb_build_array(
        jsonb_build_object(
          'id', v_sched_uid::text,
          'schedule_id', 'SCH-SEED-' || LPAD(((c_idx - 1) * 5 + i)::text, 3, '0'),
          'section_id', v_sec_uuids[c_idx]::text,
          'section_name', v_sec_names[c_idx],
          'teacher_id', v_tch_profile_ids[v_tch_idx]::text,
          'teacher_name', v_tch_first[v_tch_idx] || ' ' || v_tch_middle[v_tch_idx] || ' ' || v_tch_last[v_tch_idx],
          'teacher_email', 'teacher' || v_tch_idx::text || '@dnhs.edu.ph',
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

  -- 6. Seed 320 Students (40 Max per Classroom x 8 Classrooms, Interleaved Statuses)
  FOR c_idx IN 1..8 LOOP
    v_grade    := v_sec_grades[c_idx];
    v_strand   := v_sec_strands[c_idx];
    v_sec_id   := v_sec_uuids[c_idx];
    v_sec_name := v_sec_names[c_idx];

    v_app_cut  := v_sec_approved_target[c_idx];
    v_pend_cut := v_app_cut + v_sec_pending_target[c_idx];
    v_rev_cut  := v_pend_cut + v_sec_revision_target[c_idx];

    FOR s_idx IN 1..40 LOOP
      v_stu_num := (c_idx - 1) * 40 + s_idx;
      v_perm_slot := (((s_idx * 17) + (c_idx * 13)) % 40) + 1;

      IF (((v_stu_num * 11) + c_idx) % 2) = 1 THEN
        v_gender := 'Male';
        v_fname  := INITCAP(v_first_names_m[(((v_stu_num * 7) + (c_idx * 3)) % array_length(v_first_names_m, 1)) + 1]);
      ELSE
        v_gender := 'Female';
        v_fname  := INITCAP(v_first_names_f[(((v_stu_num * 7) + (c_idx * 3)) % array_length(v_first_names_f, 1)) + 1]);
      END IF;

      v_mname := INITCAP(v_middle_names[(((v_stu_num * 9) + s_idx) % array_length(v_middle_names, 1)) + 1]);
      v_lname := INITCAP(v_last_names[(((v_stu_num * 13) + (c_idx * 5)) % array_length(v_last_names, 1)) + 1]);

      v_lrn       := '100050260' || LPAD(v_stu_num::text, 3, '0');
      v_stu_email := 'student' || LPAD(v_stu_num::text, 3, '0') || '@gmail.com';
      v_stu_code  := 'DNHS-STU-' || (20000 + v_stu_num)::text;
      v_brgy      := v_barangays[(((v_stu_num * 5) + c_idx) % 4) + 1];
      v_contact   := '0917' || LPAD((3000000 + (v_stu_num * 219))::text, 7, '0');
      v_bday      := MAKE_DATE(2026 - (v_grade + 5), (((v_stu_num * 3) % 12) + 1), (((v_stu_num * 7) % 27) + 1));

      v_auth_uid := ('b0000000-0000-4000-8000-000000001' || LPAD(v_stu_num::text, 3, '0'))::UUID;
      v_stu_uid  := ('b0000000-0000-4000-8000-000000002' || LPAD(v_stu_num::text, 3, '0'))::UUID;
      v_app_uid  := ('b0000000-0000-4000-8000-000000003' || LPAD(v_stu_num::text, 3, '0'))::UUID;

      IF v_perm_slot <= v_app_cut THEN
        v_status          := 'Approved';
        v_assigned_sec_id := v_sec_id;
        v_feedback        := 'Documents verified and enrollment approved. Assigned to ' || v_sec_name || '.';
      ELSIF v_perm_slot <= v_pend_cut THEN
        v_status          := 'Pending';
        v_assigned_sec_id := NULL;
        v_feedback        := NULL;
      ELSIF v_perm_slot <= v_rev_cut THEN
        v_status          := 'Needs Revision';
        v_assigned_sec_id := NULL;
        v_feedback        := v_revision_reasons[((v_stu_num + c_idx) % array_length(v_revision_reasons, 1)) + 1];
      ELSE
        v_status          := 'UNSUBMITTED';
        v_assigned_sec_id := NULL;
        v_feedback        := NULL;
      END IF;

      IF v_grade = 7 THEN
        v_app_type := 'Grade 7';
      ELSIF v_grade = 11 THEN
        v_app_type := 'Grade 11';
      ELSIF ((v_stu_num % 11) = 0) THEN
        v_app_type := 'Transferee';
      ELSE
        v_app_type := 'Returning';
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

      INSERT INTO public.users (id, user_id, email, user_role)
      VALUES (v_auth_uid, v_stu_code, v_stu_email, 'student')
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            user_role = 'student';

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

      IF v_status <> 'UNSUBMITTED' THEN
        IF c_idx = 6 THEN
          v_electives := '["ACAD-PHYS1", "ACAD-CHEM1"]'::JSONB;
        ELSIF c_idx = 7 THEN
          v_electives := '["ACAD-MALIKPAG", "ACAD-GOV"]'::JSONB;
        ELSIF c_idx = 8 THEN
          v_electives := '["TECH-JAVA", "TECH-CSS"]'::JSONB;
        ELSIF c_idx = 2 THEN
          v_electives := '["JHS-SPS7"]'::JSONB;
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
            'isIp', CASE WHEN (v_stu_num % 9) = 0 THEN 'Yes' ELSE 'No' END,
            'is4ps', CASE WHEN (v_stu_num % 4) = 0 THEN 'Yes' ELSE 'No' END,
            'isPwd', 'No',
            'currentSitio', 'Purok ' || ((v_stu_num % 7) + 1)::text,
            'currentBarangay', v_brgy,
            'currentMunicipality', 'Dumalneg',
            'currentProvince', 'Ilocos Norte',
            'currentZipCode', '2921',
            'sameAddress', true,
            'fatherFirstName', INITCAP(v_first_names_m[((v_stu_num * 3) % array_length(v_first_names_m, 1)) + 1]),
            'fatherLastName', v_lname,
            'fatherContact', v_contact,
            'motherFirstName', INITCAP(v_first_names_f[((v_stu_num * 5) % array_length(v_first_names_f, 1)) + 1]),
            'motherLastName', v_mname,
            'motherContact', v_contact,
            'guardianRelationship', 'Parents',
            'gradeLevel', v_grade::text,
            'enrolleeType', CASE
              WHEN v_grade = 7 THEN 'New Entrant (Grade 7)'
              WHEN v_grade = 11 THEN 'SHS Entrant (Grade 11)'
              WHEN (v_stu_num % 11) = 0 THEN 'Transferee'
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

        v_random_hours := (((v_stu_num * 73) + (c_idx * 19)) % 360) + 2;
        v_random_mins  := (v_stu_num * 37) % 59;

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
          NOW() - (v_random_hours || ' hours')::INTERVAL - (v_random_mins || ' minutes')::INTERVAL,
          NOW() - ((v_random_hours / 2) || ' hours')::INTERVAL
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
              created_at          = EXCLUDED.created_at,
              updated_at          = EXCLUDED.updated_at;
      END IF;
    END LOOP;
  END LOOP;
END $$;

SELECT
  s.section_name AS "Classroom / Section",
  s.grade_level AS "Grade",
  s.strand AS "Program / Track",
  s.capacity AS "Max Capacity",
  COUNT(st.id) FILTER (WHERE st.current_section_id = s.id) AS "Enrolled",
  ROUND((COUNT(st.id) FILTER (WHERE st.current_section_id = s.id)::NUMERIC / s.capacity) * 100, 1) || '%' AS "Fill Rate",
  (s.capacity - COUNT(st.id) FILTER (WHERE st.current_section_id = s.id)) AS "Open Seats Remaining"
FROM public.sections s
LEFT JOIN public.students st ON st.current_section_id = s.id
WHERE s.section_id LIKE 'SEC-G%'
GROUP BY s.id, s.section_name, s.grade_level, s.strand, s.capacity
ORDER BY s.grade_level, s.section_name;
