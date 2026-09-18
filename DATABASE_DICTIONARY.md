# DUMAL-NEXT: TECHNICAL DATA DICTIONARY & DATABASE SPECIFICATION
**Institution**: Mariano Marcos State University (MMSU) - College of Computing and Information Sciences  
**Department**: Department of Information Technology  
**Project Title**: Dumal-NEXT: Enrollment System for Dumalneg National High School  
**Proponents**: Lozano, Digap, Julian, Magdaong, Tumpap  
**Document Classification**: Database Design & Schema Specification (Lab Activity 4 & 5 Compliance)

---

## 1. PANGKALAHATANG ARKITEKTURA NG DATABASE (OVERVIEW)

Ang database ng **Dumal-NEXT** ay dinisenyo gamit ang **PostgreSQL** (sa pamamagitan ng Supabase) at mahigpit na nakahanay sa **Class Diagram (Activity 4, Pahina 9)** at **MVC Model Layer (Activity 5, Pahina 5 at 8)**.

### Pangunahing Katangian ng Database:
1. **Third Normal Form (3NF) Compliance**: Normalized ang lahat ng tables upang maiwasan ang redundancy, update anomalies, at data duplication.
2. **Inheritance (Is-A Relationship)**: Ang `User` ang base authentication entity, at minamana (inherits) ito ng apat na pangunahing aktor: `Student`, `Teacher`, `SchoolAdministrator`, at `ITSupport`.
3. **Database-Level Integrity Constraints**: Mayroong mga check constraints para sa grade levels (Grade 7 hanggang 12), trimestral terms (Trimester 1, 2, 3), at schedule chronological order (`startTime < endTime`).
4. **Row-Level Security (RLS)**: Pinoprotektahan ang mga sensitive records sa kernel level ng PostgreSQL kung saan ang mga mag-aaral ay may access lamang sa kanilang sariling profile at application.

---

## 2. COMPREHENSIVE DATA DICTIONARY (MGA TALAHANAYAN)

---

### TABLE 1: `users` (Base Class: Authentication & RBAC)
Nagsisilbing sentral na lagakan ng account credentials at identity verification para sa lahat ng aktor.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Natatanging internal identifier ng record |
| `userId` | VARCHAR(20) | No | UNIQUE | None | Opisyal na DNHS account ID (e.g., DNHS-2026-001) |
| `email` | VARCHAR(100) | No | UNIQUE | None | Email address para sa authentication at notices |
| `password` | VARCHAR(255) | No | None | None | Encrypted/hashed password ng user |
| `userRole` | VARCHAR(50) | No | CHECK | None | Tungkulin: 'student', 'teacher', 'admin', 'it_support' |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa at oras kung kailan ginawa ang account |
| `updatedAt` | TIMESTAMPTZ | No | None | NOW() | Petsa at oras ng huling pagbabago |

---

### TABLE 2: `students` (Sub-Class: Mag-aaral)
Naglalaman ng personal, demograpiko, at akademikong impormasyon ng bawat mag-aaral ng Dumalneg NHS.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `studentID` | VARCHAR(20) | No | UNIQUE | None | Learner Reference Number (LRN) o DNHS Student ID |
| `firstName` | VARCHAR(50) | No | None | None | Unang pangalan ng mag-aaral |
| `middleName` | VARCHAR(50) | Yes | None | NULL | Gitnang pangalan ng mag-aaral |
| `lastName` | VARCHAR(50) | No | None | None | Apelyido ng mag-aaral |
| `dateOfBirth` | DATE | Yes | None | NULL | Araw ng kapanganakan |
| `gender` | VARCHAR(10) | Yes | None | NULL | Kasarian ng mag-aaral |
| `contactNumber`| VARCHAR(20) | Yes | None | NULL | Mobile contact number ng mag-aaral o magulang |
| `barangay` | VARCHAR(100) | No | None | None | Barangay sa Dumalneg (e.g., Cabaritan, Kalaw, San Isidro) |
| `gradeLevel` | INT | No | CHECK (7 to 12) | None | Kasalukuyang antas ng mag-aaral |
| `strand` | VARCHAR(50) | Yes | None | NULL | Strand para sa SHS: 'STEM', 'ABM', 'HUMSS', 'TVL' |
| `isReturning` | BOOLEAN | No | None | FALSE | TRUE kung datihang estudyante na awtomatikong na-renew |
| `currentSectionId`| UUID | Yes | FOREIGN KEY | NULL | Seksyon kung saan kasalukuyang naka-enroll |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagpapatala |

---

### TABLE 3: `teachers` (Sub-Class: Kaguruan)
Naglalaman ng profile ng mga guro na may hawak ng cross-level teaching loads para sa JHS at SHS.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `teacherID` | VARCHAR(20) | No | UNIQUE | None | Opisyal na Faculty ID ng guro |
| `firstName` | VARCHAR(50) | No | None | None | Pangalan ng guro |
| `middleName` | VARCHAR(50) | Yes | None | NULL | Gitnang pangalan |
| `lastName` | VARCHAR(50) | No | None | None | Apelyido ng guro |
| `department` | VARCHAR(20) | No | CHECK | None | Departamento: 'JHS', 'SHS', o 'CROSS_LEVEL' |
| `email` | VARCHAR(100) | Yes | None | NULL | Faculty email address |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagrehistro |

---

### TABLE 4: `school_administrators` (Sub-Class: Tagapamahala)
Profile ng mga school heads at personnel na gumaganap sa mga tungkulin ng registrar.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `adminID` | VARCHAR(20) | No | UNIQUE | None | Administrator Employee ID |
| `firstName` | VARCHAR(50) | No | None | None | Pangalan ng administrator |
| `lastName` | VARCHAR(50) | No | None | None | Apelyido ng administrator |
| `department` | VARCHAR(50) | No | None | 'Academic Affairs' | Tanggapan o unit ng administrator |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagrehistro |

---

### TABLE 5: `it_supports` (Sub-Class: Teknikal na Suporta)
Nangangasiwa sa mga setting ng sistema, academic terms, at role permissions.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `userId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `users.id` (ON DELETE CASCADE) |
| `itsupportID` | VARCHAR(20) | No | UNIQUE | None | IT Support Employee ID |
| `systemRole` | VARCHAR(50) | No | None | 'System Administrator' | Antas ng pribilehiyo sa system |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagrehistro |

---

### TABLE 6: `sections` (Mga Pangkat)
Nagtatakda ng mga klase at quota capacity para sa bawat baitang.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `sectionId` | VARCHAR(20) | No | UNIQUE | None | Section Code (e.g., SEC-G7-RIZAL) |
| `sectionName` | TEXT | No | None | None | Buong pangalan ng pangkat (e.g., Grade 7 - Rizal) |
| `gradeLevel` | INT | No | CHECK (7 to 12) | None | Antas ng klase |
| `strand` | VARCHAR(50) | Yes | None | NULL | Strand kung SHS; NULL kung JHS |
| `capacity` | INT | No | CHECK (> 0) | 40 | Maximum na bilang ng mga mag-aaral |
| `schoolYear` | VARCHAR(20) | No | None | '2026-2027' | Taong panuruan ng seksyon |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng paggawa |

---

### TABLE 7: `classrooms` (Mga Silid-Aralan)
Nagtatala ng mga pisikal na pasilidad upang maiwasan ang double-booking ng mga kwarto.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `classroomId` | VARCHAR(20) | No | UNIQUE | None | Classroom Code (e.g., RM-101, RM-201) |
| `roomName` | TEXT | No | None | None | Pangalan ng silid (e.g., Science Laboratory) |
| `building` | TEXT | No | None | None | Gusali kung saan nakatayo ang silid |
| `capacity` | INT | No | CHECK (> 0) | 40 | Maximum seating capacity ng silid |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng pagtala |

---

### TABLE 8: `course_subjects` (Mga Asignatura)
Sumusuporta sa Trimestral (Trisem) Curriculum ng DNHS at nagpapatupad ng limitasyon sa core subjects.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `subjectCode` | VARCHAR(20) | No | UNIQUE | None | Subject Code (e.g., SHS-GENM11-T1) |
| `subjectName` | TEXT | No | None | None | Buong pamagat ng asignatura |
| `subjectType` | VARCHAR(20) | No | CHECK | None | Uri: 'Core', 'Elective', 'Applied', 'Specialized' |
| `gradeLevel` | INT | No | CHECK (7 to 12) | None | Antas kung saan itinuturo |
| `trimester` | INT | No | CHECK (1 to 3) | None | Trimester term kung kailan iaalok |
| `strand` | VARCHAR(50) | Yes | None | NULL | Nilalaan na strand kung specialized/elective |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng paggawa |

---

### TABLE 9: `class_schedules` (Sentral na Hub ng Deconfliction Engine)
Ugnayan ng oras, guro, silid, seksyon, at asignatura. Dito pinapatupad ang collision detection.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `scheduleId` | VARCHAR(30) | No | UNIQUE | None | Schedule reference code |
| `subjectCode` | VARCHAR(20) | No | FOREIGN KEY | None | Ugnayan sa `course_subjects.subjectCode` |
| `sectionId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `sections.id` |
| `teacherId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `teachers.id` (Cross-level load check) |
| `classroomId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `classrooms.id` (Room check) |
| `dayOfWeek` | VARCHAR(10) | No | CHECK | None | Araw: 'Monday' hanggang 'Friday' |
| `startTime` | TIME | No | None | None | Simula ng klase |
| `endTime` | TIME | No | CHECK (> startTime)| None | Pagtatapos ng klase |
| `trimester` | INT | No | CHECK (1 to 3) | None | Trimester term |
| `schoolYear` | VARCHAR(20) | No | None | '2026-2027' | Taong panuruan |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng paggawa |

---

### TABLE 10: `enrollment_applications` (Mga Aplikasyon sa Pagpapatala)
Nangangasiwa sa proseso ng submission para sa Grade 7, Grade 11, Transferees, at Returning students.

| Column Name | Data Type | Nullable | Constraint | Default | Deskripsyon / Paliwanag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | PRIMARY KEY | uuid_generate_v4() | Internal record ID |
| `applicationId` | VARCHAR(30) | No | UNIQUE | None | Tracking code para sa estudyante |
| `studentId` | UUID | No | FOREIGN KEY | None | Ugnayan sa `students.id` |
| `applicantType` | VARCHAR(20) | No | CHECK | None | 'Grade 7', 'Grade 11', 'Transferee', 'Returning' |
| `schoolYear` | VARCHAR(20) | No | None | '2026-2027' | Taong panuruan ng aplikasyon |
| `targetGradeLevel`| INT | No | CHECK (7 to 12) | None | Antas na papasukan |
| `targetStrand` | VARCHAR(50) | Yes | None | NULL | Piniling strand para sa Senior High |
| `status` | VARCHAR(20) | No | CHECK | 'Pending' | Status: 'Pending', 'Approved', 'Needs Revision' |
| `submittedDocuments`| JSONB | No | None | '[]'::jsonb | JSON array ng mga na-upload na S3 files |
| `selectedElectives` | JSONB | Yes | None | '[]'::jsonb | Listahan ng piniling cross-strand electives |
| `adminFeedback` | TEXT | Yes | None | NULL | Dahilan ng administrator kung 'Needs Revision' |
| `reviewedBy` | UUID | Yes | FOREIGN KEY | NULL | Ugnayan sa `school_administrators.id` |
| `submissionDate`| DATE | No | None | CURRENT_DATE | Petsa ng pagsusumite |
| `createdAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng paglikha sa database |
| `updatedAt` | TIMESTAMPTZ | No | None | NOW() | Petsa ng huling pag-update |

---

## 3. PAGPAPATUPAD NG MGA METHODS SA CLASS DIAGRAM (METHODS TO LOGIC MAPPING)

Sa inyong Class Diagram (Activity 4), may mga idineklarang methods sa bawat klase. Narito kung paano ito ipinapatupad sa ating database at controller layer:

| Class sa Papel | Idineklarang Method | Paano Ipinapatupad sa Dumal-NEXT |
| :--- | :--- | :--- |
| **`ClassSchedule`** | `checkConflict()` | Tinitingnan sa pamamagitan ng SQL query kung may kaparehong `teacherId` o `classroomId` sa parehong `dayOfWeek` at overlapping `startTime` at `endTime` sa loob ng parehong `trimester`. |
| **`ClassSchedule`** | `generateSchedule()` | Awtomatikong nagtatalaga ng available time slots sa mga sections na sumusunod sa rules ng kurikulum. |
| **`ClassSchedule`** | `resolveConflict()` | Nagbibigay ng alternatibong silid-aralan o oras kapag may nakitang banggaan sa schedule. |
| **`Classroom`** | `checkAvailability()` | PostgreSQL validation query: sinisiguro na walang ibang klase sa silid sa napiling time-slot. |
| **`Section`** | `checkCapacity()` | Sinusuri kung ang kabuuang bilang ng mga naaprubahang estudyante ay hindi lumalagpas sa `capacity` ng pangkat bago magdagdag. |
| **`EnrollmentApplication`** | `updateStatus()` | Controller action na nagpapalit ng status mula `Pending` patungong `Approved` o `Needs Revision` kasama ang admin feedback. |
| **`EnrollmentApplication`** | `verifyDocuments()` | Pag-inspeksyon sa mga naka-upload na file keys sa private S3 `documents` bucket. |
| **`EnrollmentApplication`** | `transcribeReturning()` | Awtomatikong pag-renew at pag-angat ng grade level (`gradeLevel = gradeLevel + 1`) ng mga dating mag-aaral nang hindi na kailangang mag-fill out ng bagong application form. |
| **`Student`** | `selectElectives()` | Pagpili ng mga elective subjects na may validation upang masigurong hindi lumalagpas sa 5 core subjects bawat trisem ang SHS. |

---

## 4. MGA PATAKARAN SA SEGURIDAD (ROW-LEVEL SECURITY & STORAGE)

### Row-Level Security (RLS) Policies
1. **Public Read para sa Master Data**: Ang mga talahanayan ng `sections`, `classrooms`, at `course_subjects` ay pwedeng basahin upang maipakita sa enrollment portal ang mga pagpipilian.
2. **Student Isolation**: Ang bawat mag-aaral ay may access lamang sa sarili nilang talaan sa `students` at `enrollment_applications`.
3. **Admin Privilege**: Ang mga lehitimong `school_administrators` at `it_supports` lamang ang may karapatang magbago ng `status`, mag-override ng quota, at mag-edit ng schedule.

### S3 Storage Buckets Specification
* **`student-ids`**: Public bucket para sa 2x2 ID photos ng mga mag-aaral (accessible via CDN).
* **`documents`**: Private RLS-protected bucket para sa mga sensitibong dokumento (PSA Birth Certificate, Form 137 / 138). Tanging ang may-aring estudyante at ang mga administrators lamang ang may access.
* **`receipts`**: Temporary bucket na may 15-minutong presigned URLs para sa mga opisyal na katibayan ng pagpapatala.
