"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

interface DemoStep {
  stepNumber: number;
  action: string;
  detail: string;
  elapsedMs: number;
}

interface DemoResult {
  success: boolean;
  message: string;
  eventId: string | null;
  actuationId: string | null;
  steps: DemoStep[];
  totalTimeMs: number;
}

interface DemoTriggerButtonProps {
  onDemoComplete?: () => void;
}

export function DemoTriggerButton({ onDemoComplete }: DemoTriggerButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerDemo = async (critical: boolean = false) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = critical 
        ? `${API_BASE}/api/demo/trigger-critical`
        : `${API_BASE}/api/demo/trigger-overfill`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: DemoResult = await res.json();
      setResult(data);
      
      if (onDemoComplete) {
        onDemoComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo failed");
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setResult(null);
    setError(null);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 font-medium text-white shadow-lg transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-xl"
      >
        <Play className="h-4 w-4" />
        Trigger Demo
      </button>

      {/* Dialog Overlay */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            {/* Dialog Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Live Demo: Overfill Detection</h2>
                <p className="text-sm text-muted-foreground">
                  Trigger a simulated overfill scenario to demonstrate the control loop
                </p>
              </div>
              <button
                onClick={closeDialog}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            {!loading && !result && !error && (
              <div className="space-y-4">
                <div className="rounded-lg bg-amber-50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">What will happen:</p>
                      <ol className="mt-2 list-inside list-decimal space-y-1 text-amber-700">
                        <li>Tank telemetry reading inserted (96%+ fill, valve open)</li>
                        <li>ML model detects overfill risk condition</li>
                        <li>Event created and logged</li>
                        <li>Simulated valve close command executed</li>
                        <li>Slack notification sent</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => triggerDemo(false)}
                    className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Standard Demo (96.5%)
                  </button>
                  <button
                    onClick={() => triggerDemo(true)}
                    className="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Critical Demo (98.7%)
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <p className="mt-4 font-medium">Running demo sequence...</p>
                <p className="text-sm text-muted-foreground">Watch the magic happen</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="space-y-4">
                <div className="rounded-lg bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Demo Failed</span>
                  </div>
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="w-full rounded-lg bg-gray-200 py-2 font-medium transition-colors hover:bg-gray-300"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Result State */}
            {result && (
              <div className="space-y-4">
                {/* Success/Failure Banner */}
                <div
                  className={`rounded-lg p-4 ${
                    result.success ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`font-medium ${
                        result.success ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {result.success ? "Demo Completed Successfully!" : "Demo Failed"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
                </div>

                {/* Step-by-Step Feed */}
                <div className="space-y-2">
                  <h3 className="font-medium">Execution Timeline</h3>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {result.steps.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="flex items-start gap-3 rounded-lg border bg-gray-50 p-3"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.action}</p>
                          <p className="text-sm text-muted-foreground">{step.detail}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          +{step.elapsedMs}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* IDs */}
                {(result.eventId || result.actuationId) && (
                  <div className="rounded-lg bg-gray-100 p-3 text-xs">
                    {result.eventId && (
                      <p>
                        <span className="font-medium">Event ID:</span> {result.eventId}
                      </p>
                    )}
                    {result.actuationId && (
                      <p>
                        <span className="font-medium">Actuation ID:</span> {result.actuationId}
                      </p>
                    )}
                    <p className="mt-1">
                      <span className="font-medium">Total Time:</span> {result.totalTimeMs}ms
                    </p>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={closeDialog}
                  className="w-full rounded-lg bg-gray-800 py-3 font-medium text-white transition-colors hover:bg-gray-900"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
