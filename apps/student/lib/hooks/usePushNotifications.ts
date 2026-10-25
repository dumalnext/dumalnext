"use client";

import { useState, useEffect, useCallback } from "react";
import { triggerPortalToast } from "@/components/ui/PortalUI";

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export interface PushNotificationHook {
  isSupported: boolean;
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  isMobile: boolean;
  deviceType: "PC / Laptop" | "Cellphone / Mobile";
  requestPermission: () => Promise<boolean>;
  sendTestNotification: (customTitle?: string, customBody?: string, targetUrl?: string) => Promise<boolean>;
}

export function usePushNotifications(): PushNotificationHook {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if device is a mobile phone (CP) or desktop PC
    const ua = navigator.userAgent.toLowerCase();
    const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    setIsMobile(mobileCheck);

    // Check browser support for Service Worker and Notifications
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (!supported) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as NotificationPermissionState);
    if (Notification.permission === "granted") {
      setIsSubscribed(true);
    }
  }, []);

  // Request native permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      triggerPortalToast("Push notifications are not supported on this browser.", "info");
      return false;
    }

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermissionState);

      if (perm === "granted") {
        setIsSubscribed(true);

        // Send a welcoming system push notification to verify it works on this device
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification("DNHS Push Notifications Active", {
              body: `Official Dumalneg NHS alerts are now enabled on your ${isMobile ? "cellphone" : "PC"}. You will receive instant updates for enrollment status, timetable changes, and school advisories.`,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: "dnhs-welcome-push",
              vibrate: [200, 100, 200, 100, 200],
              data: { url: "/" },
            } as any);
          }
        } catch (pushErr) {
          console.warn("Could not fire welcome notification:", pushErr);
        }

        triggerPortalToast(`Push notifications enabled for this ${isMobile ? "cellphone (CP)" : "PC"}!`, "success");

        // Attempt push manager subscription in background
        try {
          const reg = await navigator.serviceWorker.ready;
          if ("PushManager" in window && reg.pushManager) {
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
              // Try subscribe without VAPID or with basic options
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: undefined,
              }).catch(() => null);
            }
            if (sub) {
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscription: sub,
                  device: isMobile ? "mobile" : "pc",
                  userAgent: navigator.userAgent,
                }),
              }).catch(() => {});
            }
          }
        } catch (subErr) {
          // Gracefully continue even if PushManager network subscription is unconfigured
        }

        return true;
      } else if (perm === "denied") {
        triggerPortalToast("Notification permission was denied. Please allow notifications in site settings.", "info");
        return false;
      }
      return false;
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  // Send immediate test alert to this device (PC or CP)
  const sendTestNotification = useCallback(
    async (
      customTitle = "Dumalneg NHS Portal Alert",
      customBody = "Official Test Notification: Real-time system alert received successfully on this device.",
      targetUrl = "/"
    ): Promise<boolean> => {
      if (typeof window === "undefined") return false;

      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        triggerPortalToast("Notifications are not supported on this browser.", "info");
        return false;
      }

      // If not yet granted, request first
      if (Notification.permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) return false;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(customTitle, {
            body: customBody,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: `dnhs-test-${Date.now()}`,
            vibrate: [200, 100, 200, 100, 200],
            data: { url: targetUrl },
            actions: [
              { action: "open", title: "Open Portal" },
              { action: "dismiss", title: "Dismiss" },
            ],
          } as any);

          triggerPortalToast(`Test notification dispatched to your ${isMobile ? "cellphone (CP)" : "PC"}!`, "success");
          return true;
        } else {
          // Fallback to standard Notification API
          new Notification(customTitle, {
            body: customBody,
            icon: "/icon-192.png",
          });
          triggerPortalToast("Test notification sent!", "success");
          return true;
        }
      } catch (err) {
        console.error("Error sending test notification:", err);
        triggerPortalToast("Unable to display system notification. Check device notification settings.", "info");
        return false;
      }
    },
    [isMobile, requestPermission]
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isMobile,
    deviceType: isMobile ? "Cellphone / Mobile" : "PC / Laptop",
    requestPermission,
    sendTestNotification,
  };
}
