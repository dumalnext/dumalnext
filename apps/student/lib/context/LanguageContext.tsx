"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ilo" | "fil";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "ilo", label: "Ilokano", nativeName: "Ilokano" },
  { code: "fil", label: "Tagalog", nativeName: "Tagalog" },
];

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Common Header
    "nav.overview": "Overview",
    "nav.mySection": "My Section",
    "nav.myProfile": "My Profile",
    "nav.signIn": "Sign In",
    "nav.signOut": "Sign Out",
    "nav.guestVisitor": "GUEST VISITOR",
    "nav.guestDesc": "Sign in with your verified email to access online basic education enrollment or track your application status.",
    "nav.portalModules": "PORTAL MODULES",
    "nav.studentProfile": "Student Profile",
    "nav.selectLanguage": "Language",

    // Hero Section
    "hero.subhead": "DUMALNEG, ILOCOS NORTE • JUNIOR & SENIOR HIGH SCHOOL",
    "hero.title": "Online Basic Education Admission & Continuing Enrollment",
    "hero.desc": "Official learner gateway for incoming Grade 7, Grade 11, transferees, and continuing learners of Dumalneg National High School.",
    "hero.enrollmentOpen": "Enrollment Open",
    "hero.enrollmentClosed": "Enrollment Closed",
    "hero.schoolId": "DepEd School ID: 300017",

    // 4 Simple Steps
    "steps.header": "How to Enroll Online in 4 Simple Steps",
    "steps.gradeScope": "Grades 7–10 (JHS) & Grades 11–12 (SHS)",
    "steps.step1Title": "Create Account & Verify Gmail",
    "steps.step1Desc": "Register with your PSA full name and active Gmail, then enter the 6-digit verification code.",
    "steps.step2Title": "Fill Out Enrollment Form",
    "steps.step2Desc": "Complete the 5-step DepEd form (or 1-click re-enrollment for continuing learners).",
    "steps.step3Title": "Upload School Documents",
    "steps.step3Desc": "Submit clear copies of your PSA Birth Certificate, SF9 Report Card, and 2x2 ID Picture.",
    "steps.step4Title": "Track Status & Class Section",
    "steps.step4Desc": "View real-time Administrator approval, check your assigned section, and download your DepEd PDF.",

    // Login & Auth Card
    "auth.gateway": "Learner Gateway",
    "auth.accessTitle": "Student Portal Access",
    "auth.signInTab": "Sign In",
    "auth.createAccountTab": "Create Account",
    "auth.signInHeader": "Sign In to Your Learner Account",
    "auth.signInDesc": "Enter your registered email address and password to continue enrollment or check your application status.",
    "auth.emailLabel": "Registered Email Address",
    "auth.emailPlaceholder": "e.g. learner@gmail.com or 12-digit LRN",
    "auth.passwordLabel": "Password",
    "auth.passwordPlaceholder": "Enter your account password",
    "auth.showPassword": "Show Password",
    "auth.hidePassword": "Hide Password",
    "auth.signInBtn": "Sign In to Student Portal",
    "auth.signingIn": "Signing In... Please Wait",
    "auth.forgotPassword": "Forgot password? Contact / Email dumalnext@gmail.com",
    "auth.trackConcern": "Track Concern Status",
    "auth.newApplicant": "New applicant or first time using the online portal?",
    "auth.createLink": "Create a Student Account",

    // Registration Card
    "auth.createHeader": "Create Student Applicant Account",
    "auth.createDesc": "Enter your official PSA name and active Gmail address to start your online enrollment.",
    "auth.lastName": "Last Name",
    "auth.firstName": "First Name",
    "auth.middleName": "Middle Name",
    "auth.noMiddleName": "No Middle Name",
    "auth.gmailAddress": "Active Gmail Address",
    "auth.lrnOptional": "12-Digit LRN (Learner Reference Number)",
    "auth.createPassword": "Create Account Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.registerBtn": "Register & Send 6-Digit Code",
    "auth.registering": "Registering Student Account...",
    "auth.alreadyHaveAccount": "Already have a student account?",
    "auth.signInHere": "Sign in here",

    // Dashboard
    "dash.welcomeBack": "Welcome back",
    "dash.learnerStatus": "Official Learner Status",
    "dash.quickActions": "Quick Actions",
    "dash.enrollNow": "Enroll Now",
    "dash.viewSection": "View Class Section",
    "dash.viewProfile": "View Student Profile",
  },
  ilo: {
    // Navigation & Common Header (Ilokano)
    "nav.overview": "Pakabuklan",
    "nav.mySection": "Ti Seksionko",
    "nav.myProfile": "Ti Propyelko",
    "nav.signIn": "Sumrek",
    "nav.signOut": "Rumuarna",
    "nav.guestVisitor": "BISITA NGA AGAD-ADAL",
    "nav.guestDesc": "Sumrek babaen ti napasingkedan nga email tapno ma-access ti online enrollment wenno masukimat ti kasasaad ti aplikasionmo.",
    "nav.portalModules": "DAGITI MODYUL TI PORTAL",
    "nav.studentProfile": "Propyel ti Estudiante",
    "nav.selectLanguage": "Pagsasao",

    // Hero Section
    "hero.subhead": "DUMALNEG, ILOCOS NORTE • JUNIOR & SENIOR HIGH SCHOOL",
    "hero.title": "Online a Panagpalista iti Kangrunaan a Panagadal & Agtultuloy a Panag-enroll",
    "hero.desc": "Opisial a ruangan ti agad-adal para kadagiti sumrek iti Grado 7, Grado 11, transferees, ken agtultuloy nga estudiante iti Dumalneg National High School.",
    "hero.enrollmentOpen": "Silulukat ti Panagpalista",
    "hero.enrollmentClosed": "Nakaserra ti Panagpalista",
    "hero.schoolId": "DepEd School ID: 300017",

    // 4 Simple Steps
    "steps.header": "Kasano ti Ag-enroll Online iti 4 a Nalaka nga Addang",
    "steps.gradeScope": "Grado 7–10 (JHS) & Grado 11–12 (SHS)",
    "steps.step1Title": "Agaramid ti Account & Pasingkedan ti Gmail",
    "steps.step1Desc": "Agrehistro babaen ti kompleto a nagan iti PSA ken aktibo a Gmail, sa ipan ti 6-digit verification code.",
    "steps.step2Title": "Punnuan ti Form ti Panagpalista",
    "steps.step2Desc": "Kumpletuen ti 5-nga addang a DepEd form (wenno 1-click re-enrollment para kadagiti agtultuloy nga agad-adal).",
    "steps.step3Title": "I-upload dagiti Dokumento ti Eskwela",
    "steps.step3Desc": "Ipasa ti nalawag a kopia ti PSA Birth Certificate, SF9 Report Card, ken 2x2 ID Picture.",
    "steps.step4Title": "Sukimaten ti Kasasaad & Seksion ti Klase",
    "steps.step4Desc": "Kitaen ti real-time nga aprobal ti Administrador, masukimat ti naited a seksion, ken i-download ti DepEd PDF.",

    // Login & Auth Card
    "auth.gateway": "Ruangan ti Agad-adal",
    "auth.accessTitle": "Panagserrek iti Student Portal",
    "auth.signInTab": "Sumrek",
    "auth.createAccountTab": "Agaramid ti Account",
    "auth.signInHeader": "Sumrek iti Accountmo kas Agad-adal",
    "auth.signInDesc": "Iserrek ti narehistro nga email address ken password tapno ituloy ti panagpalista wenno kitaen ti kasasaad ti aplikasionmo.",
    "auth.emailLabel": "Narehistro nga Email Address",
    "auth.emailPlaceholder": "kaspagarigan: learner@gmail.com wenno 12-digit LRN",
    "auth.passwordLabel": "Password",
    "auth.passwordPlaceholder": "Iserrek ti password ti accountmo",
    "auth.showPassword": "Iparang ti Password",
    "auth.hidePassword": "Ilemmeng ti Password",
    "auth.signInBtn": "Sumrek iti Student Portal",
    "auth.signingIn": "Sumsumrek... Aguray bassit",
    "auth.forgotPassword": "Nalipatan ti password? Kontak / Email: dumalnext@gmail.com",
    "auth.trackConcern": "Sukimaten ti Kasasaad ti Pakaseknan",
    "auth.newApplicant": "Baro nga aplikante wenno umuna a gundaway nga agaramat iti online portal?",
    "auth.createLink": "Agaramid ti Account ti Estudiante",

    // Registration Card
    "auth.createHeader": "Agaramid ti Account kas Aplikante",
    "auth.createDesc": "Ipan ti opisial a nagan iti PSA ken aktibo a Gmail tapno mangrugi ti panagpalistam online.",
    "auth.lastName": "Apelyido",
    "auth.firstName": "Umuna a Nagan",
    "auth.middleName": "Tengnga a Nagan",
    "auth.noMiddleName": "Awan Tengnga a Nagan",
    "auth.gmailAddress": "Aktibo a Gmail Address",
    "auth.lrnOptional": "12-Digit a LRN (Learner Reference Number)",
    "auth.createPassword": "Agaramid ti Password ti Account",
    "auth.confirmPassword": "Pasingkedan ti Password",
    "auth.registerBtn": "Agrehistro & Ipatulod ti 6-Digit Code",
    "auth.registering": "Agram-aramid ti Account ti Estudiante...",
    "auth.alreadyHaveAccount": "Addaankan ti account kas estudiante?",
    "auth.signInHere": "Sumrek ditoy",

    // Dashboard
    "dash.welcomeBack": "Naragsak a panagsubli",
    "dash.learnerStatus": "Opisial a Kasasaad ti Agad-adal",
    "dash.quickActions": "Dagiti Napaspas nga Aksion",
    "dash.enrollNow": "Agpalista Ita",
    "dash.viewSection": "Kitaen ti Seksion ti Klase",
    "dash.viewProfile": "Kitaen ti Propyel ti Estudiante",
  },
  fil: {
    // Navigation & Common Header (Tagalog)
    "nav.overview": "Pangkalahatan",
    "nav.mySection": "Aking Seksiyon",
    "nav.myProfile": "Aking Profile",
    "nav.signIn": "Mag-sign In",
    "nav.signOut": "Mag-sign Out",
    "nav.guestVisitor": "PANAUHING BISITA",
    "nav.guestDesc": "Mag-sign in gamit ang iyong beripikadong email upang ma-access ang online enrollment o masubaybayan ang katayuan ng aplikasyon.",
    "nav.portalModules": "MGA MODYUL NG PORTAL",
    "nav.studentProfile": "Profile ng Mag-aaral",
    "nav.selectLanguage": "Wika",

    // Hero Section
    "hero.subhead": "DUMALNEG, ILOCOS NORTE • JUNIOR & SENIOR HIGH SCHOOL",
    "hero.title": "Online na Pagpapatala sa Pangunahing Edukasyon & Patuloy na Pag-eenroll",
    "hero.desc": "Opisyal na lagusan ng mag-aaral para sa mga papasok sa Grade 7, Grade 11, mga transferee, at nagpapatuloy na mag-aaral ng Dumalneg National High School.",
    "hero.enrollmentOpen": "Bukas ang Pagpapatala",
    "hero.enrollmentClosed": "Sarado ang Pagpapatala",
    "hero.schoolId": "DepEd School ID: 300017",

    // 4 Simple Steps
    "steps.header": "Paano Mag-enroll Online sa 4 na Madaling Hakbang",
    "steps.gradeScope": "Baitang 7–10 (JHS) & Baitang 11–12 (SHS)",
    "steps.step1Title": "Gumawa ng Account & I-beripika ang Gmail",
    "steps.step1Desc": "Magrehistro gamit ang buong pangalan sa PSA at aktibong Gmail, pagkatapos ay ilagay ang 6-digit na verification code.",
    "steps.step2Title": "Punan ang Enrollment Form",
    "steps.step2Desc": "Kumpletuhin ang 5-hakbang na DepEd form (o 1-click re-enrollment para sa mga nagpapatuloy na mag-aaral).",
    "steps.step3Title": "I-upload ang mga Dokumento sa Paaralan",
    "steps.step3Desc": "Magsumite ng malinaw na kopya ng iyong PSA Birth Certificate, SF9 Report Card, at 2x2 ID Picture.",
    "steps.step4Title": "Subaybayan ang Katayuan & Seksiyon ng Klase",
    "steps.step4Desc": "Tingnan ang real-time na pag-apruba ng Administrador, suriin ang nakatalagang seksiyon, at i-download ang DepEd PDF.",

    // Login & Auth Card
    "auth.gateway": "Lagusan ng Mag-aaral",
    "auth.accessTitle": "Pag-access sa Student Portal",
    "auth.signInTab": "Mag-sign In",
    "auth.createAccountTab": "Gumawa ng Account",
    "auth.signInHeader": "Mag-sign In sa Iyong Account ng Mag-aaral",
    "auth.signInDesc": "Ilagay ang iyong rehistradong email address at password upang magpatuloy sa enrollment o suriin ang katayuan ng aplikasyon.",
    "auth.emailLabel": "Rehistradong Email Address",
    "auth.emailPlaceholder": "hal. learner@gmail.com o 12-digit LRN",
    "auth.passwordLabel": "Password",
    "auth.passwordPlaceholder": "Ilagay ang password ng iyong account",
    "auth.showPassword": "Ipakita ang Password",
    "auth.hidePassword": "Itago ang Password",
    "auth.signInBtn": "Mag-sign In sa Student Portal",
    "auth.signingIn": "Pumapasok... Maghintay sandali",
    "auth.forgotPassword": "Nakalimutan ang password? Makipag-ugnayan / Mag-email: dumalnext@gmail.com",
    "auth.trackConcern": "Subaybayan ang Katayuan ng Reklamo",
    "auth.newApplicant": "Bagong aplikante o unang beses na gagamit ng online portal?",
    "auth.createLink": "Gumawa ng Account ng Mag-aaral",

    // Registration Card
    "auth.createHeader": "Gumawa ng Account ng Aplikanteng Mag-aaral",
    "auth.createDesc": "Ilagay ang opisyal na pangalan sa PSA at aktibong Gmail upang simulan ang iyong online enrollment.",
    "auth.lastName": "Apelyido",
    "auth.firstName": "Pangalan",
    "auth.middleName": "Gitnang Pangalan",
    "auth.noMiddleName": "Walang Gitnang Pangalan",
    "auth.gmailAddress": "Aktibong Gmail Address",
    "auth.lrnOptional": "12-Digit na LRN (Learner Reference Number)",
    "auth.createPassword": "Gumawa ng Password ng Account",
    "auth.confirmPassword": "Kumpirmahin ang Password",
    "auth.registerBtn": "Magrehistro & Ipadala ang 6-Digit Code",
    "auth.registering": "Inirerehistro ang Account ng Mag-aaral...",
    "auth.alreadyHaveAccount": "Mayroon ka na bang account ng mag-aaral?",
    "auth.signInHere": "Mag-sign in dito",

    // Dashboard
    "dash.welcomeBack": "Maligayang pagbabalik",
    "dash.learnerStatus": "Opisyal na Katayuan ng Mag-aaral",
    "dash.quickActions": "Mabilisang Aksiyon",
    "dash.enrollNow": "Magpalista Ngayon",
    "dash.viewSection": "Tingnan ang Seksiyon ng Klase",
    "dash.viewProfile": "Tingnan ang Profile ng Mag-aaral",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

const STORAGE_KEY = "dumalnext_student_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Load persisted language preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === "en" || saved === "ilo" || saved === "fil")) {
        setLanguageState(saved);
        if (typeof document !== "undefined") {
          document.documentElement.lang = saved;
        }
      }
    } catch (err) {
      console.warn("Could not read language from localStorage:", err);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
      }
    } catch (err) {
      console.warn("Could not save language to localStorage:", err);
    }
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English dictionary
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
