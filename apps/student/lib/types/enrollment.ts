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

export interface ElectiveSubject {
  code: string;
  name: string;
  category: 'Applied' | 'Specialized' | 'Cross-Strand' | 'TLE / Exploratory';
  description: string;
  level: 'SHS' | 'JHS' | 'All';
  nativeStrands: string[];
  gradeLevels?: number[];
  terms?: number[];
}

export const DEPED_ELECTIVES: ElectiveSubject[] = [
  {
    code: 'ELECT-PROG',
    name: 'Computer Programming & Web Technologies',
    category: 'Applied',
    description: 'Introductory algorithm design, web interfaces, and modern coding fundamentals.',
    level: 'SHS',
    nativeStrands: ['TVL-ICT', 'TVL'],
    gradeLevels: [11, 12],
    terms: [1, 2],
  },
  {
    code: 'ELECT-JOURN',
    name: 'Campus Journalism & Media Literacy',
    category: 'Cross-Strand',
    description: 'News gathering, editorial broadcasting, and digital student press publishing.',
    level: 'All',
    nativeStrands: ['HUMSS'],
    gradeLevels: [7, 8, 9, 10, 11, 12],
    terms: [1, 2, 3],
  },
  {
    code: 'ELECT-CW101',
    name: 'Creative Writing & Malikhaing Pagsulat',
    category: 'Cross-Strand',
    description: 'Fundamentals of creative fiction, poetry, and Philippine literary essays.',
    level: 'All',
    nativeStrands: ['HUMSS'],
    gradeLevels: [11, 12],
    terms: [1, 2],
  },
  {
    code: 'ELECT-PRECALC',
    name: 'Applied Pre-Calculus & STEM Principles',
    category: 'Specialized',
    description: 'Analytic geometry, series, and mathematical foundations for non-STEM students.',
    level: 'SHS',
    nativeStrands: ['STEM'],
    gradeLevels: [11],
    terms: [1, 2],
  },
  {
    code: 'ELECT-AGRI',
    name: 'Agricultural Crop Production & Modern Farming',
    category: 'Specialized',
    description: 'Organic farming, horticulture techniques, and localized crop sustainability for Dumalneg.',
    level: 'All',
    nativeStrands: ['TVL-AFA', 'AFA'],
    gradeLevels: [7, 8, 9, 10, 11, 12],
    terms: [1, 2, 3],
  },
  {
    code: 'ELECT-CUL',
    name: 'Culinary Arts & Food Processing',
    category: 'Specialized',
    description: 'Safe food handling, indigenous food preparation, and small-scale catering management.',
    level: 'All',
    nativeStrands: ['TVL-HE', 'HE'],
    gradeLevels: [7, 8, 9, 10, 11, 12],
    terms: [1, 2, 3],
  },
  {
    code: 'ELECT-DRAFT',
    name: 'Technical Drafting & Digital CAD',
    category: 'Applied',
    description: 'Architectural drawing principles, orthographic projections, and computer-aided design.',
    level: 'All',
    nativeStrands: ['TVL-ICT', 'TVL-IA'],
    gradeLevels: [7, 8, 9, 10, 11, 12],
    terms: [1, 2],
  },
  {
    code: 'ELECT-ENTREP',
    name: 'Applied Economics & Youth Entrepreneurship',
    category: 'Cross-Strand',
    description: 'Community enterprise development, business planning, and basic financial literacy.',
    level: 'SHS',
    nativeStrands: ['ABM'],
    gradeLevels: [11, 12],
    terms: [2, 3],
  },
  {
    code: 'ELECT-ROBOT',
    name: 'Applied Robotics & Environmental Sensors',
    category: 'Applied',
    description: 'Microcontroller basics, sensor telemetry, and automation projects.',
    level: 'SHS',
    nativeStrands: ['STEM'],
    gradeLevels: [11, 12],
    terms: [2, 3],
  },
  {
    code: 'ELECT-BIO',
    name: 'Applied Environmental Biology & Ecology',
    category: 'Applied',
    description: 'Biological diversity, ecological conservation, and field biology applications.',
    level: 'SHS',
    nativeStrands: ['STEM'],
    gradeLevels: [11, 12],
    terms: [2, 3],
  },
  {
    code: 'ELECT-LEAD',
    name: 'Youth Governance & Community Development',
    category: 'Cross-Strand',
    description: 'Public leadership, community organizing, and local civic participation.',
    level: 'All',
    nativeStrands: ['HUMSS'],
    gradeLevels: [8, 9, 10, 11, 12],
    terms: [1, 2, 3],
  },
  {
    code: 'ELECT-FLANG',
    name: 'Foreign Language / Asian Languages (Introductory)',
    category: 'Cross-Strand',
    description: 'Basic conversational linguistic foundations and intercultural communication.',
    level: 'All',
    nativeStrands: [],
    gradeLevels: [7, 8, 9, 10, 11, 12],
    terms: [1, 2, 3],
  },
  {
    code: 'ELECT-ELEC',
    name: 'Electrical Installation & Smart Maintenance',
    category: 'TLE / Exploratory',
    description: 'Basic electrical circuits, residential wiring, and safety standards.',
    level: 'All',
    nativeStrands: ['TVL-IA', 'TVL'],
    gradeLevels: [7, 8, 9, 10, 11, 12],
    terms: [1, 3],
  },
];

/**
 * Smart filtration function for cross-strand elective subjects.
 * Strictly excludes:
 * 1. Subjects the learner already completed or enrolled in during past terms.
 * 2. Subjects that are native/mandatory to the learner's own strand curriculum.
 * 3. Subjects not offered in the active semester/trimester or grade level.
 */
export function getEligibleElectives({
  currentStrand,
  gradeLevel,
  termNumber,
  previouslyTakenCodes = [],
  isJHS = false,
}: {
  currentStrand?: string | null;
  gradeLevel?: number | string | null;
  termNumber?: number | null;
  previouslyTakenCodes?: string[];
  isJHS?: boolean;
}): ElectiveSubject[] {
  const normGrade = Number(gradeLevel) || (isJHS ? 7 : 11);
  const normTerm = Number(termNumber) || 1;
  const takenSet = new Set(previouslyTakenCodes);
  const normStrand = (currentStrand || '').toUpperCase().trim();

  return DEPED_ELECTIVES.filter((elec) => {
    // 1. Exclude subjects already taken in prior terms
    if (takenSet.has(elec.code)) {
      return false;
    }

    // 2. Exclude subjects that are native/mandatory to learner's own strand
    if (!isJHS && normStrand) {
      const isNative = elec.nativeStrands.some((ns) => {
        const upNs = ns.toUpperCase();
        return normStrand.includes(upNs) || upNs.includes(normStrand);
      });
      if (isNative) {
        return false;
      }
    }

    // 3. Filter by Grade Level
    if (isJHS) {
      if (elec.level === 'SHS') return false;
      if (elec.gradeLevels && !elec.gradeLevels.includes(normGrade)) return false;
    } else {
      if (elec.level === 'JHS') return false;
      if (elec.gradeLevels && !elec.gradeLevels.includes(normGrade)) return false;
    }

    // 4. Filter by Active Term (Trimester / Semester)
    if (elec.terms && !elec.terms.includes(normTerm)) {
      return false;
    }

    return true;
  });
}

