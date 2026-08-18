"use client";

import { Volume2, VolumeX, Siren } from "lucide-react";
import { useAlertSound } from "@/hooks/use-alert-sound";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * AlertSoundToggle
 *
 * Two buttons in the dashboard header:
 *  1. Mute/unmute toggle — clicking to unmute also plays a soft confirmation
 *     beep so you know the audio is working (this is the fix for browsers
 *     that block AudioContext until a direct user gesture).
 *  2. Test alarm button — plays the Critical alarm on demand so you can
 *     verify the sound before the demo without waiting for a real alert.
 */
export function AlertSoundToggle() {
  const { muted, toggleMute, playAlert } = useAlertSound();

  return (
    <div className="flex items-center gap-1">
      {/* Test alarm button — only visible when unmuted */}
      {!muted && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => playAlert("Critical")}
              aria-label="Test alert sound"
              className="size-9 shrink-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Siren className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Test alert sound
          </TooltipContent>
        </Tooltip>
      )}

      {/* Mute / unmute toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={muted ? "Enable alert sounds" : "Mute alert sounds"}
            className={cn(
              "relative size-9 shrink-0 transition-colors",
              !muted && [
                "text-red-600 dark:text-red-400",
                "hover:bg-red-50 dark:hover:bg-red-950/40",
              ],
            )}
          >
            {!muted && (
              <span
                className="absolute inset-0 rounded-md ring-1 ring-red-500/40 animate-pulse"
                aria-hidden="true"
              />
            )}
            {muted ? (
              <VolumeX className="size-4 text-muted-foreground" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {muted ? "Enable alert sounds" : "Mute alert sounds"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
