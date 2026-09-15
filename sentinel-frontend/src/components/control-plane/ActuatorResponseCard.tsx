// Deliberately renders the API's literal response verbatim.
// "actuator": "MOCK" must always be exactly visible — never paraphrased or hidden.

interface ActuatorResponseCardProps {
  response: Record<string, unknown> | null;
}

export function ActuatorResponseCard({ response }: ActuatorResponseCardProps) {
  if (!response) return null;

  return (
    <div className="rounded-md border border-[var(--console-border)] bg-black/40 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-[var(--console-text-dim)]">
          Actuator response
        </div>
        {String(response.actuator) === "MOCK" && (
          <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-400">
            SIMULATED — not real hardware
          </span>
        )}
      </div>
      <pre className="tabular-readout overflow-x-auto font-mono text-xs text-[var(--console-text)] leading-relaxed">
        {JSON.stringify(response, null, 2)}
      </pre>
    </div>
  );
}
