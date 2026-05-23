#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { scan } from "./scanner.js";
import { formatScanResult } from "./format.js";
import { createOctokit } from "./octokit.js";
import { fetchStarredRepos } from "./starred.js";

const program = new Command();

program
  .name("gh-quest")
  .description("Find good-first-issues that genuinely need contributors.")
  .version("0.2.0");

program
  .command("scan")
  .description("Scan repos for tractable good-first-issues with low PR competition.")
  .option(
    "-r, --repos <list>",
    "comma-separated list of repos (owner/name,owner/name,...)",
  )
  .option(
    "--from-starred",
    "include the authenticated user's starred repos as scan targets",
    false,
  )
  .option(
    "--starred-by <user>",
    "include a specific user's starred repos as scan targets (implies --from-starred)",
  )
  .option(
    "--star-limit <n>",
    "max number of starred repos to include (default: 20)",
    (v) => parseInt(v, 10),
    20,
  )
  .option(
    "-l, --labels <list>",
    "comma-separated list of issue labels to match",
    "good first issue,help wanted",
  )
  .option(
    "--max-existing-prs <n>",
    "filter out issues with more than this many existing competing PRs",
    (v) => parseInt(v, 10),
    1,
  )
  .option(
    "--max-stale-days <n>",
    "filter out issues with no updates in this many days",
    (v) => parseInt(v, 10),
    180,
  )
  .option(
    "--include-bot-gated",
    "include repos known to auto-close unsolicited PRs",
    false,
  )
  .option("--json", "output JSON instead of a table", false)
  .action(async (opts) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error(
        chalk.red(
          "GITHUB_TOKEN env var not set. Create a fine-grained PAT (repo:read) at https://github.com/settings/tokens?type=beta",
        ),
      );
      process.exit(1);
    }

    const explicitRepos = opts.repos
      ? (opts.repos as string).split(",").map((r) => r.trim()).filter(Boolean)
      : [];
    const labels = (opts.labels as string).split(",").map((l) => l.trim()).filter(Boolean);

    const useStarred = Boolean(opts.fromStarred || opts.starredBy);
    if (explicitRepos.length === 0 && !useStarred) {
      console.error(
        chalk.red("Either --repos or --from-starred (or --starred-by) must be provided."),
      );
      process.exit(1);
    }

    const octokit = createOctokit({ auth: token });

    let starredRepos: string[] = [];
    if (useStarred) {
      try {
        starredRepos = await fetchStarredRepos(octokit, {
          user: opts.starredBy,
          limit: opts.starLimit,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`failed to fetch starred repos: ${message}`));
        process.exit(1);
      }
    }

    // Combine and dedupe, preserving order (explicit repos first, then starred).
    const seen = new Set<string>();
    const repos: string[] = [];
    for (const r of [...explicitRepos, ...starredRepos]) {
      if (!seen.has(r)) {
        seen.add(r);
        repos.push(r);
      }
    }

    if (!opts.json) {
      const sources: string[] = [];
      if (explicitRepos.length > 0) sources.push(`${explicitRepos.length} explicit`);
      if (starredRepos.length > 0) {
        sources.push(
          `${starredRepos.length} starred${opts.starredBy ? ` by @${opts.starredBy}` : ""}`,
        );
      }
      console.error(chalk.dim(`Scanning ${repos.length} repo(s) (${sources.join(", ")})...`));
    }

    try {
      const result = await scan(
        {
          repos,
          labels,
          maxExistingPRs: opts.maxExistingPrs,
          maxStaleDays: opts.maxStaleDays,
          excludeBotGatedRepos: !opts.includeBotGated,
          token,
        },
        { octokit },
      );

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatScanResult(result));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`scan failed: ${message}`));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
