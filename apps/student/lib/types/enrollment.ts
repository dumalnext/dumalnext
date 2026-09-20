// ==============================================================================
// DUMAL-NEXT: TYPESCRIPT ENROLLMENT DEFINITIONS (STUDENT PORTAL)
// 100% Aligned with DepEd Basic Education Enrollment Form (Revised 06/01/2025)
// ==============================================================================

export type ApplicantType = 'Grade 7' | 'Grade 11' | 'Transferee' | 'Returning';
export type ApplicationStatus = 'Pending' | 'Approved' | 'Needs Revision';
export type Gender = 'Male' | 'Female';
export type SnedCategory = 'Diagnosis' | 'Manifestations';

export interface StudentProfile {
  id?: string;
  userId?: string;
  studentID: string; // DNHS Student ID or LRN
  lrn?: string; // 12-digit DepEd Learner Reference Number
  psaBirthCertNo?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string; // Jr., III, etc.
  dateOfBirth?: string; // YYYY-MM-DD
  age?: number;
  gender: Gender;
  placeOfBirth?: string;
  religion?: string;
  motherTongue?: string;
  contactNumber?: string;

  // Indigenous Peoples (IP) Community
  isIpCommunity: boolean;
  ipCommunityName?: string; // e.g. Isnag, Tingguian

  // 4Ps Beneficiary Data
  is4psBeneficiary: boolean;
  householdId4ps?: string; // 16-digit 4Ps Household ID

  // Current Residential Address
  currentHouseNo?: string;
  currentSitio?: string;
  currentBarangay: string; // Cabaritan, Kalabakan, Quibel, San Isidro
  currentMunicipality: string; // Dumalneg
  currentProvince: string; // Ilocos Norte
  currentCountry: string; // Philippines
  currentZipCode: string; // 2921
  barangay?: string; // Legacy fallback

  // Permanent Residential Address
  isPermanentSameAsCurrent: boolean;
  permanentHouseNo?: string;
  permanentSitio?: string;
  permanentBarangay?: string;
  permanentMunicipality?: string;
  permanentProvince?: string;
  permanentCountry?: string;
  permanentZipCode?: string;

  // Parent & Legal Guardian Details
  fatherLastName?: string;
  fatherFirstName?: string;
  fatherMiddleName?: string;
  fatherContactNumber?: string;

  motherMaidenLastName?: string;
  motherFirstName?: string;
  motherMiddleName?: string;
  motherContactNumber?: string;

  guardianLastName?: string;
  guardianFirstName?: string;
  guardianMiddleName?: string;
  guardianContactNumber?: string;

  // Special Needs Education (SNEd) Program
  isSned: boolean;
  snedCategory?: SnedCategory;
  snedDetails?: string[];
  hasPwdId: boolean;

  // Academic Placement
  gradeLevel: number; // 7 - 12
  jhsProgram?: 'Regular' | 'SPS';
  spsSport?: string;
  strand?: string; // STEM, HUMSS, TVL, etc.
  isReturning: boolean;
  currentSectionId?: string;
}

export interface EnrollmentApplication {
  id?: string;
  applicationId: string;
  studentId: string;
  applicantType: ApplicantType;
  schoolYear: string;
  isGraded: boolean;
  targetGradeLevel: number;
  jhsProgram?: 'Regular' | 'SPS'; // Junior High School Curricular Program
  spsSport?: string; // Sports specialization under SPS
  targetSemester?: string;
  semester?: string;
  targetTrack?: string; // Academic, TVL
  targetStrand?: string; // STEM, HUMSS, TVL-Agri-Fishery, TVL-ICT, TVL-HE

  // Balik-Aral and Transferee History
  lastGradeCompleted?: number;
  lastSchoolYearCompleted?: string;
  lastSchoolAttended?: string;
  lastSchoolId?: string; // 6-digit DepEd School ID

  // Distance Learning Modality Preferences (Section 8)
  preferredModalities: string[]; // e.g. ['Blended', 'Modular (Print)', 'Online']

  status: ApplicationStatus;
  isLateEnrollee: boolean;
  submittedDocuments: {
    type: 'birth_certificate' | 'form_138' | 'id_picture' | 'good_moral' | 'other';
    fileName: string;
    fileUrl: string;
    sizeKb: number;
  }[];
  selectedElectives?: string[]; // Cross-strand elective subject codes
  adminFeedback?: string;
  reviewedBy?: string;
  submissionDate: string;
}

export const DUMALNEG_BARANGAYS = [
  'CABARITAN',
  'KALABAKAN',
  'QUIBEL',
  'SAN ISIDRO'
] as const;

export const SNED_DIAGNOSES = [
  'Attention Deficit Hyperactivity Disorder',
  'Autism Spectrum Disorder',
  'Cerebral Palsy',
  'Emotional-Behavior Disorder',
  'Hearing Impairment',
  'Intellectual Disability',
  'Learning Disability',
  'Multiple Disabilities',
  'Orthopedic/Physical Handicap',
  'Speech/Language Disorder',
  'Special Health Problem/Chronic Disease (Cancer)',
  'Special Health Problem/Chronic Disease (Non-Cancer)',
  'Visual Impairment (Blind)',
  'Visual Impairment (Low Vision)'
] as const;

export const SNED_MANIFESTATIONS = [
  'Difficulty in Applying Knowledge',
  'Difficulty in Communicating',
  'Difficulty in Displaying Interpersonal Behavior (Emotional and Behavioral)',
  'Difficulty in Hearing',
  'Difficulty in Mobility (Walking, Climbing and Grasping)',
  'Difficulty in Performing Adaptive Skills (Self-Care)',
  'Difficulty in Remembering, Concentrating, Paying Attention and Understanding',
  'Difficulty in Seeing'
] as const;

export const DISTANCE_LEARNING_MODALITIES = [
  'Blended (Combination)',
  'Modular (Print)',
  'Modular (Digital)',
  'Online',
  'Educational Television',
  'Radio-Based Television',
  'Homeschooling'
] as const;

export const SHS_STRANDS = [
  { code: 'STEM', name: 'Science, Technology, Engineering, and Mathematics', track: 'Academic Track' },
  { code: 'HUMSS', name: 'Humanities and Social Sciences', track: 'Academic Track' },
  { code: 'TVL-ICT', name: 'TVL: Information and Communications Technology', track: 'Technical-Vocational-Livelihood Track' },
  { code: 'TVL-AFA', name: 'TVL: Agri-Fishery Arts', track: 'Technical-Vocational-Livelihood Track' },
  { code: 'TVL-HE', name: 'TVL: Home Economics', track: 'Technical-Vocational-Livelihood Track' }
] as const;

export const JHS_PROGRAMS = [
  {
    code: 'Regular',
    title: 'Regular Junior High School Curriculum',
    subtitle: 'DepEd K-12 / MATATAG Curriculum Standard',
    description:
      'Standard high school secondary curriculum encompassing core learning areas (English, Mathematics, Science, Filipino, Araling Panlipunan, MAPEH, TLE, and Edukasyon sa Pagpapakatao).',
  },
  {
    code: 'SPS',
    title: 'Special Program in Sports (SPS)',
    subtitle: 'Competitive Athletic & Academic Curriculum',
    description:
      'Specialized secondary program designed for students with demonstrated athletic aptitude. Combines academic courses with intensive sports training, coaching, and athletic representation for Dumalneg NHS in Division, Regional (CAVRAA/R1AA), and Palarong Pambansa meets.',
  },
] as const;

export const SPS_SPORTS = [
  'Athletics (Track & Field / Running)',
  'Badminton',
  'Basketball',
  'Volleyball',
  'Sepak Takraw',
  'Table Tennis',
  'Chess',
  'Archery',
  'Taekwondo / Combative Sports',
  'Other Sports Discipline',
] as const;

