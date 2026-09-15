"use client";

import { Brain, TrendingUp, Zap } from "lucide-react";

interface ThangeSummaryProps {
  detections?: number;
  interventions?: number;
  successRate?: number;
}

export function ThangeSummary({ detections = 0, interventions = 0, successRate = 100 }: ThangeSummaryProps) {
  return (
    <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-purple-100 p-3">
          <Brain className="h-6 w-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-purple-900">Thange Judgment Engine</h3>
          <p className="mt-1 text-sm text-purple-700">
            ML-driven overfill detection connected to automated valve control
          </p>
          
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-purple-900">{detections}</p>
                <p className="text-xs text-purple-600">ML Detections</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-purple-900">{interventions}</p>
                <p className="text-xs text-purple-600">Auto Interventions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-500" />
              <div>
                <p className="text-2xl font-bold text-purple-900">{successRate.toFixed(1)}%</p>
                <p className="text-xs text-purple-600">Success Rate</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-purple-600">
            The Thange engine analyzes tank telemetry in real-time, detecting overfill conditions 
            (95%+ fill with valve open) and triggering automated valve closures to prevent spills.
          </p>
        </div>
      </div>
    </div>
  );
}
