"use client";

import React, { useState, useEffect } from "react";
import { triggerPortalToast } from "@/components/ui/PortalUI";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if running inside installed standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check if device is iOS (iPhone, iPad, iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      triggerPortalToast("DNHS Portal successfully installed on your device!", "success");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<"accepted" | "dismissed" | "show_modal" | "already_installed"> => {
    if (isStandalone) {
      triggerPortalToast("DNHS Portal is already installed on your device.", "info");
      return "already_installed";
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
          return "accepted";
        }
        return "dismissed";
      } catch {
        return "show_modal";
      }
    }

    // iOS or browsers without programmatic install prompt
    return "show_modal";
  };

  return {
    isStandalone,
    isIos,
    hasNativePrompt: !!deferredPrompt,
    triggerInstall,
  };
}

/**
 * Visual Step-by-Step Installation Modal Guide
 * Tailored for iOS Safari, Android Chrome, and Desktop Chrome/Edge
 */
export function PwaInstallModal({
  isOpen,
  onClose,
  isIos,
}: {
  isOpen: boolean;
  onClose: () => void;
  isIos: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border-2 border-[#002060] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002060] via-[#002b80] to-[#0a1936] text-white p-5 border-b-4 border-amber-400">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/dumalneg-logo.png"
                alt="DNHS Logo"
                className="w-10 h-10 rounded-full bg-white object-contain border-2 border-amber-400 shadow-xs shrink-0"
              />
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
                  Progressive Web App
                </span>
                <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
                  Install DNHS Student Portal
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-sm font-bold"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: Dynamic Instructions based on Platform */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-800">
          <p className="text-slate-600 leading-relaxed">
            Install the official <strong>Dumalneg National High School Portal</strong> directly on your phone or computer. Enjoy fast 1-tap launch, standalone screen view, and offline-ready access.
          </p>

          {isIos ? (
            /* iOS Safari Instructions */
            <div className="space-y-3 bg-blue-50/70 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#002060] uppercase">
                <span>📱 iPhone / iPad (Safari) Instructions:</span>
              </div>
              <ol className="space-y-2.5 text-[11px] text-slate-700 pl-1 list-none">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button{" "}
                    <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-900 font-bold">
                      ⎋
                    </span>{" "}
                    or{" "}
                    <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-900 font-bold">
                      📤
                    </span>{" "}
                    at the bottom of your Safari browser.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <span>
                    Scroll down the options list and select{" "}
                    <strong className="text-slate-950">
                      &quot;Add to Home Screen&quot;
                    </strong>{" "}
                    <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-900 font-bold">
                      ➕
                    </span>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <span>
                    Tap <strong className="text-emerald-700">&quot;Add&quot;</strong> in the top-right corner. The DNHS icon will appear on your Home Screen!
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            /* Android / Desktop Instructions */
            <div className="space-y-3 bg-amber-50/70 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase">
                <span>⚡ Android / Chrome / Edge Instructions:</span>
              </div>
              <ol className="space-y-2.5 text-[11px] text-slate-700 pl-1 list-none">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Browser Menu (3 Dots)</strong>{" "}
                    <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-900 font-bold">
                      ⋮
                    </span>{" "}
                    at the top or bottom of your browser screen.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <span>
                    Select{" "}
                    <strong className="text-slate-950">
                      &quot;Install app&quot;
                    </strong>{" "}
                    or{" "}
                    <strong className="text-slate-950">
                      &quot;Add to Home screen&quot;
                    </strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <span>
                    Tap <strong className="text-emerald-700">&quot;Install&quot;</strong> to place the DNHS app on your phone or desktop.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* Quick Perks */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>No App Store download required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Fast 1-tap home screen launch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Instant DepEd enrollment access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Zero device storage overhead</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#002060] hover:bg-blue-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Got It, Thanks!
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 1-Click "Install App" Header / Navigation Button
 */
export function PwaInstallHeaderButton() {
  const { isStandalone, isIos, triggerInstall } = usePwaInstall();
  const [showModal, setShowModal] = useState(false);

  // If already opened inside standalone installed PWA, hide or show checkmark
  if (isStandalone) {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-blue-950/70 border border-blue-400/30 text-blue-200 text-[10px] font-bold uppercase rounded-[4px]"
        title="Dumalneg NHS Portal is running in standalone app mode"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        App Active
      </span>
    );
  }

  const handleClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === "show_modal") {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-[4px] shadow-xs transition-all cursor-pointer shrink-0"
        title="Add Dumalneg NHS Student Portal to your Phone Home Screen or Desktop"
      >
        <span className="text-xs">📲</span>
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>

      <PwaInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isIos={isIos}
      />
    </>
  );
}

/**
 * Drawer Menu Card Component (Embedded inside Mobile Drawer)
 */
export function PwaInstallDrawerCard() {
  const { isStandalone, isIos, triggerInstall } = usePwaInstall();
  const [showModal, setShowModal] = useState(false);

  if (isStandalone) return null;

  const handleClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === "show_modal") {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-[4px] shadow-xs space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📲</span>
            <div>
              <span className="text-[9px] font-black text-amber-900 uppercase tracking-widest block">
                INSTALL PROGRESSIVE APP
              </span>
              <h4 className="text-xs font-extrabold text-slate-950 leading-tight">
                Add to Home Screen
              </h4>
            </div>
          </div>
          <span className="px-1.5 py-0.5 bg-amber-200 text-amber-950 font-mono text-[9px] font-bold rounded-[3px] uppercase">
            1-TAP
          </span>
        </div>
        <p className="text-[11px] text-slate-700 leading-snug">
          Install the portal on your phone or computer for instant access without opening a browser or typing the URL.
        </p>
        <button
          type="button"
          onClick={handleClick}
          className="w-full py-2 bg-[#002060] hover:bg-blue-900 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-[4px] transition-colors cursor-pointer text-center shadow-xs"
        >
          Install DNHS Portal App &rarr;
        </button>
      </div>

      <PwaInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isIos={isIos}
      />
    </>
  );
}

/**
 * Smart Floating Install Banner for Mobile Visitors
 */
export function PwaFloatingBanner() {
  const { isStandalone, isIos, triggerInstall } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Only show if not standalone and not recently dismissed in session
    if (isStandalone) return;
    const dismissed = sessionStorage.getItem("dnhs_pwa_dismissed");
    if (!dismissed) {
      // Delay display slightly to not startle user upon initial render
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isStandalone]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("dnhs_pwa_dismissed", "true");
  };

  const handleClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === "show_modal") {
      setShowModal(true);
    }
  };

  if (isStandalone || isDismissed) return null;

  return (
    <>
      <aside
        aria-label="App Installation Prompt"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[#002060] text-white p-4 rounded-xl border-2 border-amber-400 shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/dumalneg-logo.png"
              alt="DNHS Seal"
              className="w-10 h-10 rounded-full bg-white object-contain border border-amber-300 shadow-xs shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
                Official Student App
              </span>
              <h4 className="text-xs font-bold text-white truncate">
                Install DNHS Portal
              </h4>
              <p className="text-[10px] text-blue-100 truncate">
                Add to your phone home screen for 1-tap access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-blue-300 hover:text-white text-xs p-1 cursor-pointer font-bold shrink-0"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleClick}
            className="flex-1 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-[4px] shadow-xs transition-colors cursor-pointer text-center"
          >
            Add to Home Screen
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-blue-200 text-xs font-bold rounded-[4px] transition-colors cursor-pointer"
          >
            Later
          </button>
        </div>
      </aside>

      <PwaInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isIos={isIos}
      />
    </>
  );
}
