"use client";

import React, { useState } from "react";
import Link from "next/link";

interface AccountCreationTutorialProps {
  onSwitchToRegister?: () => void;
}

/**
 * Account Creation Video Tutorial Component
 * Displayed on the unauthenticated login / registration view.
 * Embedded directly from YouTube with 0 MB storage consumption.
 */
export function AccountCreationTutorial({ onSwitchToRegister }: AccountCreationTutorialProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = "BrsmQqatC5w";
  const youtubeUrl = `https://youtu.be/${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`;

  return (
    <section className="bg-white border border-slate-200/90 shadow-sm rounded-[4px] overflow-hidden">
      {/* Compact Interactive Banner Header */}
      <div className="bg-gradient-to-r from-[#002060] to-[#0d3882] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-950">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-[4px] bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
              First-Time Applicant Video Walkthrough
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
              Need Help Creating Your Student Account? (Step-by-Step Guide)
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!isExpanded) {
                setIsExpanded(true);
                setIsPlaying(true);
              } else {
                setIsExpanded(false);
                setIsPlaying(false);
              }
            }}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors rounded-[4px] cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              {isExpanded ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              )}
            </svg>
            {isExpanded ? "Hide Video Guide" : "Watch Video Guide"}
          </button>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Watch full walkthrough video on YouTube"
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold transition-colors rounded-[4px] inline-flex items-center gap-1.5 shadow-xs"
          >
            {/* YouTube Red Icon Badge */}
            <span className="w-4 h-3 bg-red-600 rounded-[2px] flex items-center justify-center shrink-0">
              <svg className="w-2 h-2 text-white fill-current ml-0.5" viewBox="0 0 10 10">
                <polygon points="1,1 9,5 1,9" />
              </svg>
            </span>
            <span>YouTube</span>
            <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7V16" />
            </svg>
          </a>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Watch the official Dumalneg National High School video walkthrough to learn the step-by-step process of creating a student portal account and verifying your 6-digit security code via Gmail before enrolling.
        </p>

        {/* Expandable 16:9 Video Container */}
        {isExpanded && (
          <div className="relative w-full aspect-video rounded-[4px] overflow-hidden bg-slate-900 border-2 border-slate-300 shadow-xs">
            {!isPlaying ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
                <div className="mb-3 px-3 py-1 bg-[#002060] border border-blue-400 text-[11px] font-bold uppercase tracking-wider rounded-[3px]">
                  Official Video Tutorial
                </div>
                <h4 className="text-sm sm:text-base font-bold max-w-md mb-2">
                  How to Create a Student Account
                </h4>
                <p className="text-[11px] text-slate-300 max-w-sm mb-4">
                  Click the Play button to start watching the video tutorial directly on this page.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors shadow-xs rounded-[4px] cursor-pointer"
                  >
                    Play Tutorial Video
                  </button>
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-colors rounded-[4px]"
                  >
                    <span className="w-4 h-3 bg-red-600 rounded-[2px] flex items-center justify-center shrink-0">
                      <svg className="w-2 h-2 text-white fill-current ml-0.5" viewBox="0 0 10 10">
                        <polygon points="1,1 9,5 1,9" />
                      </svg>
                    </span>
                    <span>Watch on YouTube</span>
                    <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7V16" />
                    </svg>
                  </a>
                </div>
              </div>
            ) : (
              <iframe
                src={embedUrl}
                title="How to Create an Account on Dumalneg NHS Student Portal"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            )}
          </div>
        )}

        {/* Quick 4 Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px] text-xs flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#002060] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <strong className="text-slate-900 block font-bold mb-0.5">Select &ldquo;Create Account&rdquo;</strong>
              <span className="text-slate-600 text-[11px] leading-snug block">Open the Create Account tab on the student portal login card.</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px] text-xs flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#002060] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <strong className="text-slate-900 block font-bold mb-0.5">Enter Full Legal Name</strong>
              <span className="text-slate-600 text-[11px] leading-snug block">Enter your legal name as indicated on your PSA Birth Certificate.</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px] text-xs flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#002060] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <strong className="text-slate-900 block font-bold mb-0.5">Provide Active Gmail</strong>
              <span className="text-slate-600 text-[11px] leading-snug block">Use your active personal Gmail address and a secure password.</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-[4px] text-xs flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#002060] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <div>
              <strong className="text-slate-900 block font-bold mb-0.5">Verify 6-Digit Code</strong>
              <span className="text-slate-600 text-[11px] leading-snug block">Enter the 6-digit security code sent to your Gmail to activate your account.</span>
            </div>
          </div>
        </div>

        {onSwitchToRegister && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <p className="text-[11px] text-slate-500">
              Don&apos;t have a student account yet? Start creating your applicant account now.
            </p>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="px-4 py-2 bg-[#002060] hover:bg-[#001540] text-white text-xs font-bold transition-colors rounded-[4px] shrink-0 cursor-pointer"
            >
              Create Student Account &rarr;
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface GradeLevelEnrollmentTutorialsProps {
  initialGrade?: string | number;
  schoolYear?: string;
  semester?: string;
  isEnrollmentOpen?: boolean;
}

interface TutorialItem {
  id: "grade7" | "grade8to10" | "grade11" | "grade12";
  tabLabel: string;
  badgeLabel: string;
  title: string;
  description: string;
  videoId: string;
  youtubeUrl: string;
  targetAudience: string;
  keyPoints: string[];
}

const ENROLLMENT_TUTORIALS: TutorialItem[] = [
  {
    id: "grade7",
    tabLabel: "Grade 7",
    badgeLabel: "Incoming JHS",
    title: "INCOMING GRADE 7 | DUMALNEXT SYSTEM",
    description: "Official enrollment guide for students entering Grade 7 Junior High School. This covers selecting between the Regular JHS Curriculum and the Special Program in Sports (SPS), verifying feeder elementary school information, and uploading documentary requirements (PSA Birth Certificate and Form 138 / SF9).",
    videoId: "sst31YJmb_4",
    youtubeUrl: "https://youtu.be/sst31YJmb_4",
    targetAudience: "For Grade 6 graduates from Dumalneg Elementary School and other feeder elementary schools.",
    keyPoints: [
      "Prepare your 12-digit Learner Reference Number (LRN) from your elementary SF9.",
      "Select between the JHS Regular Curriculum and Special Program in Sports (SPS).",
      "Ensure clear, legible photo or scan copies of your PSA Birth Certificate and Form 138.",
    ],
  },
  {
    id: "grade8to10",
    tabLabel: "Grade 8, 9, or 10",
    badgeLabel: "Continuing JHS",
    title: "INCOMING GRADE 8,9,10 | DUMALNEXT SYSTEM",
    description: "Enrollment guide for continuing Junior High School learners of Dumalneg NHS (Grade 8, Grade 9, and Grade 10). With a prescribed core curriculum in JHS, enrollment is fast and seamless using 1-Click Continuing Enrollment.",
    videoId: "VlM7VKMVcX8",
    youtubeUrl: "https://youtu.be/VlM7VKMVcX8",
    targetAudience: "For current Dumalneg NHS Junior High School learners.",
    keyPoints: [
      "JHS follows a prescribed core curriculum, so no elective subjects are required.",
      "The system automatically retrieves and syncs your previously approved academic records.",
      "Verify your contact details and submit to receive prompt section and schedule assignments.",
    ],
  },
  {
    id: "grade11",
    tabLabel: "Grade 11",
    badgeLabel: "Incoming SHS",
    title: "INCOMING GRADE 11 | DUMALNEXT SYSTEM",
    description: "Comprehensive tutorial for students entering Senior High School (Grade 11). Learn how to select your Senior High School track, Academic or Technical-Professional (Tech-Pro) strand, and trimester elective subjects.",
    videoId: "Xm9mn7eg1Rc",
    youtubeUrl: "https://youtu.be/Xm9mn7eg1Rc",
    targetAudience: "For Grade 10 Completers enrolling in Senior High School at Dumalneg NHS.",
    keyPoints: [
      "Select a Track and Strand aligned with your career and higher education pathways.",
      "Choose your Trimester Elective Subject from authorized course offerings for this term.",
      "Upload your certified SF9 / Form 138 indicating your Grade 10 General Average.",
    ],
  },
  {
    id: "grade12",
    tabLabel: "Grade 12",
    badgeLabel: "Continuing SHS",
    title: "INCOMING GRADE 12 | DUMALNEXT SYSTEM",
    description: "Guide for Grade 12 Senior High School learners on completing enrollment for the active academic trimester, choosing advanced specialized electives, and reviewing graduation credential requirements.",
    videoId: "l-eODho9Z1U",
    youtubeUrl: "https://youtu.be/l-eODho9Z1U",
    targetAudience: "For current Grade 11 learners progressing to Grade 12 Senior High School.",
    keyPoints: [
      "Review your past trimester grades and accumulated course units.",
      "Select authorized electives for the active trimester according to your strand.",
      "Ensure all required documentary records are complete for DepEd graduation clearance.",
    ],
  },
];

/**
 * Grade-Level Enrollment Tutorials Component
 * Displayed on the authenticated student dashboard.
 * Features 4 grade-level tabs (Grade 7, Grade 8-10, Grade 11, Grade 12).
 * Streams directly from YouTube with 0 MB database/storage consumption.
 */
export function GradeLevelEnrollmentTutorials({
  initialGrade,
  schoolYear = "2026-2027",
  semester = "Trimester 1",
  isEnrollmentOpen = true,
}: GradeLevelEnrollmentTutorialsProps) {
  // Resolve default tab based on user grade level if available
  const resolveDefaultTab = (): "grade7" | "grade8to10" | "grade11" | "grade12" => {
    if (!initialGrade) return "grade7";
    const g = Number(initialGrade);
    if (g === 7) return "grade7";
    if (g >= 8 && g <= 10) return "grade8to10";
    if (g === 11) return "grade11";
    if (g === 12) return "grade12";
    return "grade7";
  };

  const [activeTab, setActiveTab] = useState<"grade7" | "grade8to10" | "grade11" | "grade12">(resolveDefaultTab());
  const [isPlaying, setIsPlaying] = useState(false);

  const currentTutorial = ENROLLMENT_TUTORIALS.find((t) => t.id === activeTab) || ENROLLMENT_TUTORIALS[0];
  const embedUrl = `https://www.youtube-nocookie.com/embed/${currentTutorial.videoId}?rel=0&autoplay=1`;

  const handleTabChange = (tabId: "grade7" | "grade8to10" | "grade11" | "grade12") => {
    setActiveTab(tabId);
    setIsPlaying(false);
  };

  return (
    <section className="bg-white border-2 border-[#002060] border-t-4 border-t-amber-400 shadow-sm rounded-[4px] overflow-hidden my-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-950">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
            Student Guidance &amp; Video Walkthroughs
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
            Online Enrollment Tutorials by Grade Level
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/40 rounded-[4px]">
            Official Video Guides
          </span>
        </div>
      </div>

      {/* Grade Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b-2 border-slate-200 text-center font-bold text-xs bg-slate-50">
        {ENROLLMENT_TUTORIALS.map((tutorial) => {
          const isActive = activeTab === tutorial.id;
          return (
            <button
              key={tutorial.id}
              type="button"
              onClick={() => handleTabChange(tutorial.id)}
              className={`p-3 sm:py-3.5 sm:px-4 text-left sm:text-center transition-colors border-r last:border-r-0 border-slate-200 cursor-pointer ${
                isActive
                  ? "bg-white text-[#002060] border-b-2 border-b-[#002060] shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                {tutorial.badgeLabel}
              </span>
              <span className={`text-xs font-bold block ${isActive ? "text-[#002060]" : "text-slate-800"}`}>
                {tutorial.tabLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Active Tutorial Title and Description */}
        <div className="border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h4 className="text-xs sm:text-sm font-bold text-[#002060]">
              {currentTutorial.title}
            </h4>
            <a
              href={currentTutorial.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 transition-colors rounded-[4px]"
            >
              <span>Open in YouTube</span>
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {currentTutorial.description}
          </p>
          <p className="text-[11px] text-[#002060] font-semibold mt-1">
            Target Audience: {currentTutorial.targetAudience}
          </p>
        </div>

        {/* Responsive 16:9 Video Player */}
        <div className="relative w-full aspect-video rounded-[4px] overflow-hidden bg-slate-900 border-2 border-slate-300 shadow-xs">
          {!isPlaying ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
              <div className="mb-3 px-3 py-1 bg-[#002060] border border-blue-400 text-[11px] font-bold uppercase tracking-wider rounded-[3px]">
                {currentTutorial.tabLabel} Enrollment Guide
              </div>
              <h4 className="text-sm sm:text-base font-bold max-w-md mb-2">
                {currentTutorial.title}
              </h4>
              <p className="text-[11px] text-slate-300 max-w-sm mb-4">
                Click the Play button to watch the official walkthrough for {currentTutorial.tabLabel}.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors shadow-xs rounded-[4px] cursor-pointer"
                >
                  Play Tutorial Video
                </button>
                <a
                  href={currentTutorial.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-colors rounded-[4px]"
                >
                  <span>Open in YouTube</span>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
                  </svg>
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={embedUrl}
              title={currentTutorial.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>

        {/* Key Reminders & Checklist */}
        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-[4px] space-y-2">
          <strong className="text-xs font-bold text-[#002060] block tracking-wide">
            Important Reminders for {currentTutorial.tabLabel}:
          </strong>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {currentTutorial.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-bold text-[#002060] shrink-0">&bull;</span>
                <span className="text-[11px] leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Shortcut to Start Form */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
          <p className="text-[11px] text-slate-500 italic">
            Finished watching the video? You can now start or continue filling out your enrollment form.
          </p>
          <Link
            href="/enroll"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#002060] hover:bg-[#001540] text-white text-xs font-bold transition-colors shadow-xs rounded-[4px] shrink-0"
          >
            {isEnrollmentOpen ? (
              <>
                <span>Open Enrollment Form ({semester})</span>
                <span aria-hidden="true">&rarr;</span>
              </>
            ) : (
              <span>View Enrollment Form</span>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}
