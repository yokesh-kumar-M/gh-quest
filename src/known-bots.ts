/**
 * Repos known to auto-close unsolicited PRs via bot.
 * Submitting a PR here without going through their proposal flow is wasted effort.
 *
 * Add new entries with a citation (issue/PR URL) so we don't accumulate folklore.
 */
export const BOT_GATED_REPOS = new Set<string>([
  // Expensify auto-closes any PR not from an org member with a linked assigned issue.
  // Citation: https://github.com/Expensify/App/pull/91494#issuecomment-4524419143
  "Expensify/App",
]);

export function isBotGated(repo: string): boolean {
  return BOT_GATED_REPOS.has(repo);
}
