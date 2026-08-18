"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sentinel_alert_sound_muted";

// ── Module-level singleton ────────────────────────────────────────────────
// One AudioContext per page lifetime. Created on first user gesture.
// Module scope means it survives React re-renders and hook remounts.
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (_ctx.state === "suspended") {
    _ctx.resume();
  }
  return _ctx;
}

function playTone(severity: string) {
  const ctx = getCtx();
  if (!ctx) return;

  const notes =
    severity === "Critical"
      ? [
          { freq: 1046, start: 0.00, dur: 0.12, vol: 0.6 },
          { freq: 784,  start: 0.15, dur: 0.12, vol: 0.6 },
          { freq: 1046, start: 0.30, dur: 0.12, vol: 0.6 },
          { freq: 1174, start: 0.45, dur: 0.35, vol: 0.5 },
        ]
      : [
          { freq: 659, start: 0.00, dur: 0.18, vol: 0.5 },
          { freq: 523, start: 0.22, dur: 0.28, vol: 0.45 },
        ];

  const now = ctx.currentTime;
  for (const n of notes) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(n.freq, now + n.start);
    gain.gain.setValueAtTime(0,     now + n.start);
    gain.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.02);
    gain.gain.setValueAtTime(n.vol, now + n.start + n.dur - 0.03);
    gain.gain.linearRampToValueAtTime(0,     now + n.start + n.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.01);
  }
}

function playConfirmBeep() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0,    ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0,   ctx.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// ── Exported hook ─────────────────────────────────────────────────────────

interface UseAlertSoundResult {
  muted: boolean;
  toggleMute: () => void;
  playAlert: (severity: string) => void;
}

export function useAlertSound(): UseAlertSoundResult {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  // Keep all hook instances in sync — when the toggle in the header writes
  // to localStorage, the SentinelAlertSound component's instance hears it
  // via the storage event and updates its own muted state.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setMuted(e.newValue === "true");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      // Defer the cross-instance notification until after the current render
      // cycle. dispatchEvent is synchronous — firing it inside setMuted would
      // trigger setMuted in SentinelAlertSound mid-render, which React rejects.
      setTimeout(() => {
        window.dispatchEvent(new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: String(next),
          storageArea: localStorage,
        }));
      }, 0);
      if (!next) {
        // Unmuting — play confirm beep in this same gesture to unlock AudioContext
        playConfirmBeep();
      }
      return next;
    });
  }, []);

  const playAlert = useCallback(
    (severity: string) => {
      if (muted) return;
      playTone(severity);
    },
    [muted],
  );

  return { muted, toggleMute, playAlert };
}
