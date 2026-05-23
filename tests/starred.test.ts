import { describe, it, expect, vi } from "vitest";
import { fetchStarredRepos } from "../src/starred.js";
import type { Octokit } from "@octokit/rest";

function makeMockOctokit(items: Array<{ full_name?: string }>, calls: { authed: number; byUser: number } = { authed: 0, byUser: 0 }) {
  return {
    activity: {
      listReposStarredByAuthenticatedUser: vi.fn(async () => {
        calls.authed++;
        return { data: items };
      }),
      listReposStarredByUser: vi.fn(async () => {
        calls.byUser++;
        return { data: items };
      }),
    },
  } as unknown as Octokit;
}

describe("fetchStarredRepos", () => {
  it("returns full_name strings from the authenticated user's stars", async () => {
    const octokit = makeMockOctokit([
      { full_name: "shadcn-ui/ui" },
      { full_name: "vercel/next.js" },
    ]);
    const repos = await fetchStarredRepos(octokit);
    expect(repos).toEqual(["shadcn-ui/ui", "vercel/next.js"]);
  });

  it("uses the by-user endpoint when a user is specified", async () => {
    const calls = { authed: 0, byUser: 0 };
    const octokit = makeMockOctokit([{ full_name: "torvalds/linux" }], calls);
    const repos = await fetchStarredRepos(octokit, { user: "torvalds" });
    expect(repos).toEqual(["torvalds/linux"]);
    expect(calls.byUser).toBe(1);
    expect(calls.authed).toBe(0);
  });

  it("respects the limit", async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ full_name: `owner/repo${i}` }));
    const octokit = makeMockOctokit(items);
    const repos = await fetchStarredRepos(octokit, { limit: 5 });
    expect(repos).toHaveLength(5);
    expect(repos[0]).toBe("owner/repo0");
  });

  it("skips items without a full_name", async () => {
    const octokit = makeMockOctokit([
      { full_name: "shadcn-ui/ui" },
      {},
      { full_name: "prisma/prisma" },
    ]);
    const repos = await fetchStarredRepos(octokit);
    expect(repos).toEqual(["shadcn-ui/ui", "prisma/prisma"]);
  });
});
