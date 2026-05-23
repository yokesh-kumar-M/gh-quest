import { Octokit } from "@octokit/rest";
import type { IssueCandidate, ScanOptions, ScanResult } from "./types.js";
import { isBotGated } from "./known-bots.js";

export async function scan(options: ScanOptions): Promise<ScanResult> {
  const octokit = new Octokit({ auth: options.token });
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

    // TODO(scanner): fetch open issues with matching labels, no assignee
    // TODO(scanner): for each issue, search PRs referencing it via Closes/Fixes #N
    // TODO(scanner): fetch repo star count once per repo
    // TODO(scanner): filter by maxStaleDays
    // TODO(scanner): populate IssueCandidate[] and push to candidates

    // Placeholder: confirm API auth works
    await octokit.repos.get({ owner, repo: name });
  }

  return { candidates, skipped };
}
