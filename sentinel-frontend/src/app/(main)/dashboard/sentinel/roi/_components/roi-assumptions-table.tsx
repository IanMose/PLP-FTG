"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProvenanceBadge } from "./provenance-badge";

interface Assumption {
  key: string;
  label: string;
  value: number;
  unit: string;
  sourceType: "COURT_RECORD" | "ESTIMATE" | "SYNTHETIC" | "PIPELINE_DATA";
  editable: boolean;
}

interface Props {
  assumptions: Assumption[];
  onRecalculate: (values: Record<string, number>) => Promise<void>;
  isLoading: boolean;
}

export function RoiAssumptionsTable({ assumptions, onRecalculate, isLoading }: Props) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(assumptions.map((a) => [a.key, a.value]))
  );

  const handleChange = (key: string, raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) setValues((v) => ({ ...v, [key]: n }));
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left">Assumption</th>
              <th className="px-4 py-2 text-right">Value</th>
              <th className="px-4 py-2 text-left">Unit</th>
              <th className="px-4 py-2 text-left">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assumptions.map((a) => (
              <tr key={a.key} className="hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{a.label}</td>
                <td className="px-4 py-2 text-right">
                  {a.editable ? (
                    <Input
                      type="number"
                      step="any"
                      value={values[a.key] ?? a.value}
                      onChange={(e) => handleChange(a.key, e.target.value)}
                      className="h-7 w-36 text-right text-sm"
                    />
                  ) : (
                    <span className="tabular-nums font-semibold">
                      {typeof a.value === "number"
                        ? a.value.toLocaleString()
                        : a.value}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{a.unit}</td>
                <td className="px-4 py-2">
                  <ProvenanceBadge type={a.sourceType} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        onClick={() => onRecalculate(values)}
        disabled={isLoading}
        size="sm"
      >
        {isLoading ? "Calculating…" : "Recalculate"}
      </Button>
    </div>
  );
}
