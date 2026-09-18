-- ==============================================================================
-- DUMAL-NEXT: DEPED BASIC EDUCATION ENROLLMENT FORM (REVISED 06/01/2025) MIGRATION
-- Aligns 'students' and 'enrollment_applications' tables with official DepEd fields
-- ==============================================================================

-- 1. ADD OFFICIAL DEPED FIELDS TO 'students' TABLE
ALTER TABLE public.students 
    ADD COLUMN IF NOT EXISTS "lrn" VARCHAR(12),
    ADD COLUMN IF NOT EXISTS "psaBirthCertNo" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "extensionName" VARCHAR(10), -- Jr., III, IV, etc.
    ADD COLUMN IF NOT EXISTS "placeOfBirth" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "religion" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "motherTongue" VARCHAR(50),
    
    -- Indigenous Peoples (IP) Community (Vital for Dumalneg Ancestral Domain)
    ADD COLUMN IF NOT EXISTS "isIpCommunity" BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "ipCommunityName" VARCHAR(100),
    
    -- 4Ps Beneficiary Data
    ADD COLUMN IF NOT EXISTS "is4psBeneficiary" BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "householdId4ps" VARCHAR(30),
    
    -- Current Residential Address
    ADD COLUMN IF NOT EXISTS "currentHouseNo" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "currentSitio" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "currentBarangay" VARCHAR(100) DEFAULT 'Cabaritan',
    ADD COLUMN IF NOT EXISTS "currentMunicipality" VARCHAR(100) DEFAULT 'Dumalneg',
    ADD COLUMN IF NOT EXISTS "currentProvince" VARCHAR(100) DEFAULT 'Ilocos Norte',
    ADD COLUMN IF NOT EXISTS "currentCountry" VARCHAR(50) DEFAULT 'Philippines',
    ADD COLUMN IF NOT EXISTS "currentZipCode" VARCHAR(10) DEFAULT '2921',
    
    -- Permanent Residential Address
    ADD COLUMN IF NOT EXISTS "isPermanentSameAsCurrent" BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS "permanentHouseNo" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "permanentSitio" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "permanentBarangay" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "permanentMunicipality" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "permanentProvince" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "permanentCountry" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "permanentZipCode" VARCHAR(10),
    
    -- Parent & Legal Guardian Details
    ADD COLUMN IF NOT EXISTS "fatherLastName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "fatherFirstName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "fatherMiddleName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "fatherContactNumber" VARCHAR(20),
    
    ADD COLUMN IF NOT EXISTS "motherMaidenLastName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "motherFirstName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "motherMiddleName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "motherContactNumber" VARCHAR(20),
    
    ADD COLUMN IF NOT EXISTS "guardianLastName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "guardianFirstName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "guardianMiddleName" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "guardianContactNumber" VARCHAR(20),
    
    -- Special Needs Education (SNEd) Program
    ADD COLUMN IF NOT EXISTS "isSned" BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "snedCategory" VARCHAR(50), -- 'Diagnosis' or 'Manifestations'
    ADD COLUMN IF NOT EXISTS "snedDetails" JSONB DEFAULT '[]'::jsonb, -- Array of selected conditions
    ADD COLUMN IF NOT EXISTS "hasPwdId" BOOLEAN DEFAULT FALSE;

-- 2. ADD OFFICIAL DEPED ENROLLMENT SNAPSHOT FIELDS TO 'enrollment_applications'
ALTER TABLE public.enrollment_applications
    ADD COLUMN IF NOT EXISTS "isGraded" BOOLEAN DEFAULT TRUE, -- Graded vs Non-Graded (SNEd)
    ADD COLUMN IF NOT EXISTS "targetTrack" VARCHAR(50), -- Academic, TVL
    
    -- For Returning Learner (Balik-Aral) and Transferee / Move-In
    ADD COLUMN IF NOT EXISTS "lastGradeCompleted" INT,
    ADD COLUMN IF NOT EXISTS "lastSchoolYearCompleted" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "lastSchoolAttended" VARCHAR(150),
    ADD COLUMN IF NOT EXISTS "lastSchoolId" VARCHAR(10), -- 6-digit DepEd School ID
    
    -- Distance Learning Modality Preferences (Section 8)
    ADD COLUMN IF NOT EXISTS "preferredModalities" JSONB DEFAULT '[]'::jsonb;
