export interface TeacherSpecializationEntry {
  mainSubjects: string[];
  secondarySubjects: string[];
  updatedAt?: string;
}

export type TeacherSpecializationsMap = Record<string, TeacherSpecializationEntry>;

export interface SubjectAreaOption {
  id: string;
  label: string;
  shortLabel: string;
  group: "JHS & General" | "SHS Core & Electives" | "Advisory & Support";
  keywords: string[];
}

export const SUBJECT_AREA_OPTIONS: SubjectAreaOption[] = [
  {
    id: "Mathematics",
    label: "Mathematics (JHS / General)",
    shortLabel: "Mathematics",
    group: "JHS & General",
    keywords: ["math", "mth", "calculus", "algebra", "geometry", "statistics"],
  },
  {
    id: "English",
    label: "English & Reading",
    shortLabel: "English",
    group: "JHS & General",
    keywords: ["english", "eng", "reading"],
  },
  {
    id: "Science",
    label: "Science (Bio / Chem / Phys)",
    shortLabel: "Science",
    group: "JHS & General",
    keywords: ["science", "sci", "biol", "chem", "phys"],
  },
  {
    id: "Filipino",
    label: "Filipino & Panitikan",
    shortLabel: "Filipino",
    group: "JHS & General",
    keywords: ["filipino", "fil", "panitikan"],
  },
  {
    id: "Araling Panlipunan",
    label: "Araling Panlipunan (AP)",
    shortLabel: "Araling Panlipunan",
    group: "JHS & General",
    keywords: ["araling", "panlipunan", "jhs-ap", " ap "],
  },
  {
    id: "MAPEH",
    label: "MAPEH (Music, Arts, PE, Health)",
    shortLabel: "MAPEH",
    group: "JHS & General",
    keywords: ["mapeh", "jhs-map", "music", "arts", "physical education", "health"],
  },
  {
    id: "TLE",
    label: "TLE (Technology & Livelihood)",
    shortLabel: "TLE",
    group: "JHS & General",
    keywords: ["tle", "livelihood", "jhs-tle"],
  },
  {
    id: "Values Education (EsP)",
    label: "Values Education (EsP)",
    shortLabel: "Values Ed (EsP)",
    group: "JHS & General",
    keywords: ["values", "esp", "jhs-val", "edukasyon sa pagpapakatao"],
  },
  {
    id: "SHS General Mathematics",
    label: "SHS General Mathematics",
    shortLabel: "SHS Gen Math",
    group: "SHS Core & Electives",
    keywords: ["general math", "shs-gmath"],
  },
  {
    id: "SHS General Science",
    label: "SHS General Science",
    shortLabel: "SHS Gen Science",
    group: "SHS Core & Electives",
    keywords: ["general science", "shs-gsci"],
  },
  {
    id: "SHS Effective Communication",
    label: "SHS Effective Communication / Mabisang Komunikasyon",
    shortLabel: "SHS Communication",
    group: "SHS Core & Electives",
    keywords: ["effective comm", "mabisang kom", "shs-effcom", "creative writ", "malikhaing"],
  },
  {
    id: "SHS Life & Career / Philosophy",
    label: "SHS Life & Career Skills / Philosophy",
    shortLabel: "Life & Career / Philosophy",
    group: "SHS Core & Electives",
    keywords: ["life and career", "life career", "shs-lcskills", "philos", "acad-philos"],
  },
  {
    id: "SHS Kasaysayan & Social Sciences",
    label: "SHS Kasaysayan / Social Sciences & Governance",
    shortLabel: "Kasaysayan & SocSci",
    group: "SHS Core & Electives",
    keywords: ["kasaysayan", "lipunan", "shs-kasay", "socsci", "governance", "politics", "acad-gov"],
  },
  {
    id: "SHS Agriculture & Tech-Pro",
    label: "SHS Agriculture & Tech-Pro (TVL / NC II)",
    shortLabel: "Agri & Tech-Pro",
    group: "SHS Core & Electives",
    keywords: ["agri", "crops", "organic", "food processing", "bakery", "electrical", "tech-", "techpro", "tvl"],
  },
  {
    id: "SHS ICT & Computing",
    label: "SHS ICT & Computer Systems (CSS)",
    shortLabel: "ICT & Computing",
    group: "SHS Core & Electives",
    keywords: ["comput", "ict", "tech-css", "css", "programming"],
  },
  {
    id: "SHS Business & Accounting",
    label: "SHS Business & Basic Accounting",
    shortLabel: "Business & Accounting",
    group: "SHS Core & Electives",
    keywords: ["business", "account", "bacc", "entrep", "marketing"],
  },
  {
    id: "Homeroom & Intervention",
    label: "Homeroom Guidance (HGP), ARAL & Intervention",
    shortLabel: "Homeroom / ARAL / LI",
    group: "Advisory & Support",
    keywords: ["hgp", "homeroom", "aral", "remediation", "intervention", "shs-li", "co-curricular", "cocurr"],
  },
];

export function inferDefaultSubjectsForTeacher(teacher: {
  teacher_id?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
}): TeacherSpecializationEntry {
  const fn = (teacher.first_name || "").toUpperCase().trim();
  const ln = (teacher.last_name || "").toUpperCase().trim();

  if (ln === "SORIANO") return { mainSubjects: ["Araling Panlipunan"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "RAVAL" || (fn.includes("CHAD") && ln === "TUMPAP")) return { mainSubjects: ["Mathematics"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "MANGILAYA" || (fn.includes("MARICEL") && ln === "AGPAOA")) return { mainSubjects: ["English"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "APON") return { mainSubjects: ["Science"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "ESTEVES") return { mainSubjects: ["MAPEH"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "YACAP" || (fn.includes("SARAH") && ln === "GOMEZ")) return { mainSubjects: ["Filipino"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "ALE" || (fn.includes("ELENA") && ln === "VALDEZ")) return { mainSubjects: ["TLE"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "RIVERA") return { mainSubjects: ["Values Education (EsP)"], secondarySubjects: ["Homeroom & Intervention"] };
  if (fn.includes("KENNETH") && ln === "DELA CRUZ") return { mainSubjects: ["Araling Panlipunan"], secondarySubjects: ["Values Education (EsP)"] };
  if (fn.includes("JOSEPH") && ln === "RAMOS") return { mainSubjects: ["MAPEH", "Values Education (EsP)"], secondarySubjects: ["Homeroom & Intervention"] };

  if (ln === "SUNIGA") return { mainSubjects: ["SHS General Mathematics", "SHS General Science"], secondarySubjects: ["Mathematics", "Science"] };
  if (ln === "SAUNEL" || ln === "CASTRO") return { mainSubjects: ["SHS Life & Career / Philosophy"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "CALIPJO") return { mainSubjects: ["SHS Effective Communication"], secondarySubjects: ["English"] };
  if (ln === "BAGAIN") return { mainSubjects: ["SHS Effective Communication", "Filipino"], secondarySubjects: ["Homeroom & Intervention"] };
  if (ln === "PUNZALAN") return { mainSubjects: ["SHS Kasaysayan & Social Sciences"], secondarySubjects: ["Araling Panlipunan"] };
  if (ln === "NIETO") return { mainSubjects: ["SHS Agriculture & Tech-Pro"], secondarySubjects: ["TLE"] };
  if (fn.includes("CHRISTIAN") && ln === "MAGDAONG") return { mainSubjects: ["SHS General Science", "Science"], secondarySubjects: ["SHS Agriculture & Tech-Pro"] };
  if (fn.includes("DIVINA") && ln === "PACRIS") return { mainSubjects: ["SHS Business & Accounting"], secondarySubjects: ["SHS General Mathematics"] };
  if (fn.includes("MARK") && ln === "LUNA") return { mainSubjects: ["SHS ICT & Computing"], secondarySubjects: ["TLE"] };

  return { mainSubjects: [], secondarySubjects: [] };
}

export function resolveTeacherSpecialization(
  teacher: {
    id?: string;
    teacher_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    department?: string;
  },
  savedMap: TeacherSpecializationsMap
): TeacherSpecializationEntry {
  const keys = [
    teacher.id || "",
    (teacher.teacher_id || "").toUpperCase(),
    (teacher.email || "").toLowerCase(),
  ].filter(Boolean);

  for (const k of keys) {
    if (savedMap[k]) {
      return {
        mainSubjects: Array.isArray(savedMap[k].mainSubjects) ? savedMap[k].mainSubjects : [],
        secondarySubjects: Array.isArray(savedMap[k].secondarySubjects) ? savedMap[k].secondarySubjects : [],
        updatedAt: savedMap[k].updatedAt,
      };
    }
  }

  return inferDefaultSubjectsForTeacher(teacher);
}

export function doesSubjectAreaMatchCourse(
  areaId: string,
  subjectName: string,
  subjectCode: string,
  isSHS: boolean
): boolean {
  const text = ` ${subjectName} ${subjectCode} `.toLowerCase();

  switch (areaId) {
    case "SHS General Mathematics":
      return text.includes("general math") || text.includes("shs-gmath") || (isSHS && text.includes("math"));
    case "Mathematics":
      return text.includes("math") || text.includes("mth") || text.includes("calculus");
    case "SHS General Science":
      return text.includes("general science") || text.includes("shs-gsci") || (isSHS && (text.includes("sci") || text.includes("biol") || text.includes("chem") || text.includes("phys")));
    case "Science":
      return text.includes("science") || text.includes("jhs-sci") || text.includes("biol") || text.includes("chem") || text.includes("phys");
    case "SHS Effective Communication":
      return text.includes("effective comm") || text.includes("mabisang kom") || text.includes("shs-effcom") || text.includes("creative writ") || text.includes("malikhaing");
    case "English":
      return text.includes("english") || text.includes("jhs-eng") || text.includes("reading") || text.includes("effective comm") || text.includes("creative writ");
    case "Filipino":
      return text.includes("filipino") || text.includes("jhs-fil") || text.includes("panitikan") || text.includes("mabisang kom") || text.includes("malikhaing");
    case "SHS Life & Career / Philosophy":
      return text.includes("life and career") || text.includes("life career") || text.includes("shs-lcskills") || text.includes("philos");
    case "SHS Kasaysayan & Social Sciences":
      return text.includes("kasaysayan") || text.includes("lipunan") || text.includes("shs-kasay") || text.includes("socsci") || text.includes("governance") || text.includes("politics");
    case "Araling Panlipunan":
      return text.includes("araling") || text.includes("panlipunan") || text.includes("jhs-ap") || text.includes("kasaysayan") || text.includes("socsci") || text.includes("governance");
    case "MAPEH":
      return text.includes("mapeh") || text.includes("jhs-map") || text.includes("physical education") || text.includes("health");
    case "Values Education (EsP)":
      return text.includes("values") || text.includes("esp") || text.includes("jhs-val") || text.includes("homeroom") || text.includes("hgp");
    case "SHS Agriculture & Tech-Pro":
      return text.includes("agri") || text.includes("crops") || text.includes("organic") || text.includes("food") || text.includes("bakery") || text.includes("electrical") || text.includes("tech-") || text.includes("techpro");
    case "SHS ICT & Computing":
      return text.includes("comput") || text.includes("ict") || text.includes("tech-css") || text.includes("css");
    case "TLE":
      return text.includes("tle") || text.includes("livelihood") || text.includes("jhs-tle") || text.includes("agri") || text.includes("crops") || text.includes("food") || text.includes("bakery") || text.includes("electrical");
    case "SHS Business & Accounting":
      return text.includes("business") || text.includes("account") || text.includes("bacc") || text.includes("entrep");
    case "Homeroom & Intervention":
      return text.includes("hgp") || text.includes("homeroom") || text.includes("aral") || text.includes("remediation") || text.includes("intervention") || text.includes("shs-li") || text.includes("co-curricular") || text.includes("cocurr");
    default: {
      const opt = SUBJECT_AREA_OPTIONS.find((o) => o.id === areaId);
      if (!opt) return false;
      return opt.keywords.some((kw) => text.includes(kw));
    }
  }
}
