# DUMAL-NEXT: TECHNICAL DATA DICTIONARY & DATABASE SPECIFICATION
**Institution**: Mariano Marcos State University (MMSU) - College of Computing and Information Sciences  
**Department**: Department of Information Technology  
**Project Title**: Dumal-NEXT: Enrollment System for Dumalneg National High School  
**Proponents**: Lozano, Digap, Julian, Magdaong, Tumpap  
**System Architecture**: Strictly Aligned with Lab Activity 4 (Class Diagram) & Lab Activity 5 (Architecture)  
**Calendar Mechanism**: **Dynamic Academic Year & Three-Term Configuration** (Managed dynamically by IT Support / School Administrator)

---

## 1. PANGKALAHATANG ARKITEKTURA NG DATABASE (OVERVIEW)

Ang database ng **Dumal-NEXT** ay dinisenyo sa **PostgreSQL / Supabase** na sumusunod sa:
1. **Third Normal Form (3NF)**: Walang redundant data o update anomalies.
2. **Dinamikong Kalendaryo (Zero Hardcoded Dates)**:
   - Ang mga petsa ng school year, trimester start/end dates, exam dates, at report card distribution dates ay **HINDI naka-hardcode**.
   - Ito ay dinamikong inaayos, binabago, at pinapagana taon-taon ng **IT Support** o **School Administrator** sa pamamagitan ng kanilang portal ayon sa pinakabagong memo o DepEd Order ng gobyerno.
3. **Senior High School Core Limit & Cross-Strand Electives**:
   - Sinusunod ang patakaran na maximum 5 Core Subjects bawat trisem para sa SHS at pagpapahintulot sa cross-strand electives.
4. **Inheritance (Is-A Hierarchy)**: Ang `User` class ang base table para sa `Student`, `Teacher`, `SchoolAdministrator`, at `ITSupport`.
5. **Row-Level Security (RLS)**: Proteksyon sa kernel-level ng PostgreSQL kung saan nakahiwalay ang access ng bawat aktor.

---

## 2. COMPREHENSIVE DATA DICTIONARY (MGA TALAHANAYAN)

---

### TABLE 1: `users` (Base Authentication Class)
Sentral na lagakan ng account credentials para sa lahat ng 4 na aktor.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | VARCHAR(20) | No | UNIQUE | None | Opisyal na DNHS account ID (e.g., DNHS-USR-001) |
| `email` | VARCHAR(100) | No | UNIQUE | None | Email address ng account |
| `password` | VARCHAR(255) | No | None | None | Hashed security password |
| `userRole` | VARCHAR(50) | No | CHECK | None | 'student', 'teacher', 'admin', 'it_support' |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa kung kailan ginawa |
| `updatedAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng huling pagbabago |

---

### TABLE 2: `students` (Sub-Class ng User / Opisyal na Talaan ng Mag-aaral)
Naglalaman ng personal, kultural, tirahan, at akademikong tala ng bawat estudyante ng Dumalneg NHS alinsunod sa DepEd Basic Education Enrollment Form (Revised 06/01/2025).

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `studentID` | VARCHAR(20) | No | UNIQUE | None | DNHS Student ID / LRN Identifier |
| `lrn` | VARCHAR(12) | Yes | None | NULL | Opisyal na 12-digit DepEd Learner Reference Number |
| `psaBirthCertNo` | VARCHAR(50) | Yes | None | NULL | Numero ng PSA Birth Certificate |
| `firstName` | VARCHAR(50) | No | None | None | Unang pangalan |
| `middleName` | VARCHAR(50) | Yes | None | NULL | Gitnang pangalan |
| `lastName` | VARCHAR(50) | No | None | None | Apelyido |
| `extensionName` | VARCHAR(10) | Yes | None | NULL | Extension (e.g., Jr., III, IV) |
| `dateOfBirth` | DATE | Yes | None | NULL | Araw ng kapanganakan |
| `age` | INT | Yes | None | NULL | Edad ng mag-aaral |
| `gender` | VARCHAR(10) | Yes | CHECK | NULL | Kasarian ('Male', 'Female') |
| `placeOfBirth` | VARCHAR(100) | Yes | None | NULL | Bayan/Lungsod ng Kapanganakan |
| `religion` | VARCHAR(50) | Yes | None | NULL | Relihiyon ng mag-aaral |
| `motherTongue` | VARCHAR(50) | Yes | None | NULL | Katutubong wika (Ilokano, Isnag, atbp.) |
| `contactNumber`| VARCHAR(20) | Yes | None | NULL | Numero ng telepono |
| `isIpCommunity` | BOOLEAN | No | None | FALSE | TRUE kung kabilang sa Indigenous Peoples (IP) |
| `ipCommunityName`| VARCHAR(100)| Yes | None | NULL | Pangalan ng IP Community (e.g., Isnag, Tingguian) |
| `is4psBeneficiary`| BOOLEAN | No | None | FALSE | TRUE kung benepisyaryo ng 4Ps |
| `householdId4ps`| VARCHAR(30) | Yes | None | NULL | 16-digit 4Ps Household ID Number |
| `currentHouseNo`| VARCHAR(50) | Yes | None | NULL | House Number ng kasalukuyang tirahan |
| `currentSitio` | VARCHAR(100) | Yes | None | NULL | Sitio o kalye ng kasalukuyang tirahan |
| `currentBarangay`| VARCHAR(100)| No | None | 'Cabaritan' | Barangay (Cabaritan, Kalabakan, Quibel, San Isidro) |
| `currentMunicipality`| VARCHAR(100)| No | None | 'Dumalneg' | Munisipalidad |
| `currentProvince`| VARCHAR(100)| No | None | 'Ilocos Norte'| Lalawigan |
| `currentCountry`| VARCHAR(50) | No | None | 'Philippines'| Bansa |
| `currentZipCode`| VARCHAR(10) | No | None | '2921' | Postal Zip Code ng Dumalneg |
| `isPermanentSameAsCurrent`| BOOLEAN | No | None | TRUE | TRUE kung pareho ang kasalukuyan at permanenteng tirahan |
| `permanentHouseNo`| VARCHAR(50)| Yes | None | NULL | House Number ng permanenteng tirahan |
| `permanentSitio`| VARCHAR(100)| Yes | None | NULL | Sitio/Kalye ng permanenteng tirahan |
| `permanentBarangay`| VARCHAR(100)| Yes | None | NULL | Barangay ng permanenteng tirahan |
| `permanentMunicipality`| VARCHAR(100)| Yes | None | NULL | Munisipalidad ng permanenteng tirahan |
| `permanentProvince`| VARCHAR(100)| Yes | None | NULL | Lalawigan ng permanenteng tirahan |
| `permanentCountry`| VARCHAR(50)| Yes | None | NULL | Bansa ng permanenteng tirahan |
| `permanentZipCode`| VARCHAR(10)| Yes | None | NULL | Zip Code ng permanenteng tirahan |
| `fatherLastName`| VARCHAR(50)| Yes | None | NULL | Apelyido ng ama |
| `fatherFirstName`| VARCHAR(50)| Yes | None | NULL | Pangalan ng ama |
| `fatherMiddleName`| VARCHAR(50)| Yes | None | NULL | Gitnang pangalan ng ama |
| `fatherContactNumber`| VARCHAR(20)| Yes | None | NULL | Contact number ng ama |
| `motherMaidenLastName`| VARCHAR(50)| Yes | None | NULL | Apelyido sa pagkadalaga ng ina |
| `motherFirstName`| VARCHAR(50)| Yes | None | NULL | Pangalan ng ina |
| `motherMiddleName`| VARCHAR(50)| Yes | None | NULL | Gitnang pangalan ng ina |
| `motherContactNumber`| VARCHAR(20)| Yes | None | NULL | Contact number ng ina |
| `guardianLastName`| VARCHAR(50)| Yes | None | NULL | Apelyido ng legal guardian |
| `guardianFirstName`| VARCHAR(50)| Yes | None | NULL | Pangalan ng legal guardian |
| `guardianMiddleName`| VARCHAR(50)| Yes | None | NULL | Gitnang pangalan ng guardian |
| `guardianContactNumber`| VARCHAR(20)| Yes | None | NULL | Contact number ng guardian |
| `isSned` | BOOLEAN | No | None | FALSE | TRUE kung nasa ilalim ng Special Needs Education |
| `snedCategory` | VARCHAR(50) | Yes | None | NULL | 'Diagnosis' o 'Manifestations' |
| `snedDetails` | JSONB | Yes | None | '[]'::jsonb | Array ng mga na-diagnose o napansing kondisyon |
| `hasPwdId` | BOOLEAN | No | None | FALSE | TRUE kung may hawak na opisyal na PWD ID Card |
| `gradeLevel` | INT | No | CHECK (7-12) | None | Kasalukuyang antas (Grade 7 hanggang 12) |
| `strand` | VARCHAR(50) | Yes | None | NULL | Strand kung Senior High (STEM, TVL, HUMSS) |
| `isReturning` | BOOLEAN | No | None | FALSE | TRUE kung auto-renewed na dating estudyante |
| `currentSectionId`| UUID | Yes | FOREIGN KEY | NULL | Kasalukuyang pangkat ng estudyante |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagkakatala |
| `updatedAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng huling pagbabago |

---

### TABLE 3: `teachers` (Sub-Class ng User)
Profile ng kaguruan na may hawak ng JHS at SHS cross-level teaching loads.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `teacherID` | VARCHAR(20) | No | UNIQUE | None | Faculty Employee ID |
| `firstName` | VARCHAR(50) | No | None | None | Pangalan ng guro |
| `middleName` | VARCHAR(50) | Yes | None | NULL | Gitnang pangalan |
| `lastName` | VARCHAR(50) | No | None | None | Apelyido ng guro |
| `department` | VARCHAR(20) | No | CHECK | None | 'JHS', 'SHS', o 'CROSS_LEVEL' |
| `email` | VARCHAR(100) | Yes | None | NULL | Faculty email address |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagrehistro |

---

### TABLE 4: `school_administrators` (Sub-Class ng User)
Tanggapan ng punong-guro at kawaning humahalili sa mga tungkulin ng registrar.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `adminID` | VARCHAR(20) | No | UNIQUE | None | Administrator Employee ID |
| `firstName` | VARCHAR(50) | No | None | None | Pangalan ng tagapamahala |
| `lastName` | VARCHAR(50) | No | None | None | Apelyido ng tagapamahala |
| `department` | VARCHAR(50) | No | None | 'Academic Affairs' | Tanggapan ng admin |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagrehistro |

---

### TABLE 5: `it_supports` (Sub-Class ng User)
Nangangasiwa sa dynamic setup ng school year, academic terms, at role security ng Dumal-NEXT.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `itsupportID` | VARCHAR(20) | No | UNIQUE | None | IT Support Employee ID |
| `systemRole` | VARCHAR(50) | No | None | 'System Administrator' | Antas ng pribilehiyo |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagtala |

---

### TABLE 6: `academic_terms` (Dinamikong Kalendaryo na Iniaayos ng IT Support)
Naglalaman ng bawat taong panuruan at tatlong termino. **Walang hardcoded dates**—lahat ay mae-edit sa IT Support portal taon-taon.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `schoolYear` | VARCHAR(20) | No | None | None | Taong panuruan (e.g., '2026-2027', '2027-2028') |
| `termNumber` | INT | No | CHECK (1-3) | None | Termino: 1, 2, o 3 |
| `termName` | VARCHAR(50) | No | None | None | Pangalan ng termino ('Term 1', 'Term 2', 'Term 3') |
| `totalClassDays`| INT | Yes | None | NULL | Bilang ng araw ng klase sa terminong ito |
| `startDate` | DATE | Yes | None | NULL | Petsa ng pagsisimula ng termino |
| `endDate` | DATE | Yes | None | NULL | Petsa ng pagtatapos ng termino |
| `openingBlockStart`| DATE | Yes | None | NULL | Simula ng BOSY Opening Block |
| `openingBlockEnd` | DATE | Yes | None | NULL | Tapos ng BOSY Opening Block |
| `instructionalStart`| DATE| Yes | None | NULL | Simula ng regular na pagtuturo |
| `instructionalEnd` | DATE | Yes | None | NULL | Pagtatapos ng regular na pagtuturo |
| `endOfTermStart` | DATE | Yes | None | NULL | Simula ng End-of-Term Block |
| `endOfTermEnd` | DATE | Yes | None | NULL | Pagtatapos ng End-of-Term Block |
| `summative1Date` | DATE | Yes | None | NULL | Petsa ng 1st Summative Test |
| `summative2Date` | DATE | Yes | None | NULL | Petsa ng 2nd Summative Test (Late Enrollment Cutoff) |
| `termExamDates` | VARCHAR(100)| Yes | None | NULL | Mga petsa ng Term Examinations |
| `reportCardDate` | DATE | Yes | None | NULL | Araw ng Pamamahagi ng Report Cards sa Magulang (PTC) |
| `isActive` | BOOLEAN | No | None | FALSE | TRUE kung ito ang kasalukuyang aktibong term |

---

### TABLE 7: `sections` (Mga Pangkat)
Nagtatakda ng mga seksyon at quota capacity para sa bawat baitang at school year.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `sectionId` | VARCHAR(20) | No | UNIQUE | None | Section Code (e.g., SEC-G7-RIZAL) |
| `sectionName` | TEXT | No | None | None | Buong pangalan ng seksyon |
| `gradeLevel` | INT | No | CHECK (7-12) | None | Antas ng klase |
| `strand` | VARCHAR(50) | Yes | None | NULL | Strand kung SHS; NULL kung JHS |
| `capacity` | INT | No | CHECK (> 0) | 40 | Quota capacity ng pangkat |
| `schoolYear` | VARCHAR(20) | No | None | None | Taong panuruan ng seksyon |

---

### TABLE 8: `classrooms` (Mga Silid-Aralan)
Pasilidad ng paaralan upang maiwasan ang room clashes.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `classroomId` | VARCHAR(20) | No | UNIQUE | None | Room Code (e.g., RM-101, RM-201) |
| `roomName` | TEXT | No | None | None | Pangalan ng silid-aralan |
| `building` | TEXT | No | None | None | Gusali kung saan matatagpuan |
| `capacity` | INT | No | CHECK (> 0) | 40 | Seating capacity |

---

### TABLE 9: `course_subjects` (Mga Asignatura)
Sumusuporta sa mga asignatura para sa Junior at Senior High School bawat trimester.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `subjectCode` | VARCHAR(20) | No | UNIQUE | None | Subject Code (e.g., SHS-GMATH11-T1) |
| `subjectName` | TEXT | No | None | None | Buong pamagat ng asignatura |
| `subjectType` | VARCHAR(20) | No | CHECK | None | 'Core', 'Elective', 'Applied', 'Specialized', 'Intervention' |
| `gradeLevel` | INT | No | CHECK (7-12) | None | Antas kung saan iniaalok |
| `trimester` | INT | No | CHECK (1-3) | None | Term 1, Term 2, o Term 3 |
| `strand` | VARCHAR(50) | Yes | None | NULL | Nilalaan na strand o General |

---

### TABLE 10: `class_schedules` (Hub ng Deconfliction Engine)
Ugnayan ng oras, guro, silid, seksyon, at asignatura.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `scheduleId` | VARCHAR(30) | No | UNIQUE | None | Schedule reference code |
| `subjectCode` | VARCHAR(20) | No | FOREIGN KEY | None | Ugnayan sa `course_subjects.subjectCode` |
| `sectionId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `sections.id` |
| `teacherId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `teachers.id` (Cross-level load check) |
| `classroomId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `classrooms.id` (Silid-aralan check) |
| `dayOfWeek` | VARCHAR(10) | No | CHECK | None | 'Monday' hanggang 'Friday' |
| `startTime` | TIME | No | None | None | Simula ng klase (e.g., 08:00) |
| `endTime` | TIME | No | CHECK (> startTime)| None | Tapos ng klase (e.g., 09:00) |
| `trimester` | INT | No | CHECK (1-3) | None | Termino kung kailan gaganapin |
| `schoolYear` | VARCHAR(20) | No | None | None | Taong panuruan |

---

### TABLE 11: `enrollment_applications` (Mga Aplikasyon sa Pagpapatala)
Nangangasiwa sa mga aplikasyon kung saan ang status, academic snapshot, Balik-Aral/Transferee history, at learning modalities ay naka-align sa DepEd Basic Education Enrollment Form (Revised 06/01/2025).

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `applicationId` | VARCHAR(30) | No | UNIQUE | None | Tracking code para sa estudyante (e.g. DNHS-2026-0001) |
| `studentId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `students.id` |
| `applicantType` | VARCHAR(20) | No | CHECK | None | 'Grade 7', 'Grade 11', 'Transferee', 'Returning' |
| `schoolYear` | VARCHAR(20) | No | None | None | Taong panuruan ng aplikasyon |
| `isGraded` | BOOLEAN | No | None | TRUE | TRUE kung Graded; FALSE kung Non-Graded (SNEd Only) |
| `targetGradeLevel`| INT | No | CHECK (7-12) | None | Antas na papasukan (Grade 7 hanggang 12) |
| `targetTrack` | VARCHAR(50) | Yes | None | NULL | Senior High Track ('Academic Track', 'TVL Track') |
| `targetStrand` | VARCHAR(50) | Yes | None | NULL | Piniling strand kung Senior High (STEM, HUMSS, TVL) |
| `lastGradeCompleted`| INT | Yes | None | NULL | Huling antas na natapos (para sa Balik-Aral / Transferee) |
| `lastSchoolYearCompleted`| VARCHAR(20)| Yes | None | NULL | Huling taong panuruan na natapos |
| `lastSchoolAttended`| VARCHAR(150)| Yes | None | NULL | Pangalan ng dating pinapasukang paaralan |
| `lastSchoolId` | VARCHAR(10) | Yes | None | NULL | 6-digit opisyal na DepEd School ID ng dating paaralan |
| `preferredModalities`| JSONB | No | None | '[]'::jsonb | Array ng mga piniling modalities (Blended, Modular, atbp.) |
| `status` | VARCHAR(20) | No | CHECK | 'Pending' | 'Pending', 'Approved', 'Needs Revision' |
| `isLateEnrollee` | BOOLEAN | No | None | FALSE | TRUE kung lumampas sa regular registration window |
| `submittedDocuments`| JSONB | No | None | '[]'::jsonb | Mga paths at metadata ng dokumento sa S3 bucket |
| `selectedElectives` | JSONB | Yes | None | '[]'::jsonb | Mga piniling cross-strand electives (max 5 core limit) |
| `adminFeedback` | TEXT | Yes | None | NULL | Dahilan o komento kung minarkahang 'Needs Revision' |
| `reviewedBy` | UUID | Yes | FOREIGN KEY | NULL | Ugnayan sa `school_administrators.id` |
| `submissionDate`| DATE | No | None | CURRENT_DATE | Petsa ng pagsusumite |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa at oras ng pagpasa |
| `updatedAt` | TIMESTAMPTZ | No | None | NOW() | Petsa at oras ng huling pagsusuri |
