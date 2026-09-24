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
  targetTrack?: string; // Academic Track, Technical-Professional Track
  targetStrand?: string; // STEM, HUMSS, TVL-Agri-Fishery, TVL-ICT, TVL-HE or Cluster
  careerPathway?: string; // e.g. 'Medical Practitioners', 'Engineers', 'ICT Professionals' (Annex B)
  primaryCluster?: string; // Thematic elective cluster (Annex A)
  doorwayElectives?: string[]; // Up to 2 cross-track electives (Doorway Option)

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
  selectedElectives?: string[]; // Elective subject codes
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

// ==============================================================================
// DEPED STRENGTHENED SENIOR HIGH SCHOOL CURRICULUM (REFORM STANDARD)
// ==============================================================================

export const SHS_TRACKS = [
  {
    code: 'Academic Track',
    name: 'Academic Track',
    shortName: 'Academic',
    description: 'Prepares learners for higher education, advanced degrees, and research. Subsumes Arts & Design and Sports as specialized elective clusters.',
    coreHoursTotal: 800, // 5 core subjects x 160 hrs
    minimumElectivesCount: 9,
    minimumElectivesHours: 960,
  },
  {
    code: 'Technical-Professional Track',
    name: 'Technical-Professional (TechPro) Track',
    shortName: 'TechPro',
    description: 'Elevates vocational and practical skills training with industry-recognized TESDA National Certifications (NC I / NC II / NC III) and intensive work immersion.',
    coreHoursTotal: 800,
    minimumElectivesCount: 2,
    minimumElectivesHours: 640,
    workImmersionHours: 320, // 320 - 640 hours mandatory
  },
] as const;

export const SHS_ACADEMIC_CLUSTERS = [
  'Arts, Social Sciences, and Humanities',
  'Science, Technology, Engineering, and Mathematics',
  'Sports, Health, and Wellness',
  'Business and Entrepreneurship',
  'Field Experience',
] as const;

export const SHS_TECHPRO_CLUSTERS = [
  'Aesthetic, Wellness, and Human Care',
  'Agri-Fishery Business and Food Innovation',
  'Artisanry and Creative Enterprise',
  'Automotive and Small Engine Technologies',
  'Construction and Building Technologies',
  'Creative Arts and Design Technologies',
  'Hospitality and Tourism',
  'Industrial Technologies',
  'ICT Support and Computer Programming Technologies',
  'Maritime Transport',
] as const;

export interface CareerPathwayDef {
  id: string;
  name: string;
  track: 'Academic Track' | 'Technical-Professional Track';
  primaryCluster: string;
  recommendedAcademicElectives: string[];
  recommendedTechProElectives: string[];
  description: string;
}

export const CAREER_PATHWAYS: CareerPathwayDef[] = [
  {
    id: 'medicine',
    name: 'Medical Practitioners (Doctors)',
    track: 'Academic Track',
    primaryCluster: 'Science, Technology, Engineering, and Mathematics',
    recommendedAcademicElectives: ['Chemistry 1 & 2', 'Biology 1 & 2', 'Physics 1 & 2'],
    recommendedTechProElectives: ['Caregiving (Child Care)', 'Caregiving (Adult Care)'],
    description: 'Pre-medicine preparation focusing on organic/inorganic sciences, cellular biology, and medical physics.',
  },
  {
    id: 'nursing',
    name: 'Nursing & Midwifery',
    track: 'Academic Track',
    primaryCluster: 'Science, Technology, Engineering, and Mathematics',
    recommendedAcademicElectives: ['Chemistry 1 & 2', 'Biology 1 & 2'],
    recommendedTechProElectives: ['Caregiving (Child Care)', 'Caregiving (Adult Care)'],
    description: 'Healthcare pathway focusing on biological sciences and patient care competencies.',
  },
  {
    id: 'engineers',
    name: 'Engineers & Aviation Specialists',
    track: 'Academic Track',
    primaryCluster: 'Science, Technology, Engineering, and Mathematics',
    recommendedAcademicElectives: ['Physics 1 & 2', 'Earth and Space Science 1 & 2', 'Chemistry 1 & 2', 'Finite Mathematics 1 & 2', 'Pre-calculus 1 & 2'],
    recommendedTechProElectives: ['Photovoltaic System Installation', 'Electrical System Installation', 'Manual Metal Arc Welding', 'Electronics Products Assembly', 'Technical Drafting'],
    description: 'Rigorous mathematical and physical science foundations paired with practical technical drafting and electronics.',
  },
  {
    id: 'teachers',
    name: 'Teachers & Educators',
    track: 'Academic Track',
    primaryCluster: 'Arts, Social Sciences, and Humanities',
    recommendedAcademicElectives: ['Introduction to Philosophy', 'Social Sciences (Theory and Practice)', 'Philippine Governance', 'Filipino 1 & 2', 'Creative Composition 1 & 2', 'Malikhaing Pagsulat'],
    recommendedTechProElectives: ['Caregiving (Child Care)'],
    description: 'Pedagogy, social sciences, national language, and developmental education foundation.',
  },
  {
    id: 'ict',
    name: 'ICT & Computing Professionals',
    track: 'Technical-Professional Track',
    primaryCluster: 'ICT Support and Computer Programming Technologies',
    recommendedAcademicElectives: ['Finite Mathematics 1 & 2', 'Chemistry 1 & 2', 'Physics 1 & 2'],
    recommendedTechProElectives: ['Computer Programming (Java)', 'Computer Programming (.Net Technology)', 'Computer Programming (Oracle Database)', 'Computer Systems Servicing', 'Broadband Installation', 'Visual Graphic Design'],
    description: 'Full software development, database administration, system servicing, and network infrastructure.',
  },
  {
    id: 'business',
    name: 'Retail, Wholesale & Business Managers',
    track: 'Academic Track',
    primaryCluster: 'Business and Entrepreneurship',
    recommendedAcademicElectives: ['Business 1 (Basic Accounting)', 'Introduction to Organization and Management', 'Business 2 (Finance & Taxation)', 'Contemporary Marketing', 'Business 3 (Economics)', 'Entrepreneurship'],
    recommendedTechProElectives: ['Events Management Services', 'Hotel Operation (Front Office Services)'],
    description: 'Enterprise accounting, corporate taxation, economics, marketing, and business stewardship.',
  },
  {
    id: 'hospitality',
    name: 'Culinary Arts & Hospitality Management',
    track: 'Technical-Professional Track',
    primaryCluster: 'Hospitality and Tourism',
    recommendedAcademicElectives: ['Business 1 (Basic Accounting)', 'Introduction to Organization and Management', 'Contemporary Marketing', 'Business 3 (Business Economics)'],
    recommendedTechProElectives: ['Kitchen Operation', 'Bakery Operation', 'Food and Beverage Operation', 'Hotel Operation (Front Office Services)', 'Hotel Operation (Housekeeping Services)', 'Tourism Services', 'Events Management Services'],
    description: 'Professional culinary preparation, food safety, and hotel administration with TESDA certifications.',
  },
  {
    id: 'uniformed',
    name: 'Uniformed Service Professions (Police, Military, Law Enforcement)',
    track: 'Academic Track',
    primaryCluster: 'Sports, Health, and Wellness',
    recommendedAcademicElectives: ['Social Sciences (Theory and Practice)', 'Philippine Governance', 'Citizenship and Civic Engagement', 'Human Movement 1 & 2', 'Safety and First Aid', 'Chemistry 1 & 2'],
    recommendedTechProElectives: ['Driving and Automotive Servicing', 'Electrical System Installation', 'Manual Metal Arc Welding'],
    description: 'Physical fitness, tactical discipline, governance, criminology foundation, and mechanics.',
  },
  {
    id: 'maritime',
    name: 'Ship Deck Crews & Maritime Careers',
    track: 'Technical-Professional Track',
    primaryCluster: 'Maritime Transport',
    recommendedAcademicElectives: ['Philippine Governance', 'Human Movement 1', 'Citizenship and Civic Engagement', 'Physics 1 & 2', 'Earth and Space Science 1 & 2'],
    recommendedTechProElectives: ['Marine Engineering at the Support Level', 'Marine Transportation at the Support Level', 'Ships Catering Services', 'Technical Drafting'],
    description: 'Seafaring navigation, marine transport systems, and international maritime catering.',
  },
  {
    id: 'architects',
    name: 'Architects & Environmental Designers',
    track: 'Academic Track',
    primaryCluster: 'Science, Technology, Engineering, and Mathematics',
    recommendedAcademicElectives: ['Finite Mathematics 1 & 2', 'Physics 1 & 2', 'Pre-calculus 1 & 2'],
    recommendedTechProElectives: ['Technical Drafting', 'Visual Graphic Design', 'Illustration', 'Animation'],
    description: 'Architectural structural physics, geometric drafting, 3D visualization, and design.',
  },
  {
    id: 'lawyers',
    name: 'Lawyers & Legal Professionals',
    track: 'Academic Track',
    primaryCluster: 'Arts, Social Sciences, and Humanities',
    recommendedAcademicElectives: ['Social Sciences (Theory and Practice)', 'Philippine Governance', 'Malikhaing Pagsulat', 'Creative Composition 1 & 2', 'Business 1 (Basic Accounting)', 'Business 3 (Business Economics)'],
    recommendedTechProElectives: [],
    description: 'Pre-law jurisprudence, constitutional governance, rhetorical argumentation, and forensic analysis.',
  },
  {
    id: 'agri',
    name: 'Agri-Fishery & Food Innovation Specialists',
    track: 'Technical-Professional Track',
    primaryCluster: 'Agri-Fishery Business and Food Innovation',
    recommendedAcademicElectives: ['Business 1 (Basic Accounting)', 'Entrepreneurship', 'Biology 1 & 2'],
    recommendedTechProElectives: ['Agricultural Crops Production', 'Organic Agriculture Production', 'Agro-entrepreneurship', 'Food Processing', 'Aquaculture', 'Poultry Production'],
    description: 'Sustainable agricultural systems, crop sciences, food technology, and commercial agribusiness.',
  },
  {
    id: 'science_research',
    name: 'Science-Inclined & Research Careers',
    track: 'Academic Track',
    primaryCluster: 'Science, Technology, Engineering, and Mathematics',
    recommendedAcademicElectives: ['Biology 1 to 4', 'Chemistry 1 to 4', 'Physics 1 to 4', 'Earth and Space Science 1 to 4', 'Fundamentals in Data Analytics', 'Database Management'],
    recommendedTechProElectives: ['Electronics Product Assembly and Servicing'],
    description: 'Comprehensive laboratory sciences, empirical research, mathematical modeling, and data analytics.',
  },
];

// 5 New Core Subjects (Grade 11, 160 hours each across the academic year)
export const STRENGTHENED_SHS_CORE_SUBJECTS = [
  {
    code: 'SHS-EFFCOM11',
    name: 'Effective Communication / Mabisang Komunikasyon',
    hours: 160,
    gradeLevel: 11,
    description: 'Dual-language framework (English & Filipino parallel strands, 80 hrs each by dedicated teachers, CEFR B2 level, translanguaging).',
  },
  {
    code: 'SHS-GMATH11',
    name: 'General Mathematics',
    hours: 160,
    gradeLevel: 11,
    description: 'Numbers, algebra, geometry, measurement, and applied statistics for real-world academic and professional quantitative analysis.',
  },
  {
    code: 'SHS-GSCI11',
    name: 'General Science',
    hours: 160,
    gradeLevel: 11,
    description: 'Multidisciplinary & transdisciplinary science (Physics, Chemistry, Biology, Earth & Space Science) for sustainable societal solutions.',
  },
  {
    code: 'SHS-LCSKILLS11',
    name: 'Life and Career Skills',
    hours: 160,
    gradeLevel: 11,
    description: 'Personal development, health and wellness, resilience, and workplace/career transition competencies.',
  },
  {
    code: 'SHS-KASAY11',
    name: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino',
    hours: 160,
    gradeLevel: 11,
    description: 'Thematic, multicultural, and interdisciplinary analysis of Philippine history, civic competence, and social issues.',
  },
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
  category: 'Applied' | 'Specialized' | 'Cross-Strand' | 'TLE / Exploratory' | 'Academic Elective' | 'TechPro Elective' | 'Field Experience';
  description: string;
  level: 'SHS' | 'JHS' | 'All';
  nativeStrands: string[];
  track?: 'Academic Track' | 'Technical-Professional Track' | 'All';
  cluster?: string;
  prerequisites?: string;
  ncLevel?: string;
  hours?: number;
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

// =========================================================================
// DEPED STRENGTHENED SHS ELECTIVES (ANNEX A OF SHAPING PAPER)
// =========================================================================
export const STRENGTHENED_SHS_ELECTIVES: ElectiveSubject[] = [
  // Arts, Social Sciences, and Humanities
  {
    code: 'ACAD-ARTS1',
    name: 'Arts 1 (Visual, Literary, Media, Applied, and Traditional Art)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Creative industries exploring visual, literary, media, applied, and traditional indigenous Filipino art forms.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-ARTS2',
    name: 'Arts 2 (Creative Industries - Music, Dance, and Theater)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Performing arts, theatrical staging, choreography, and musical production.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-CITIZEN',
    name: 'Citizenship and Civic Engagement',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Active democratic participation, community advocacy, and constitutional rights in Philippine society.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-CONLIT1',
    name: 'Contemporary Literature 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Critical analysis of modern regional and global literary texts and critical perspectives.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-CONLIT2',
    name: 'Contemporary Literature 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Advanced global literary criticism, comparative poetics, and cultural discourse.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'Contemporary Literature 1',
    hours: 80,
  },
  {
    code: 'ACAD-CCOMP1',
    name: 'Creative Composition 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Crafting non-fiction essays, poetry, and narrative prose with authentic voice.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-CCOMP2',
    name: 'Creative Composition 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Advanced manuscript development, workshop critiquing, and literary publication.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'Creative Composition 1',
    hours: 80,
  },
  {
    code: 'ACAD-FIL1',
    name: 'Filipino 1 (Wika at Komunikasyon sa Akademikong Filipino)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Mataas na antas ng akademikong pagsulat, pagsusuri, at diskurso sa wikang pambansa.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-FIL2',
    name: 'Filipino 2 (Filipino para sa Larang Teknikal-Propesyonal/Isports/Sining at Disenyo)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Aplikasyon ng wikang Filipino sa teknikal, propesyonal, at pansining na mga industriya.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Filipino 1',
    hours: 80,
  },
  {
    code: 'ACAD-FILID',
    name: 'Filipino Identity Through the Arts',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Pamanang kultural, katutubong sining, at pagkakakilanlang Pilipino.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-PHILOS',
    name: 'Introduction to Philosophy',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Philosophical inquiry, ethical discernment, epistemology, and the human person in society.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-LEADART',
    name: 'Leadership and Management in the Arts',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Curatorial practices, creative enterprise leadership, and arts administration.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-MALIKPAG',
    name: 'Malikhaing Pagsulat',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Pagsulat ng maikling kuwento, dula, at tula gamit ang makabagong teknik.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-GOV',
    name: 'Philippine Governance (Politics and Governance)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Philippine constitutional framework, executive/legislative/judicial dynamics, and grassroots politics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-SOCSCI',
    name: 'Social Sciences (Theory and Practice)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Arts, Social Sciences, and Humanities',
    description: 'Sociological, anthropological, and psychological theories applied to Philippine development challenges.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },

  // Business and Entrepreneurship
  {
    code: 'ACAD-BACC1',
    name: 'Business 1 (Basic Accounting)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Business and Entrepreneurship',
    description: 'Accounting cycle, financial ledgering, balance sheets, and cash flow analysis.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-BFIN2',
    name: 'Business 2 (Business Finance and Income Taxation)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Business and Entrepreneurship',
    description: 'Capital budgeting, corporate finance, and Philippine income taxation principles.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'Basic Accounting, Intro to Org & Mgmt',
    hours: 80,
  },
  {
    code: 'ACAD-BECON3',
    name: 'Business 3 (Business Economics)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Business and Entrepreneurship',
    description: 'Microeconomics, market equilibrium, macro indicators, and fiscal policies.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'Basic Accounting, Intro to Org & Mgmt',
    hours: 80,
  },
  {
    code: 'ACAD-MKTG',
    name: 'Contemporary Marketing',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Business and Entrepreneurship',
    description: 'Digital market campaigns, consumer behavior analysis, branding, and distribution channels.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'Basic Accounting, Intro to Org & Mgmt',
    hours: 80,
  },
  {
    code: 'ACAD-ENTREP',
    name: 'Entrepreneurship',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Business and Entrepreneurship',
    description: 'Business model canvas, product innovation, startup viability, and venture execution.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Basic Accounting, Intro to Org & Mgmt',
    hours: 80,
  },
  {
    code: 'ACAD-ORGMGT',
    name: 'Introduction to Organization and Management',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Business and Entrepreneurship',
    description: 'Organizational structures, strategic human resource management, and operations.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },

  // STEM (Science, Technology, Engineering, and Mathematics)
  {
    code: 'ACAD-ADVMATH1',
    name: 'Advanced Mathematics 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Advanced polynomial functions, complex numbers, and differential modeling.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'General Mathematics (core)',
    hours: 80,
  },
  {
    code: 'ACAD-ADVMATH2',
    name: 'Advanced Mathematics 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Integral calculus principles, vector analysis, and differential equations.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Advanced Mathematics 1',
    hours: 80,
  },
  {
    code: 'ACAD-BIO1',
    name: 'Biology 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Cell biology, bioenergetics, photosynthesis, and cellular respiration.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-BIO2',
    name: 'Biology 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Genetics, molecular biology, recombinant DNA, and evolutionary mechanisms.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'Biology 1',
    hours: 80,
  },
  {
    code: 'ACAD-BIO3',
    name: 'Biology 3',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Plant and animal anatomy and physiology, homeostatic systems, and organ dynamics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Biology 1 & 2',
    hours: 80,
  },
  {
    code: 'ACAD-BIO4',
    name: 'Biology 4',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Ecology, biodiversity conservation, biotechnology, and environmental impact assessment.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Biology 1, 2, & 3',
    hours: 80,
  },
  {
    code: 'ACAD-CHEM1',
    name: 'Chemistry 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Atomic structure, chemical bonding, stoichiometry, and gas laws.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-CHEM2',
    name: 'Chemistry 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Thermodynamics, chemical equilibrium, acids and bases, and reaction kinetics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'Chemistry 1',
    hours: 80,
  },
  {
    code: 'ACAD-CHEM3',
    name: 'Chemistry 3',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Organic chemistry, hydrocarbons, functional groups, and biomolecules.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Chemistry 1 & 2',
    hours: 80,
  },
  {
    code: 'ACAD-CHEM4',
    name: 'Chemistry 4',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Electrochemistry, nuclear chemistry, polymer chemistry, and industrial chemistry.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Chemistry 1, 2, & 3',
    hours: 80,
  },
  {
    code: 'ACAD-DATA',
    name: 'Fundamentals in Data Analytics',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Data collection, exploratory statistical visualization, predictive modeling, and analytics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'General Mathematics (core)',
    hours: 80,
  },
  {
    code: 'ACAD-DBMGT',
    name: 'Database Management',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Relational database architecture, SQL queries, entity-relationship models, and data security.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Fundamentals in Data Analytics',
    hours: 80,
  },
  {
    code: 'ACAD-ESS1',
    name: 'Earth and Space Science 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Geological history of Earth, plate tectonics, minerals, and planetary structures.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-ESS2',
    name: 'Earth and Space Science 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Oceanography, atmospheric systems, meteorology, and climate patterns.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'Earth and Space Science 1',
    hours: 80,
  },
  {
    code: 'ACAD-ESS3',
    name: 'Earth and Space Science 3',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Solar system astronomy, stellar evolution, galactic systems, and cosmology.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Earth and Space Science 1 & 2',
    hours: 80,
  },
  {
    code: 'ACAD-ESS4',
    name: 'Earth and Space Science 4',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Space exploration technologies, astrophysics principles, and planetary defense.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Earth and Space Science 1, 2, & 3',
    hours: 80,
  },
  {
    code: 'ACAD-EMPTECH',
    name: 'Empowerment Technologies',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'ICT for social change, interactive multimedia, cloud tools, and digital safety.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-FINMATH1',
    name: 'Finite Mathematics 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Matrix algebra, linear programming, simplex algorithms, and financial mathematics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-FINMATH2',
    name: 'Finite Mathematics 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Combinatorics, probability trees, game theory, and Markov chains.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-PHYS1',
    name: 'Physics 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Classical mechanics, kinematics, Newton’s laws of motion, work, and energy.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-PHYS2',
    name: 'Physics 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Fluid mechanics, thermal physics, harmonic oscillations, and wave phenomena.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'Physics 1',
    hours: 80,
  },
  {
    code: 'ACAD-PHYS3',
    name: 'Physics 3',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Electrostatics, electric circuits, magnetism, and electromagnetic induction.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Physics 1 & 2',
    hours: 80,
  },
  {
    code: 'ACAD-PHYS4',
    name: 'Physics 4',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Optics, special relativity, atomic and nuclear physics, and quantum principles.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Physics 1, 2, & 3',
    hours: 80,
  },
  {
    code: 'ACAD-PRECAL1',
    name: 'Pre-calculus 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Conic sections, systems of nonlinear equations, and mathematical induction.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'General Mathematics (core)',
    hours: 80,
  },
  {
    code: 'ACAD-PRECAL2',
    name: 'Pre-calculus 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Trigonometric functions, identities, polar coordinates, and parametric curves.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Pre-calculus 1',
    hours: 80,
  },
  {
    code: 'ACAD-TRIG1',
    name: 'Trigonometry 1',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Circular functions, triangle trigonometry, and navigational applications.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'General Mathematics (core)',
    hours: 80,
  },
  {
    code: 'ACAD-TRIG2',
    name: 'Trigonometry 2',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Science, Technology, Engineering, and Mathematics',
    description: 'Advanced trigonometric proofs, spherical trigonometry, and harmonic analysis.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Trigonometry 1',
    hours: 80,
  },

  // Sports, Health, and Wellness
  {
    code: 'ACAD-HMOV1',
    name: 'Human Movement 1 (Basic Anatomy in Sports and Exercise)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'Musculoskeletal anatomy, kinesiology, and physiological response to physical load.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-HMOV2',
    name: 'Human Movement 2 (Motor Skills Development)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'Neuromuscular coordination, motor learning stages, and movement mechanics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-PE1',
    name: 'Physical Education 1 (Fitness and Recreation)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'Aerobic fitness conditioning, outdoor recreation, and lifelong wellness habits.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-PE2',
    name: 'Physical Education 2 (Sports and Dance)',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'Team sports strategies, competitive athletics, and folk/contemporary dance choreography.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-FIRSTAID',
    name: 'Safety and First Aid',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'BLS/CPR emergency response, sports injury rehabilitation, and disaster triage.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-SPORTSMGT',
    name: 'Sports Activity Management',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'Athletic tournament governance, sports marketing, and venue management.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-COACH',
    name: 'Sports Coaching',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'Principles of athletic coaching, tactical drills, sports psychology, and athlete ethics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-OFFIC',
    name: 'Sports Officiating',
    category: 'Academic Elective',
    track: 'Academic Track',
    cluster: 'Sports, Health, and Wellness',
    description: 'Official rules, referee mechanics, game control, and disputes resolution in major sports.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11],
    prerequisites: 'none',
    hours: 80,
  },

  // Field Experience (Academic)
  {
    code: 'ACAD-DESINNOV',
    name: 'Design and Innovation',
    category: 'Field Experience',
    track: 'Academic Track',
    cluster: 'Field Experience',
    description: 'Applied prototyping, product engineering, design thinking, and intellectual property.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Research Methods',
    hours: 160,
  },
  {
    code: 'ACAD-RESMETH',
    name: 'Research Methods',
    category: 'Field Experience',
    track: 'Academic Track',
    cluster: 'Field Experience',
    description: 'Quantitative and qualitative research design, statistical testing, and academic defense.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'none',
    hours: 80,
  },
  {
    code: 'ACAD-FIELDEXP',
    name: 'Field Exposure (In-Campus / Off-Campus)',
    category: 'Field Experience',
    track: 'Academic Track',
    cluster: 'Field Experience',
    description: 'Structured real-world professional immersion in research laboratories, legal offices, medical clinics, or corporate enterprises.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Completed cluster prerequisites',
    hours: 320,
  },

  // =========================================================================
  // TECHPRO ELECTIVES (TESDA NC-ALIGNED)
  // =========================================================================
  {
    code: 'TECH-BEAUTY',
    name: 'Aesthetic Services (Beauty Care)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Aesthetic, Wellness, and Human Care',
    description: 'Facial treatments, hand/foot spa, manicure/pedicure, and cosmetic hygiene.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-BARBER',
    name: 'Barbering Services',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Aesthetic, Wellness, and Human Care',
    description: 'Men’s precision haircutting, styling, facial shaving, and sanitization.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-CAREADULT',
    name: 'Caregiving (Adult Care)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Aesthetic, Wellness, and Human Care',
    description: 'Elderly care, assistance with daily living, palliative patient support, and medication monitoring.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-CAREDCHILD',
    name: 'Caregiving (Child Care)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Aesthetic, Wellness, and Human Care',
    description: 'Infant and child nutrition, developmental monitoring, pediatric hygiene, and early childhood care.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-HAIR',
    name: 'Hairdressing Services',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Aesthetic, Wellness, and Human Care',
    description: 'Hair coloring, chemical straightening, blowout styling, and salon management.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-WELLNESS',
    name: 'Wellness Services (Hilot/Massage)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Aesthetic, Wellness, and Human Care',
    description: 'Philippine traditional Hilot healing, Swedish massage, acupressure, and spa aromatherapy.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-CROPS',
    name: 'Agricultural Crops Production',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Agri-Fishery Business and Food Innovation',
    description: 'Land preparation, crop propagation, nursery care, localized fertilization, and pest management.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-AGROENTREP',
    name: 'Agro-entrepreneurship',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Agri-Fishery Business and Food Innovation',
    description: 'Commercial farm budgeting, agri-value chains, farm produce retailing, and sustainable rural trade.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-AQUA',
    name: 'Aquaculture',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Agri-Fishery Business and Food Innovation',
    description: 'Freshwater/marine pond culture, fish hatchery operation, and feed formulating.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-FOODPROC',
    name: 'Food Processing',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Agri-Fishery Business and Food Innovation',
    description: 'Food preservation (salting, curing, thermal processing), commercial packaging, and HACCP standards.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-ORGANIC',
    name: 'Organic Agriculture Production',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Agri-Fishery Business and Food Innovation',
    description: 'Organic composting, bio-fertilizer concoctions, pesticide-free farming, and eco-certification.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-AUTOSERV',
    name: 'Driving and Automotive Servicing',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Automotive and Small Engine Technologies',
    description: 'LTO light vehicle driving, preventative automotive maintenance, and basic diagnostic trouble codes.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'Driving NC II / Auto Servicing NC I',
    hours: 320,
  },
  {
    code: 'TECH-MOTO',
    name: 'Motorcycle and Small Engine Servicing',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Automotive and Small Engine Technologies',
    description: 'Motorcycle carburetion, electronic fuel injection (EFI), engine overhaul, and electrical repair.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-WELD',
    name: 'Manual Metal Arc Welding (MMAW)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Construction and Building Technologies',
    description: 'Shielded metal arc welding on carbon steel plates and pipes in 1G through 4G positions.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC I and/or II',
    hours: 320,
  },
  {
    code: 'TECH-DRAFTING',
    name: 'Technical Drafting',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Construction and Building Technologies',
    description: 'Architectural drafting, structural drawings, AutoCAD 2D/3D layouts, and blueprint schematics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-ANIM',
    name: 'Animation',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Creative Arts and Design Technologies',
    description: '2D/3D digital keyframing, character modeling, storyboard sequencing, and motion graphics.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-GRAPHIC',
    name: 'Visual Graphic Design',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Creative Arts and Design Technologies',
    description: 'Typography, branding design, vector art, UI elements, and print publication layout.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC III',
    hours: 320,
  },
  {
    code: 'TECH-BAKERY',
    name: 'Bakery Operation',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Hospitality and Tourism',
    description: 'Artisanal breads, pastry production, confectionary baking, and commercial bakery equipment maintenance.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-FNB',
    name: 'Food and Beverage Operation',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Hospitality and Tourism',
    description: 'Fine dining service, banqueting setup, beverage preparation, and customer relations.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-HOTEL',
    name: 'Hotel Operation (Front Office & Housekeeping Services)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Hospitality and Tourism',
    description: 'Property management systems, guest check-in/out, chambermaid servicing, and hospitality sanitation.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-EIM',
    name: 'Electrical Installation Maintenance',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Industrial Technologies',
    description: 'Residential and commercial conduit installation, wiring devices, and circuit breaker distribution.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-EPAS',
    name: 'Electronics Product Assembly and Servicing',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Industrial Technologies',
    description: 'PCB soldering, electronic circuitry diagnosis, consumer electronics repair, and safety protocols.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-SOLAR',
    name: 'Photovoltaic Systems Installation (Solar Energy)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Industrial Technologies',
    description: 'Solar PV panel mounting, charge controllers, inverter wiring, and grid-tied/off-grid renewable maintenance.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-JAVA',
    name: 'Computer Programming (Java)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'ICT Support and Computer Programming Technologies',
    description: 'Object-oriented programming, data structures, enterprise Java frameworks, and backend API engineering.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC III',
    hours: 320,
  },
  {
    code: 'TECH-DOTNET',
    name: 'Computer Programming (.Net Technology)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'ICT Support and Computer Programming Technologies',
    description: 'C# programming, ASP.NET web applications, Entity Framework, and cloud application deployment.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC III',
    hours: 320,
  },
  {
    code: 'TECH-CSS',
    name: 'Computer Systems Servicing',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'ICT Support and Computer Programming Technologies',
    description: 'Computer hardware assembly, OS installation, network cabling, router config, and server administration.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'NC II',
    hours: 320,
  },
  {
    code: 'TECH-MARITIME-ENG',
    name: 'Marine Engineering at the Support Level',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Maritime Transport',
    description: 'Vessel engine room monitoring, auxiliary machinery servicing, and maritime safety regulations.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'Non-NC',
    hours: 320,
  },
  {
    code: 'TECH-MARITIME-TRANS',
    name: 'Marine Transportation at the Support Level',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Maritime Transport',
    description: 'Navigational watchkeeping, helm commands, deck operations, and seafaring safety.',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [11, 12],
    prerequisites: 'none',
    ncLevel: 'Non-NC',
    hours: 320,
  },
  {
    code: 'TECH-WORKIMMERSION',
    name: 'Work Immersion (Industry Apprenticeship)',
    category: 'TechPro Elective',
    track: 'Technical-Professional Track',
    cluster: 'Field Experience',
    description: 'Mandatory full-time industry workplace immersion directly aligned with TESDA qualifications (320 to 640 hours).',
    level: 'SHS',
    nativeStrands: [],
    gradeLevels: [12],
    prerequisites: 'Completion of TechPro electives',
    hours: 320,
  },
];

/**
 * Filter Strengthened SHS Electives by track, cluster, grade, and doorway option
 */
export function getStrengthenedElectives({
  targetTrack,
  cluster,
  gradeLevel,
  isDoorway = false,
  previouslyTaken = [],
}: {
  targetTrack?: string;
  cluster?: string;
  gradeLevel?: number;
  isDoorway?: boolean;
  previouslyTaken?: string[];
}): ElectiveSubject[] {
  const normGrade = gradeLevel || 11;
  const takenSet = new Set(previouslyTaken);

  return STRENGTHENED_SHS_ELECTIVES.filter((item) => {
    if (takenSet.has(item.code)) return false;

    // Doorway mode: Returns subjects from the OPPOSITE track!
    if (isDoorway) {
      if (targetTrack === 'Academic Track') {
        if (item.track !== 'Technical-Professional Track') return false;
      } else {
        if (item.track !== 'Academic Track') return false;
      }
    } else if (targetTrack) {
      // Standard mode: Matches chosen track
      if (item.track && item.track !== targetTrack) return false;
    }

    // Filter by cluster if specified
    if (cluster && cluster !== 'ALL' && item.cluster !== cluster) {
      return false;
    }

    // Filter by grade level if applicable
    if (item.gradeLevels && !item.gradeLevels.includes(normGrade)) {
      return false;
    }

    return true;
  });
}

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

