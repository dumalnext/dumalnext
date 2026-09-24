import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

export interface CourseSubjectItem {
  id: string;
  subject_code: string;
  subject_name: string;
  subject_type: "Core" | "Elective" | "Applied" | "Specialized" | "Intervention";
  grade_level: number;
  trimester: number;
  strand?: string | null;
  description?: string | null;
  created_at?: string;
}

const DEFAULT_FALLBACK_SUBJECTS: CourseSubjectItem[] = [
  // Grade 7 JHS Core
  { id: "sub-jhs-7-01", subject_code: "JHS-VAL7", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-02", subject_code: "JHS-FIL7", subject_name: "Filipino", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-03", subject_code: "JHS-ENG7", subject_name: "English", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-04", subject_code: "JHS-SCI7", subject_name: "Science", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-05", subject_code: "JHS-MTH7", subject_name: "Mathematics", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-06", subject_code: "JHS-AP7", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-07", subject_code: "JHS-TLE7", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-08", subject_code: "JHS-MAP7", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 7, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-7-09", subject_code: "JHS-SPS7", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 7, trimester: 1, strand: "SPS" },
  { id: "sub-jhs-7-10", subject_code: "JHS-ARAL7", subject_name: "ARAL Program (Academic Recovery)", subject_type: "Intervention", grade_level: 7, trimester: 1, strand: "Regular" },

  // Grade 8 JHS Core
  { id: "sub-jhs-8-01", subject_code: "JHS-VAL8", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-02", subject_code: "JHS-FIL8", subject_name: "Filipino", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-03", subject_code: "JHS-ENG8", subject_name: "English", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-04", subject_code: "JHS-SCI8", subject_name: "Science", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-05", subject_code: "JHS-MTH8", subject_name: "Mathematics", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-06", subject_code: "JHS-AP8", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-07", subject_code: "JHS-TLE8", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-08", subject_code: "JHS-MAP8", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 8, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-8-09", subject_code: "JHS-SPS8", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 8, trimester: 1, strand: "SPS" },

  // Grade 9 JHS Core
  { id: "sub-jhs-9-01", subject_code: "JHS-VAL9", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-02", subject_code: "JHS-FIL9", subject_name: "Filipino", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-03", subject_code: "JHS-ENG9", subject_name: "English", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-04", subject_code: "JHS-SCI9", subject_name: "Science", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-05", subject_code: "JHS-MTH9", subject_name: "Mathematics", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-06", subject_code: "JHS-AP9", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-07", subject_code: "JHS-TLE9", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-08", subject_code: "JHS-MAP9", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 9, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-9-09", subject_code: "JHS-SPS9", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 9, trimester: 1, strand: "SPS" },

  // Grade 10 JHS Core
  { id: "sub-jhs-10-01", subject_code: "JHS-VAL10", subject_name: "Values Education (EsP)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-02", subject_code: "JHS-FIL10", subject_name: "Filipino", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-03", subject_code: "JHS-ENG10", subject_name: "English", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-04", subject_code: "JHS-SCI10", subject_name: "Science", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-05", subject_code: "JHS-MTH10", subject_name: "Mathematics", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-06", subject_code: "JHS-AP10", subject_name: "Araling Panlipunan", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-07", subject_code: "JHS-TLE10", subject_name: "Technology & Livelihood Education (TLE)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-08", subject_code: "JHS-MAP10", subject_name: "MAPEH (Music, Arts, PE, Health)", subject_type: "Core", grade_level: 10, trimester: 1, strand: "Regular" },
  { id: "sub-jhs-10-09", subject_code: "JHS-SPS10", subject_name: "General Sports & Athletic Training", subject_type: "Specialized", grade_level: 10, trimester: 1, strand: "SPS" },

  // Senior High School (Grades 11 & 12) - DepEd Strengthened SHS Curriculum
  // 5 Mandatory Core Subjects
  { id: "sub-shs-11-01", subject_code: "SHS-EFFCOM11", subject_name: "Effective Communication / Mabisang Komunikasyon", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General", description: "Dual-language framework (English & Filipino parallel strands, 160 hrs, CEFR B2 level)." },
  { id: "sub-shs-11-02", subject_code: "SHS-GMATH11", subject_name: "General Mathematics", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General", description: "Numbers, algebra, geometry, measurement, and applied statistics for real-world decision-making." },
  { id: "sub-shs-11-03", subject_code: "SHS-GSCI11", subject_name: "General Science", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General", description: "Multidisciplinary science (Physics, Chemistry, Biology, Earth & Space Science)." },
  { id: "sub-shs-11-04", subject_code: "SHS-LCSKILLS11", subject_name: "Life and Career Skills", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General", description: "Personal development, health and wellness, resilience, and workplace readiness." },
  { id: "sub-shs-11-05", subject_code: "SHS-KASAY11", subject_name: "Pag-aaral ng Kasaysayan at Lipunang Pilipino", subject_type: "Core", grade_level: 11, trimester: 1, strand: "General", description: "Pagsusuri ng kasaysayan, kultura, sibiko, at panlipunang kamalayan." },

  // Academic Electives - Arts, Social Sciences, & Humanities
  { id: "sub-shs-acad-01", subject_code: "ACAD-ARTS1", subject_name: "Arts 1 (Visual, Literary, Media, Applied, Traditional)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Creative industries and indigenous arts." },
  { id: "sub-shs-acad-02", subject_code: "ACAD-ARTS2", subject_name: "Arts 2 (Music, Dance, and Theater)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Performing arts and stage production." },
  { id: "sub-shs-acad-03", subject_code: "ACAD-CITIZEN", subject_name: "Citizenship and Civic Engagement", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Civic leadership and democratic institutions." },
  { id: "sub-shs-acad-04", subject_code: "ACAD-CONLIT1", subject_name: "Contemporary Literature 1", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Regional and global literature criticism." },
  { id: "sub-shs-acad-05", subject_code: "ACAD-FIL1", subject_name: "Filipino 1 (Wika at Komunikasyon sa Akademikong Filipino)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Akademikong pagsulat at diskursong Filipino." },
  { id: "sub-shs-acad-06", subject_code: "ACAD-PHILOS", subject_name: "Introduction to Philosophy", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Philosophical discernment and critical ethics." },
  { id: "sub-shs-acad-07", subject_code: "ACAD-MALIKPAG", subject_name: "Malikhaing Pagsulat", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Fiction, drama, and contemporary poetry." },
  { id: "sub-shs-acad-08", subject_code: "ACAD-GOV", subject_name: "Philippine Governance (Politics and Governance)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Constitutional laws and political dynamics." },
  { id: "sub-shs-acad-09", subject_code: "ACAD-SOCSCI", subject_name: "Social Sciences (Theory and Practice)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Applied sociology and human behavior." },

  // Academic Electives - Business & Entrepreneurship
  { id: "sub-shs-acad-10", subject_code: "ACAD-BACC1", subject_name: "Business 1 (Basic Accounting)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Financial ledgers, bookkeeping, and balance sheets." },
  { id: "sub-shs-acad-11", subject_code: "ACAD-ORGMGT", subject_name: "Introduction to Organization and Management", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Corporate operations and human resources." },
  { id: "sub-shs-acad-12", subject_code: "ACAD-BFIN2", subject_name: "Business 2 (Business Finance & Income Taxation)", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "Academic", description: "Financial management and Philippine tax systems." },
  { id: "sub-shs-acad-13", subject_code: "ACAD-BECON3", subject_name: "Business 3 (Business Economics)", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "Academic", description: "Macro and microeconomic modeling." },
  { id: "sub-shs-acad-14", subject_code: "ACAD-MKTG", subject_name: "Contemporary Marketing", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Brand development and digital commerce." },
  { id: "sub-shs-acad-15", subject_code: "ACAD-ENTREP", subject_name: "Entrepreneurship", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "Academic", description: "Business enterprise planning and incubation." },

  // Academic Electives - STEM
  { id: "sub-shs-acad-16", subject_code: "ACAD-BIO1", subject_name: "Biology 1", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Cellular biology, bioenergetics, and biochemistry." },
  { id: "sub-shs-acad-17", subject_code: "ACAD-BIO2", subject_name: "Biology 2", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Genetics, molecular inheritance, and evolution." },
  { id: "sub-shs-acad-18", subject_code: "ACAD-CHEM1", subject_name: "Chemistry 1", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Atomic theory, molecular bonding, and stoichiometry." },
  { id: "sub-shs-acad-19", subject_code: "ACAD-CHEM2", subject_name: "Chemistry 2", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Chemical equilibrium, thermochemistry, and kinetics." },
  { id: "sub-shs-acad-20", subject_code: "ACAD-PHYS1", subject_name: "Physics 1", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Classical mechanics and kinematic motion." },
  { id: "sub-shs-acad-21", subject_code: "ACAD-PHYS2", subject_name: "Physics 2", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Fluids, thermodynamics, and wave oscillations." },
  { id: "sub-shs-acad-22", subject_code: "ACAD-ESS1", subject_name: "Earth and Space Science 1", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Geological systems and plate tectonics." },
  { id: "sub-shs-acad-23", subject_code: "ACAD-ESS2", subject_name: "Earth and Space Science 2", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Meteorology and atmospheric cycles." },
  { id: "sub-shs-acad-24", subject_code: "ACAD-PRECAL1", subject_name: "Pre-calculus 1", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "Academic", description: "Conic sections and non-linear mathematical models." },
  { id: "sub-shs-acad-25", subject_code: "ACAD-ADVMATH1", subject_name: "Advanced Mathematics 1", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "Academic", description: "Advanced functions and differential equations." },
  { id: "sub-shs-acad-26", subject_code: "ACAD-DATA", subject_name: "Fundamentals in Data Analytics", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "Academic", description: "Data analytics, statistical modeling, and insights." },
  { id: "sub-shs-acad-27", subject_code: "ACAD-DBMGT", subject_name: "Database Management", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "Academic", description: "SQL database architecture and information storage." },
  { id: "sub-shs-acad-28", subject_code: "ACAD-EMPTECH", subject_name: "Empowerment Technologies", subject_type: "Applied", grade_level: 11, trimester: 1, strand: "Academic", description: "ICT productivity tools, cloud platforms, and web literacy." },

  // Academic Electives - Sports & Health
  { id: "sub-shs-acad-29", subject_code: "ACAD-HMOV1", subject_name: "Human Movement 1 (Basic Anatomy)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Kinesiology and exercise anatomy." },
  { id: "sub-shs-acad-30", subject_code: "ACAD-HMOV2", subject_name: "Human Movement 2 (Motor Skills)", subject_type: "Elective", grade_level: 11, trimester: 1, strand: "Academic", description: "Neuromuscular motor learning and athletics." },
  { id: "sub-shs-acad-31", subject_code: "ACAD-FIRSTAID", subject_name: "Safety and First Aid", subject_type: "Elective", grade_level: 12, trimester: 1, strand: "Academic", description: "Emergency response and sports trauma care." },

  // Academic - Field Experience
  { id: "sub-shs-acad-32", subject_code: "ACAD-RESMETH", subject_name: "Research Methods", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "Academic", description: "Scholarly methodology and quantitative/qualitative research." },
  { id: "sub-shs-acad-33", subject_code: "ACAD-DESINNOV", subject_name: "Design and Innovation", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "Academic", description: "Applied research prototyping and technical design (160 hrs)." },
  { id: "sub-shs-acad-34", subject_code: "ACAD-FIELDEXP", subject_name: "Field Exposure (Professional Immersion)", subject_type: "Applied", grade_level: 12, trimester: 1, strand: "Academic", description: "Real-world academic exposure in laboratories and corporate settings (320 hrs)." },

  // TechPro Electives (TESDA NC-Aligned)
  { id: "sub-shs-tech-01", subject_code: "TECH-CROPS", subject_name: "Agricultural Crops Production (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Horticulture, organic propagation, and farm mechanics (320 hrs)." },
  { id: "sub-shs-tech-02", subject_code: "TECH-ORGANIC", subject_name: "Organic Agriculture Production (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Bio-fertilizers, organic farming, and ecological agriculture (320 hrs)." },
  { id: "sub-shs-tech-03", subject_code: "TECH-FOODPROC", subject_name: "Food Processing (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Commercial food preservation, canning, and packaging (320 hrs)." },
  { id: "sub-shs-tech-04", subject_code: "TECH-BAKERY", subject_name: "Bakery Operation (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Commercial baking, bread crafting, and pastry culinary (320 hrs)." },
  { id: "sub-shs-tech-05", subject_code: "TECH-FNB", subject_name: "Food and Beverage Operation (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Hospitality banquet service and beverage mixology (320 hrs)." },
  { id: "sub-shs-tech-06", subject_code: "TECH-HOTEL", subject_name: "Hotel Operation (Front Office Services NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Hospitality front desk, reservations, and customer relations (320 hrs)." },
  { id: "sub-shs-tech-07", subject_code: "TECH-CAREADULT", subject_name: "Caregiving (Adult Care NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Geriatric nursing support and palliative care (320 hrs)." },
  { id: "sub-shs-tech-08", subject_code: "TECH-CAREDCHILD", subject_name: "Caregiving (Child Care NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Pediatric care, early childhood development, and health (320 hrs)." },
  { id: "sub-shs-tech-09", subject_code: "TECH-BEAUTY", subject_name: "Aesthetic Services (Beauty Care NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Salon beauty therapy, cosmetology, and spa treatments (320 hrs)." },
  { id: "sub-shs-tech-10", subject_code: "TECH-AUTOSERV", subject_name: "Driving and Automotive Servicing (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Motor vehicle operation, chassis maintenance, and diagnostics (320 hrs)." },
  { id: "sub-shs-tech-11", subject_code: "TECH-MOTO", subject_name: "Motorcycle and Small Engine Servicing (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Small powertrain repair, carburetion, and electrical troubleshooting (320 hrs)." },
  { id: "sub-shs-tech-12", subject_code: "TECH-WELD", subject_name: "Manual Metal Arc Welding (MMAW NC I/II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Industrial structural welding and pipe fabrication (320 hrs)." },
  { id: "sub-shs-tech-13", subject_code: "TECH-DRAFTING", subject_name: "Technical Drafting (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "CAD blueprints, architectural drawing, and schematics (320 hrs)." },
  { id: "sub-shs-tech-14", subject_code: "TECH-EIM", subject_name: "Electrical Installation Maintenance (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Residential wiring, conduit layout, and power circuits (320 hrs)." },
  { id: "sub-shs-tech-15", subject_code: "TECH-EPAS", subject_name: "Electronics Product Assembly and Servicing (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "PCB soldering, consumer electronics diagnosis, and repairs (320 hrs)." },
  { id: "sub-shs-tech-16", subject_code: "TECH-SOLAR", subject_name: "Photovoltaic Systems Installation (Solar Energy NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Renewable solar PV installations, inverters, and maintenance (320 hrs)." },
  { id: "sub-shs-tech-17", subject_code: "TECH-JAVA", subject_name: "Computer Programming (Java NC III)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "OOP architecture, algorithms, and backend software engineering (320 hrs)." },
  { id: "sub-shs-tech-18", subject_code: "TECH-DOTNET", subject_name: "Computer Programming (.Net Technology NC III)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "C# applications, web APIs, and desktop software (320 hrs)." },
  { id: "sub-shs-tech-19", subject_code: "TECH-CSS", subject_name: "Computer Systems Servicing (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Computer hardware assembly, network cabling, and server setup (320 hrs)." },
  { id: "sub-shs-tech-20", subject_code: "TECH-ANIM", subject_name: "Animation (NC II)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "2D/3D digital animation and multimedia storyboard sequencing (320 hrs)." },
  { id: "sub-shs-tech-21", subject_code: "TECH-GRAPHIC", subject_name: "Visual Graphic Design (NC III)", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Graphic branding, UI layout, typography, and digital art (320 hrs)." },
  { id: "sub-shs-tech-22", subject_code: "TECH-MARITIME-ENG", subject_name: "Marine Engineering Support", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Vessel auxiliary engine maintenance and seafaring safety (320 hrs)." },
  { id: "sub-shs-tech-23", subject_code: "TECH-MARITIME-TRANS", subject_name: "Marine Transportation Support", subject_type: "Specialized", grade_level: 11, trimester: 1, strand: "TechPro", description: "Deck watchkeeping, maritime navigation, and vessel safety (320 hrs)." },
  { id: "sub-shs-tech-24", subject_code: "TECH-WORKIMMERSION", subject_name: "Work Immersion (Mandatory TechPro Apprenticeship)", subject_type: "Specialized", grade_level: 12, trimester: 1, strand: "TechPro", description: "Mandatory intensive industry on-the-job training (320 to 640 hrs)." },
];

function normalizeSubject(row: any): CourseSubjectItem {
  return {
    id: row.id || `subj-${row.subject_code || row.subjectCode}`,
    subject_code: (row.subject_code || row.subjectCode || "").trim().toUpperCase(),
    subject_name: (row.subject_name || row.subjectName || "").trim(),
    subject_type: (row.subject_type || row.subjectType || "Core"),
    grade_level: Number(row.grade_level || row.gradeLevel || 7),
    trimester: Number(row.trimester || 1),
    strand: row.strand || null,
    description: row.description || null,
    created_at: row.created_at || row.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const gradeLevel = searchParams.get("gradeLevel");
    const strand = searchParams.get("strand");

    let dbSubjects: CourseSubjectItem[] = [];
    let customSubjects: CourseSubjectItem[] = [];
    let deletedCodes: string[] = [];

    if (supabase) {
      try {
        const { data: dbData } = await supabase
          .from("course_subjects")
          .select("*")
          .order("grade_level", { ascending: true })
          .order("subject_code", { ascending: true });

        if (dbData && dbData.length > 0) {
          dbSubjects = dbData.map(normalizeSubject);
        }
      } catch {}

      try {
        const { data: sysData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "subjects_config")
          .maybeSingle();

        if (sysData?.value) {
          if (Array.isArray(sysData.value.subjects)) {
            customSubjects = sysData.value.subjects.map(normalizeSubject);
          }
          if (Array.isArray(sysData.value.deletedCodes)) {
            deletedCodes = sysData.value.deletedCodes;
          }
        }
      } catch {}
    }

    const subjectMap = new Map<string, CourseSubjectItem>();
    DEFAULT_FALLBACK_SUBJECTS.forEach((s) => subjectMap.set(s.subject_code, s));
    dbSubjects.forEach((s) => subjectMap.set(s.subject_code, s));
    customSubjects.forEach((s) => subjectMap.set(s.subject_code, s));
    deletedCodes.forEach((code) => subjectMap.delete(code));

    let list = Array.from(subjectMap.values());

    if (gradeLevel && gradeLevel !== "ALL") {
      const gl = Number(gradeLevel);
      list = list.filter((s) => s.grade_level === gl);
    }
    if (strand && strand !== "ALL") {
      list = list.filter((s) => {
        if (!s.strand) return false;
        return s.strand.toUpperCase() === strand.toUpperCase();
      });
    }

    list.sort((a, b) => {
      if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
      return a.subject_name.localeCompare(b.subject_name);
    });

    return NextResponse.json({
      success: true,
      subjects: list,
      totalCount: list.length,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to fetch subjects",
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
