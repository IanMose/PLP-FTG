"use client";

import { AlertTriangle, Shield, Droplet, DollarSign } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: "alert" | "shield" | "droplet" | "currency";
  color?: "blue" | "green" | "cyan" | "amber";
  format?: "number" | "currency";
}

export function KpiCard({ title, value, subtitle, icon, color = "blue", format }: KpiCardProps) {
  const formattedValue =
    format === "currency"
      ? `KES ${value.toLocaleString()}`
      : value.toLocaleString();

  const IconComponent = {
    alert: AlertTriangle,
    shield: Shield,
    droplet: Droplet,
    currency: DollarSign,
  }[icon];

  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  }[color];

  const iconBgClasses = {
    blue: "bg-blue-100",
    green: "bg-green-100",
    cyan: "bg-cyan-100",
    amber: "bg-amber-100",
  }[color];

  return (
    <div className={`rounded-lg border p-4 ${colorClasses}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold">{formattedValue}</p>
          <p className="mt-1 text-xs opacity-70">{subtitle}</p>
        </div>
        <div className={`rounded-full p-2 ${iconBgClasses}`}>
          <IconComponent className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
