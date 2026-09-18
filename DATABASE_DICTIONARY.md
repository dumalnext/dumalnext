# DUMAL-NEXT: TECHNICAL DATA DICTIONARY & DATABASE SPECIFICATION
**Institution**: Mariano Marcos State University (MMSU) - College of Computing and Information Sciences  
**Department**: Department of Information Technology  
**Project Title**: Dumal-NEXT: Enrollment System for Dumalneg National High School  
**Proponents**: Lozano, Digap, Julian, Magdaong, Tumpap  
**Policy Alignment**: **DepEd ORDER No. 009, s. 2026** (Guidelines on the Implementation of the Three-Term School Calendar in Basic Education)  
**System Architecture**: Strictly Aligned with Lab Activity 4 (Class Diagram) & Lab Activity 5 (Architecture)

---

## 1. PANGKALAHATANG ARKITEKTURA NG DATABASE (OVERVIEW)

Ang database ng **Dumal-NEXT** ay dinisenyo sa **PostgreSQL / Supabase** na sumusunod sa:
1. **Third Normal Form (3NF)**: Walang redundant data o update anomalies.
2. **Strict DepEd Order No. 009, s. 2026 Compliance**:
   - Pormal na pagpapatupad ng **Three-Term School Calendar** (Term 1, Term 2, Term 3) para sa kabuuang **201 Class Days** sa SY 2026–2027.
   - **Late Enrollment Hard Cutoff**: Hulyo 28, 2026 (Ika-2 Summative Assessment sa Term 1 ayon sa Item 34).
   - **Senior High School Core Limit**: Eksaktong limang (5) Core Subjects bawat trisem ayon sa Table 6 ng Kautusan.
3. **Inheritance (Is-A Hierarchy)**: Ang `User` class ang base table para sa `Student`, `Teacher`, `SchoolAdministrator`, at `ITSupport`.
4. **Row-Level Security (RLS)**: Proteksyon sa kernel-level ng PostgreSQL kung saan nakahiwalay ang access ng estudyante, guro, at kawani.

---

## 2. COMPREHENSIVE DATA DICTIONARY (MGA TALAHANAYAN)

---

### TABLE 1: `users` (Base Authentication Class)
Sentral na lagakan ng account credentials para sa lahat ng 4 na aktor.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | VARCHAR(20) | No | UNIQUE | None | Opisyal na DNHS account ID (e.g., DNHS-2026-001) |
| `email` | VARCHAR(100) | No | UNIQUE | None | Email address ng account |
| `password` | VARCHAR(255) | No | None | None | Hashed security password |
| `userRole` | VARCHAR(50) | No | CHECK | None | 'student', 'teacher', 'admin', 'it_support' |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa kung kailan ginawa |
| `updatedAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng huling pagbabago |

---

### TABLE 2: `students` (Sub-Class ng User)
Naglalaman ng personal at akademikong tala ng bawat estudyante ng Dumalneg NHS.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `studentID` | VARCHAR(20) | No | UNIQUE | None | Learner Reference Number (LRN) / Student ID |
| `firstName` | VARCHAR(50) | No | None | None | Unang pangalan |
| `middleName` | VARCHAR(50) | Yes | None | NULL | Gitnang pangalan |
| `lastName` | VARCHAR(50) | No | None | None | Apelyido |
| `dateOfBirth` | DATE | Yes | None | NULL | Araw ng kapanganakan |
| `gender` | VARCHAR(10) | Yes | None | NULL | Kasarian |
| `contactNumber`| VARCHAR(20) | Yes | None | NULL | Contact number ng mag-aaral/magulang |
| `barangay` | VARCHAR(100) | No | None | None | Barangay sa Dumalneg (e.g., Cabaritan, Kalaw, San Isidro) |
| `gradeLevel` | INT | No | CHECK (7-12) | None | Antas (Grade 7 hanggang 12) |
| `strand` | VARCHAR(50) | Yes | None | NULL | Strand kung Senior High (STEM, TVL, HUMSS, ABM) |
| `isReturning` | BOOLEAN | No | None | FALSE | TRUE kung auto-renewed na dating estudyante |
| `currentSectionId`| UUID | Yes | FOREIGN KEY | NULL | Kasalukuyang pangkat ng estudyante |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagkakatala |

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
Nangangasiwa sa mga teknikal na setting at role security ng Dumal-NEXT.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `itsupportID` | VARCHAR(20) | No | UNIQUE | None | IT Support Employee ID |
| `systemRole` | VARCHAR(50) | No | None | 'System Administrator' | Antas ng pribilehiyo |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagtala |

---

### TABLE 6: `academic_terms` (DepEd Order No. 009, s. 2026 Three-Term Calendar)
Opisyal na master table para sa tatlong termino ng Taong Panuruan 2026–2027.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `schoolYear` | VARCHAR(20) | No | None | '2026-2027' | Taong panuruan |
| `termNumber` | INT | No | CHECK (1-3) | None | Termino: 1, 2, o 3 |
| `termName` | VARCHAR(50) | No | None | None | Pangalan ng termino ('Term 1', 'Term 2', 'Term 3') |
| `totalClassDays`| INT | No | None | None | Kabuuang araw (Term 1: 69, Term 2: 65, Term 3: 67) |
| `startDate` | DATE | No | None | None | Petsa ng pagsisimula ng termino |
| `endDate` | DATE | No | None | None | Petsa ng pagtatapos ng termino |
| `openingBlockStart`| DATE | Yes | None | NULL | Simula ng BOSY Opening Block (June 8, 2026) |
| `openingBlockEnd` | DATE | Yes | None | NULL | Tapos ng BOSY Opening Block (June 11, 2026) |
| `instructionalStart`| DATE| No | None | None | Simula ng pagtuturo |
| `instructionalEnd` | DATE | No | None | None | Pagtatapos ng regular classes |
| `endOfTermStart` | DATE | No | None | None | Simula ng 10-day End-of-Term Block |
| `endOfTermEnd` | DATE | No | None | None | Pagtatapos ng End-of-Term Block |
| `summative1Date` | DATE | Yes | None | NULL | Petsa ng 1st Summative Test |
| `summative2Date` | DATE | Yes | None | NULL | Petsa ng 2nd Summative Test (**Late Enrollment Cutoff: July 28, 2026**) |
| `termExamDates` | VARCHAR(100)| Yes | None | NULL | Mga petsa ng Term Examinations |
| `reportCardDate` | DATE | No | None | None | Araw ng Pamamahagi ng Report Cards sa Magulang (PTC) |
| `isActive` | BOOLEAN | No | None | FALSE | TRUE kung ito ang kasalukuyang aktibong term |

---

### TABLE 7: `sections` (Mga Pangkat)
Nagtatakda ng mga seksyon at quota capacity.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `sectionId` | VARCHAR(20) | No | UNIQUE | None | Section Code (e.g., SEC-G7-RIZAL) |
| `sectionName` | TEXT | No | None | None | Buong pangalan ng seksyon |
| `gradeLevel` | INT | No | CHECK (7-12) | None | Antas ng klase |
| `strand` | VARCHAR(50) | Yes | None | NULL | Strand kung SHS; NULL kung JHS |
| `capacity` | INT | No | CHECK (> 0) | 40 | Quota capacity ng pangkat |
| `schoolYear` | VARCHAR(20) | No | None | '2026-2027' | Taong panuruan |

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
Sumusunod sa opisyal na DepEd 2026 Three-Term Curriculum (Table 5 at Table 6 ng DepEd Order No. 009, s. 2026).

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
| `schoolYear` | VARCHAR(20) | No | None | '2026-2027' | Taong panuruan |

---

### TABLE 11: `enrollment_applications` (Mga Aplikasyon sa Pagpapatala)
Nangangasiwa sa mga aplikasyon kasama ang Late Enrollment verification.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `applicationId` | VARCHAR(30) | No | UNIQUE | None | Tracking code para sa estudyante |
| `studentId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `students.id` |
| `applicantType` | VARCHAR(20) | No | CHECK | None | 'Grade 7', 'Grade 11', 'Transferee', 'Returning' |
| `schoolYear` | VARCHAR(20) | No | None | '2026-2027' | Taong panuruan ng aplikasyon |
| `targetGradeLevel`| INT | No | CHECK (7-12) | None | Antas na papasukan |
| `targetStrand` | VARCHAR(50) | Yes | None | NULL | Piniling strand kung Senior High |
| `status` | VARCHAR(20) | No | CHECK | 'Pending' | 'Pending', 'Approved', 'Needs Revision' |
| `isLateEnrollee` | BOOLEAN | No | None | FALSE | TRUE kung naisumite pagkalipas ng June 5, 2026 |
| `submittedDocuments`| JSONB | No | None | '[]'::jsonb | Mga paths ng dokumento sa S3 bucket |
| `selectedElectives` | JSONB | Yes | None | '[]'::jsonb | Mga piniling cross-strand electives |
| `adminFeedback` | TEXT | Yes | None | NULL | Dahilan kung minarkahang 'Needs Revision' |
| `reviewedBy` | UUID | Yes | FOREIGN KEY | NULL | Ugnayan sa `school_administrators.id` |
| `submissionDate`| DATE | No | None | CURRENT_DATE | Petsa ng pagsusumite |
