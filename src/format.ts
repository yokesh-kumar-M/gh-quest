import Table from "cli-table3";
import chalk from "chalk";
import type { ScanResult } from "./types.js";
import { scoreCandidate } from "./scorer.js";

export function formatScanResult(result: ScanResult): string {
  if (result.candidates.length === 0 && result.skipped.length === 0) {
    return chalk.yellow("No candidates and nothing skipped — check your --repos and --labels.");
  }

  const lines: string[] = [];

  if (result.candidates.length > 0) {
    const table = new Table({
      head: ["Issue", "Score", "Competing PRs", "Updated (days ago)", "Stars", "URL"],
      style: { head: ["cyan"] },
    });

    const ranked = [...result.candidates].sort(
      (a, b) => scoreCandidate(b) - scoreCandidate(a),
    );

    for (const c of ranked) {
      table.push([
        `${c.repo}#${c.number}`,
        scoreCandidate(c).toString(),
        c.competingPRs.toString(),
        c.daysSinceUpdate.toString(),
        c.repoStars.toLocaleString(),
        c.url,
      ]);
    }

    lines.push(table.toString());
  }

  if (result.skipped.length > 0) {
    lines.push(chalk.dim(`\nSkipped ${result.skipped.length} repo(s):`));
    for (const s of result.skipped) {
      lines.push(chalk.dim(`  - ${s.repo}: ${s.reason}`));
    }
  }

  return lines.join("\n");
}
