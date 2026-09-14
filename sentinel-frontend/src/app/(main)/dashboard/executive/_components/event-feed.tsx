"use client";

import { AlertTriangle, CheckCircle, Bell } from "lucide-react";

interface EventSummary {
  eventId: string;
  eventType: string;
  severity: string;
  siteId: string;
  tankId: string;
  tankLevelPct: number;
  createdAt: string;
  actuationTriggered: boolean;
  notificationSent: boolean;
}

interface EventFeedProps {
  events: EventSummary[];
}

export function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Recent Events</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertTriangle className="mb-2 h-8 w-8 opacity-50" />
          <p>No events in the last 24 hours</p>
          <p className="text-sm">Use the Demo button to trigger a test event</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold">Recent Events</h3>
      <div className="space-y-3">
        {events.map((event) => (
          <EventCard key={event.eventId} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  const severityColors: Record<string, string> = {
    Critical: "border-l-red-500 bg-red-50",
    High: "border-l-orange-500 bg-orange-50",
    Medium: "border-l-yellow-500 bg-yellow-50",
    Low: "border-l-gray-400 bg-gray-50",
  };

  const severityBadgeColors: Record<string, string> = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-gray-100 text-gray-700",
  };

  const borderColor = severityColors[event.severity] ?? "border-l-gray-400 bg-gray-50";
  const badgeColor = severityBadgeColors[event.severity] ?? "bg-gray-100 text-gray-700";

  const eventTime = new Date(event.createdAt);
  const timeAgo = getTimeAgo(eventTime);

  return (
    <div className={`rounded-lg border-l-4 p-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
              {event.severity}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <p className="mt-1 font-medium">
            {formatEventType(event.eventType)} at {event.siteId}
          </p>
          <p className="text-sm text-muted-foreground">
            Tank {event.tankId} - {event.tankLevelPct.toFixed(1)}% fill level
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {event.actuationTriggered && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span>Valve Closed</span>
            </div>
          )}
          {event.notificationSent && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Bell className="h-3 w-3" />
              <span>Notified</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Event ID: {event.eventId}
      </div>
    </div>
  );
}

function formatEventType(type: string): string {
  const typeMap: Record<string, string> = {
    overfill_risk: "Overfill Risk Detected",
    pressure_breach: "Pressure Threshold Breach",
    threshold_warning: "Threshold Warning",
    system_alert: "System Alert",
  };
  return typeMap[type] ?? type;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}
