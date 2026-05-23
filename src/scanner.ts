import { Octokit } from "@octokit/rest";
import type { IssueCandidate, ScanOptions, ScanResult } from "./types.js";
import { isBotGated } from "./known-bots.js";
import { createOctokit } from "./octokit.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface SearchItem {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  comments: number;
  labels: Array<string | { name?: string }>;
}

function daysSince(timestamp: string): number {
  return Math.floor((Date.now() - new Date(timestamp).getTime()) / MS_PER_DAY);
}

function extractLabelNames(labels: SearchItem["labels"]): string[] {
  return labels
    .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
    .filter((name) => name.length > 0);
}

export interface ScanDeps {
  /** Inject an Octokit instance — used for testing. Defaults to one built from `options.token`. */
  octokit?: Octokit;
}

export async function scan(
  options: ScanOptions,
  deps: ScanDeps = {},
): Promise<ScanResult> {
  const octokit = deps.octokit ?? createOctokit({ auth: options.token });
  const candidates: IssueCandidate[] = [];
  const skipped: ScanResult["skipped"] = [];

  for (const repo of options.repos) {
    if (options.excludeBotGatedRepos && isBotGated(repo)) {
      skipped.push({ repo, reason: "bot-gated (auto-closes unsolicited PRs)" });
      continue;
    }

    const [owner, name] = repo.split("/");
    if (!owner || !name) {
      skipped.push({ repo, reason: "invalid repo format, expected owner/name" });
      continue;
    }

    let repoStars: number;
    try {
      const repoInfo = await octokit.repos.get({ owner, repo: name });
      repoStars = repoInfo.data.stargazers_count;
    } catch (err) {
      skipped.push({
        repo,
        reason: `repo not accessible: ${(err as Error).message}`,
      });
      continue;
    }

    // OR-combine labels by running one search per label and deduping by issue number.
    const matchedIssues = new Map<number, SearchItem>();
    for (const label of options.labels) {
      try {
        const result = await octokit.search.issuesAndPullRequests({
          q: `repo:${owner}/${name} is:issue is:open no:assignee label:"${label}"`,
          per_page: 100,
        });
        for (const item of result.data.items as SearchItem[]) {
          matchedIssues.set(item.number, item);
        }
      } catch (err) {
        skipped.push({
          repo,
          reason: `label "${label}" search failed: ${(err as Error).message}`,
        });
      }
    }

    for (const issue of matchedIssues.values()) {
      const daysSinceUpdate = daysSince(issue.updated_at);
      if (daysSinceUpdate > options.maxStaleDays) continue;

      // Count competing OPEN PRs that mention this issue number.
      // Quoted "#N" forces exact match — avoids 281 colliding with 1281, 2810, etc.
      let competingPRs = 0;
      try {
        const prSearch = await octokit.search.issuesAndPullRequests({
          q: `repo:${owner}/${name} is:pr is:open "#${issue.number}" in:body`,
          per_page: 1,
        });
        competingPRs = prSearch.data.total_count;
      } catch {
        // If the search fails (rate limit, etc.) treat as unknown and skip the filter
        competingPRs = -1;
      }

      if (competingPRs >= 0 && competingPRs > options.maxExistingPRs) continue;

      candidates.push({
        repo,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        commentCount: issue.comments,
        labels: extractLabelNames(issue.labels),
        competingPRs,
        ageInDays: daysSince(issue.created_at),
        daysSinceUpdate,
        repoStars,
      });
    }
  }

  return { candidates, skipped };
}
