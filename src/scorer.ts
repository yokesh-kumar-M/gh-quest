import type { IssueCandidate } from "./types.js";

/**
 * Score an issue by how attractive it is to pick up.
 * Higher score = better candidate (low competition, recent activity, healthy repo).
 *
 * This is intentionally simple for v0; iterate based on user feedback.
 */
export function scoreCandidate(c: IssueCandidate): number {
  let score = 100;

  // Heavy penalty for each existing competing PR
  score -= c.competingPRs * 40;

  // Mild penalty for old/stale issues (nothing's moved on them for a reason)
  if (c.daysSinceUpdate > 90) score -= 20;
  else if (c.daysSinceUpdate > 30) score -= 5;

  // Mild bonus for higher-star repos (more Gitroll signal, more eyes on PR)
  if (c.repoStars > 50000) score += 10;
  else if (c.repoStars > 10000) score += 5;

  return Math.max(0, score);
}
