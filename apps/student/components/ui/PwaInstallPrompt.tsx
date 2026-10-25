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

// Global cached prompt to prevent race condition before React mounts
let cachedPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  if ((window as any).__dnhsDeferredPrompt) {
    cachedPrompt = (window as any).__dnhsDeferredPrompt;
  }
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    (window as any).__dnhsDeferredPrompt = e;
  });
  window.addEventListener("dnhs-prompt-ready", () => {
    if ((window as any).__dnhsDeferredPrompt) {
      cachedPrompt = (window as any).__dnhsDeferredPrompt;
    }
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== "undefined") {
      return (window as any).__dnhsDeferredPrompt || cachedPrompt || null;
    }
    return null;
  });
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

    if ((window as any).__dnhsDeferredPrompt) {
      setDeferredPrompt((window as any).__dnhsDeferredPrompt);
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__dnhsDeferredPrompt = e;
      cachedPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptReady = () => {
      if ((window as any).__dnhsDeferredPrompt) {
        setDeferredPrompt((window as any).__dnhsDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as any).__dnhsDeferredPrompt = null;
      cachedPrompt = null;
      triggerPortalToast("DNHS Portal successfully installed on your device!", "success");
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("dnhs-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("dnhs-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<"accepted" | "dismissed" | "show_modal" | "already_installed"> => {
    if (isStandalone) {
      triggerPortalToast("DNHS Portal is already installed on your device.", "info");
      return "already_installed";
    }

    // Check active prompt from React state, window global, or module cache
    let promptEvent =
      deferredPrompt ||
      (typeof window !== "undefined" ? (window as any).__dnhsDeferredPrompt || cachedPrompt : null);

    // If prompt is not ready yet on Android / Desktop, wait briefly (up to 400ms) in case beforeinstallprompt is in-flight
    if (!promptEvent && !isIos && typeof window !== "undefined") {
      await new Promise<void>((resolve) => {
        let done = false;
        const cleanup = () => {
          if (!done) {
            done = true;
            window.removeEventListener("dnhs-prompt-ready", onReady);
            window.removeEventListener("beforeinstallprompt", onReady);
            resolve();
          }
        };
        const onReady = () => cleanup();
        window.addEventListener("dnhs-prompt-ready", onReady, { once: true });
        window.addEventListener("beforeinstallprompt", onReady, { once: true });
        setTimeout(cleanup, 400);
      });
      promptEvent =
        deferredPrompt ||
        (typeof window !== "undefined" ? (window as any).__dnhsDeferredPrompt || cachedPrompt : null);
    }

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") {
          setDeferredPrompt(null);
          if (typeof window !== "undefined") (window as any).__dnhsDeferredPrompt = null;
          cachedPrompt = null;
          return "accepted";
        }
        return "dismissed";
      } catch (err) {
        console.warn("Native PWA prompt error:", err);
        return "show_modal";
      }
    }

    // iOS Safari or browsers where prompt event hasn't fired
    return "show_modal";
  };

  return {
    isStandalone,
    isIos,
    hasNativePrompt: !!(
      deferredPrompt ||
      (typeof window !== "undefined" && ((window as any).__dnhsDeferredPrompt || cachedPrompt))
    ),
    triggerInstall,
  };
}

/**
 * Visual Step-by-Step Installation Modal Guide (Zero Emojis - DepEd Standard)
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
          <div className="flex items-center gap-3">
            <img
              src="/dumalneg-logo.png"
              alt="DNHS Logo"
              className="w-10 h-10 rounded-full object-contain border-2 border-amber-400 shadow-xs shrink-0"
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
        </div>

        {/* Modal Body: Clean Institutional Instructions */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-800">
          <p className="text-slate-600 leading-relaxed">
            Install the official <strong>Dumalneg National High School Portal</strong> directly on your home screen. Enjoy fast 1-tap launch, standalone screen view, and offline-ready access.
          </p>

          {isIos ? (
            /* iOS Safari Instructions */
            <div className="space-y-3 bg-blue-50/70 border border-blue-200 rounded-lg p-4">
              <div className="text-xs font-bold text-[#002060] uppercase tracking-wider">
                iPhone / iPad (Safari) Instructions:
              </div>
              <ol className="space-y-2.5 text-[11px] text-slate-700 pl-1 list-none">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button in Safari&apos;s bottom toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <span>
                    Scroll down the options list and tap{" "}
                    <strong className="text-slate-950">
                      &quot;Add to Home Screen&quot;
                    </strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <span>
                    Tap <strong className="text-emerald-700">&quot;Add&quot;</strong> in the top-right corner. The DNHS icon will appear on your Home Screen.
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            /* Android / Desktop Instructions */
            <div className="space-y-3 bg-amber-50/70 border border-amber-200 rounded-lg p-4">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Android / Chrome / Edge Instructions:
              </div>
              <ol className="space-y-2.5 text-[11px] text-slate-700 pl-1 list-none">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Browser Menu (three dots)</strong> at the top or bottom of your browser screen.
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
              <span className="text-emerald-600 font-bold">•</span>
              <span>No App Store download required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Fast 1-tap home screen launch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Instant DepEd enrollment access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Push alerts for PC &amp; cellphone</span>
            </div>
          </div>

          {/* Device Push Feature Banner */}
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-[4px] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-800 font-bold text-[11px]">Real-Time Push Notifications</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#002060] bg-white px-2 py-0.5 border border-blue-300 rounded-[3px]">
              PC &amp; Mobile
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#002060] hover:bg-blue-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * LOCATION A: 1-Click "Install App" Header / Navigation Button
 * Strictly displayed on PC / Laptop (Desktop `lg:` screens and above)
 * Strictly hidden on Android and iOS mobile phones
 * ZERO EMOJIS - Clean DepEd theme
 */
export function PwaInstallHeaderButton() {
  const { isStandalone, isIos, triggerInstall } = usePwaInstall();
  const [showModal, setShowModal] = useState(false);

  // If already opened inside standalone installed PWA on PC/laptop
  if (isStandalone) {
    return (
      <span
        className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-950/70 border border-blue-400/30 text-blue-200 text-[10px] font-bold uppercase rounded-[4px]"
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
        className="hidden lg:inline-flex items-center px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-[4px] shadow-xs transition-all cursor-pointer shrink-0"
        title="Install Dumalneg NHS Student Portal on your PC or Laptop"
      >
        <span>Install App</span>
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
 * LOCATION B: Drawer Menu Card Component
 * Embedded strictly inside Mobile Navigation Drawer for Android & iOS phones
 * ZERO EMOJIS - Clean DepEd theme
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
          <div>
            <span className="text-[9px] font-black text-amber-900 uppercase tracking-widest block">
              INSTALL PROGRESSIVE APP
            </span>
            <h4 className="text-xs font-extrabold text-slate-950 leading-tight mt-0.5">
              Add to Home Screen
            </h4>
          </div>
          <span className="px-1.5 py-0.5 bg-amber-200 text-amber-950 font-mono text-[9px] font-bold rounded-[3px] uppercase">
            1-TAP
          </span>
        </div>
        <p className="text-[11px] text-slate-700 leading-snug">
          Install the portal on your phone for instant 1-tap access without typing the URL.
        </p>
        <button
          type="button"
          onClick={handleClick}
          className="w-full py-2 bg-[#002060] hover:bg-blue-900 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-[4px] transition-colors cursor-pointer text-center shadow-xs"
        >
          Install DNHS Portal App
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
