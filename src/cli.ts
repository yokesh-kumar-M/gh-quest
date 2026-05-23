#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { scan } from "./scanner.js";
import { formatScanResult } from "./format.js";

const program = new Command();

program
  .name("gh-quest")
  .description("Find good-first-issues that genuinely need contributors.")
  .version("0.1.1");

program
  .command("scan")
  .description("Scan repos for tractable good-first-issues with low PR competition.")
  .requiredOption(
    "-r, --repos <list>",
    "comma-separated list of repos (owner/name,owner/name,...)",
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

    const repos = (opts.repos as string).split(",").map((r) => r.trim()).filter(Boolean);
    const labels = (opts.labels as string).split(",").map((l) => l.trim()).filter(Boolean);

    try {
      const result = await scan({
        repos,
        labels,
        maxExistingPRs: opts.maxExistingPrs,
        maxStaleDays: opts.maxStaleDays,
        excludeBotGatedRepos: !opts.includeBotGated,
        token,
      });

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
