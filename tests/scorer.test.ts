import { describe, it, expect } from "vitest";
import { scoreCandidate } from "../src/scorer.js";
import type { IssueCandidate } from "../src/types.js";

const baseCandidate: IssueCandidate = {
  repo: "owner/repo",
  number: 1,
  title: "test",
  url: "https://github.com/owner/repo/issues/1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-05-20T00:00:00Z",
  commentCount: 0,
  labels: [],
  competingPRs: 0,
  ageInDays: 100,
  daysSinceUpdate: 3,
  repoStars: 5000,
};

describe("scoreCandidate", () => {
  it("gives a high score to a fresh, uncontested issue", () => {
    expect(scoreCandidate(baseCandidate)).toBe(100);
  });

  it("penalises competing PRs heavily", () => {
    const contested = { ...baseCandidate, competingPRs: 1 };
    expect(scoreCandidate(contested)).toBe(60);
  });

  it("never returns a negative score", () => {
    const heavilyContested = { ...baseCandidate, competingPRs: 10 };
    expect(scoreCandidate(heavilyContested)).toBe(0);
  });

  it("bonuses high-star repos", () => {
    const big = { ...baseCandidate, repoStars: 100_000 };
    expect(scoreCandidate(big)).toBe(110);
  });
});
