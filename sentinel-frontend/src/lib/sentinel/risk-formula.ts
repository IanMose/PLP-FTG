/**
 * Frontend mirror of RiskService.java computeRiskScore().
 *
 * CRITICAL: This formula MUST match RiskService.java exactly.
 * If the Java formula changes, update this file in the same commit.
 *
 * Formula constants (must match Java):
 *   incidentCeiling : 2.0   (200 incidents = max sub-score)
 *   auditCeiling    : 1.8   (180 days = max sub-score)
 *   rejectionAmp    : 500.0 (amplifier — 20% rejection → max sub-score)
 *   spikeCeiling    : 10.0  (10 spikes = max sub-score)
 *   weights         : 0.30 / 0.30 / 0.20 / 0.10 / 0.10
 */

import type { SeverityBand } from "./types";

export interface RiskContribs {
  incidentFrequency: number; // weighted pts, max 30
  severityMix: number;       // weighted pts, max 30
  auditRecency: number;      // weighted pts, max 20
  rejectionRate: number;     // weighted pts, max 10
  pressureSpikes: number;    // weighted pts, max 10
}

export interface RiskScoreResult {
  score: number;
  band: SeverityBand;
  contribs: RiskContribs;
}

export function scoreToBand(score: number): SeverityBand {
  if (score >= 75) return "Critical";
  if (score >= 55) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

/**
 * Computes the composite risk score and per-factor weighted contributions.
 *
 * @param incidentCount  - total incident count for the site
 * @param critHighCount  - number of Critical or High severity incidents
 * @param daysSinceAudit - calendar days since last audit (365 if never audited)
 * @param rejectedRate   - fraction of records rejected (0.0 to 1.0)
 * @param pressureSpikes - count of out-of-range pressure readings
 */
export function computeRiskScore(
  incidentCount: number,
  critHighCount: number,
  daysSinceAudit: number,
  rejectedRate: number,
  pressureSpikes: number,
): RiskScoreResult {
  const incidentSub  = Math.min(incidentCount / 2.0, 100);
  const severitySub  = incidentCount > 0
    ? Math.min((critHighCount / incidentCount) * 100, 100) : 0;
  const auditSub     = Math.min(daysSinceAudit / 1.8, 100);
  const rejectionSub = Math.min(rejectedRate * 500, 100);
  const spikeSub     = Math.min(pressureSpikes * 10, 100);

  const contribs: RiskContribs = {
    incidentFrequency: Math.round(incidentSub  * 0.30 * 100) / 100,
    severityMix:       Math.round(severitySub  * 0.30 * 100) / 100,
    auditRecency:      Math.round(auditSub     * 0.20 * 100) / 100,
    rejectionRate:     Math.round(rejectionSub * 0.10 * 100) / 100,
    pressureSpikes:    Math.round(spikeSub     * 0.10 * 100) / 100,
  };

  const raw = contribs.incidentFrequency + contribs.severityMix +
              contribs.auditRecency + contribs.rejectionRate + contribs.pressureSpikes;

  const score = Math.min(Math.max(Math.round(raw), 0), 100);

  return { score, band: scoreToBand(score), contribs };
}
