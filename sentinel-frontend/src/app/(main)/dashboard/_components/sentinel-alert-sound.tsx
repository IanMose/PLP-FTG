"use client";

import { useEffect } from "react";
import { useAlertSound } from "@/hooks/use-alert-sound";
import { useSentinelAlerts } from "@/hooks/use-sentinel-alerts";

/**
 * SentinelAlertSound
 *
 * Invisible mount-point that wires the two hooks together:
 *   useSentinelAlerts  — polls for new Critical/High alerts
 *   useAlertSound      — synthesises and plays the tone
 *
 * When a new alert arrives, it plays the appropriate tone once, then clears
 * the newAlerts list so the same alert doesn't fire again on the next render.
 *
 * Renders nothing visible — the mute toggle lives in AlertSoundToggle
 * which reads mute state from localStorage independently.
 *
 * Mount this once in the dashboard layout so it runs across all pages.
 */
export function SentinelAlertSound() {
  const { newAlerts, clearNew } = useSentinelAlerts();
  const { playAlert } = useAlertSound();

  useEffect(() => {
    if (newAlerts.length === 0) return;

    // Play for the highest severity in the batch
    // (if there's a Critical and a High at the same time, play Critical)
    const hasCritical = newAlerts.some((a) => a.severity === "Critical");
    playAlert(hasCritical ? "Critical" : "High");

    clearNew();
  }, [newAlerts, playAlert, clearNew]);

  return null;
}
