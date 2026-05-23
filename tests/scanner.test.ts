import { describe, it, expect, vi } from "vitest";
import { scan } from "../src/scanner.js";
import type { Octokit } from "@octokit/rest";

function makeMockOctokit(overrides: {
  starsByRepo?: Record<string, number>;
  issuesByLabel?: Record<string, unknown[]>;
  competingPrsByIssue?: Record<number, number>;
  failGetRepo?: string;
}) {
  const repoGet = vi.fn(async ({ owner, repo }: { owner: string; repo: string }) => {
    const fullName = `${owner}/${repo}`;
    if (overrides.failGetRepo === fullName) {
      throw new Error("Not Found");
    }
    return { data: { stargazers_count: overrides.starsByRepo?.[fullName] ?? 0 } };
  });

  const searchIssues = vi.fn(async ({ q, per_page }: { q: string; per_page?: number }) => {
    // Distinguish between issue search and PR-counting search by `is:pr` in query
    if (q.includes("is:pr")) {
      // Find the #N in the query and look up competing PRs for that issue number
      const match = q.match(/"#(\d+)"/);
      const issueNumber = match ? parseInt(match[1]!, 10) : -1;
      const count = overrides.competingPrsByIssue?.[issueNumber] ?? 0;
      return { data: { total_count: count, items: [] } };
    }
    // Issue search — match by label in query
    const labelMatch = q.match(/label:"([^"]+)"/);
    const label = labelMatch ? labelMatch[1]! : "";
    const items = overrides.issuesByLabel?.[label] ?? [];
    void per_page;
    return { data: { total_count: items.length, items } };
  });

  return {
    repos: { get: repoGet },
    search: { issuesAndPullRequests: searchIssues },
  } as unknown as Octokit;
}

function makeIssue(number: number, daysSinceUpdate = 5) {
  const updated = new Date(Date.now() - daysSinceUpdate * 86400000).toISOString();
  return {
    number,
    title: `issue ${number}`,
    html_url: `https://github.com/owner/repo/issues/${number}`,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: updated,
    comments: 0,
    labels: [{ name: "good first issue" }],
  };
}

describe("scan", () => {
  const baseOptions = {
    repos: ["owner/repo"],
    labels: ["good first issue"],
    maxExistingPRs: 1,
    maxStaleDays: 180,
    excludeBotGatedRepos: true,
    token: "fake",
  };

  it("returns candidates that pass all filters", async () => {
    const octokit = makeMockOctokit({
      starsByRepo: { "owner/repo": 1000 },
      issuesByLabel: { "good first issue": [makeIssue(42)] },
      competingPrsByIssue: { 42: 0 },
    });

    const result = await scan(baseOptions, { octokit });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      repo: "owner/repo",
      number: 42,
      competingPRs: 0,
      repoStars: 1000,
    });
    expect(result.skipped).toHaveLength(0);
  });

  it("skips bot-gated repos when configured", async () => {
    const octokit = makeMockOctokit({});
    const result = await scan(
      { ...baseOptions, repos: ["Expensify/App"] },
      { octokit },
    );
    expect(result.candidates).toHaveLength(0);
    expect(result.skipped).toEqual([
      { repo: "Expensify/App", reason: expect.stringContaining("bot-gated") },
    ]);
  });

  it("skips invalid repo strings", async () => {
    const octokit = makeMockOctokit({});
    const result = await scan({ ...baseOptions, repos: ["just-a-name"] }, { octokit });
    expect(result.skipped).toEqual([
      { repo: "just-a-name", reason: expect.stringContaining("invalid repo format") },
    ]);
  });

  it("drops issues with too many competing PRs", async () => {
    const octokit = makeMockOctokit({
      starsByRepo: { "owner/repo": 1000 },
      issuesByLabel: { "good first issue": [makeIssue(7)] },
      competingPrsByIssue: { 7: 5 },
    });
    const result = await scan(baseOptions, { octokit });
    expect(result.candidates).toHaveLength(0);
  });

  it("drops stale issues beyond maxStaleDays", async () => {
    const octokit = makeMockOctokit({
      starsByRepo: { "owner/repo": 1000 },
      issuesByLabel: { "good first issue": [makeIssue(99, 365)] },
      competingPrsByIssue: { 99: 0 },
    });
    const result = await scan(baseOptions, { octokit });
    expect(result.candidates).toHaveLength(0);
  });

  it("dedupes issues that match multiple labels", async () => {
    const issue = makeIssue(11);
    const octokit = makeMockOctokit({
      starsByRepo: { "owner/repo": 1000 },
      issuesByLabel: {
        "good first issue": [issue],
        "help wanted": [issue],
      },
      competingPrsByIssue: { 11: 0 },
    });
    const result = await scan(
      { ...baseOptions, labels: ["good first issue", "help wanted"] },
      { octokit },
    );
    expect(result.candidates).toHaveLength(1);
  });

  it("includes issues when PR-count lookup fails (errs on the side of showing the issue)", async () => {
    const octokit = {
      repos: {
        get: vi.fn(async () => ({ data: { stargazers_count: 100 } })),
      },
      search: {
        issuesAndPullRequests: vi.fn(async ({ q }: { q: string }) => {
          if (q.includes("is:pr")) throw new Error("rate limit");
          return { data: { total_count: 1, items: [makeIssue(5)] } };
        }),
      },
    } as unknown as Octokit;

    const result = await scan(baseOptions, { octokit });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]!.competingPRs).toBe(-1);
  });
});
