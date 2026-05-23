import type { Octokit } from "@octokit/rest";

export interface FetchStarredOptions {
  /** GitHub username whose stars to fetch. If omitted, uses the authenticated user. */
  user?: string;
  /** Maximum number of starred repos to return. Default: 20. */
  limit?: number;
}

/**
 * Fetch a list of `owner/name` strings from a user's GitHub stars,
 * ordered by most-recently-starred first.
 */
export async function fetchStarredRepos(
  octokit: Octokit,
  options: FetchStarredOptions = {},
): Promise<string[]> {
  const limit = options.limit ?? 20;
  const repos: string[] = [];

  // The API returns 100 per page max; for our typical limits one page is enough.
  const perPage = Math.min(100, limit);

  const response = options.user
    ? await octokit.activity.listReposStarredByUser({
        username: options.user,
        per_page: perPage,
        sort: "created",
        direction: "desc",
      })
    : await octokit.activity.listReposStarredByAuthenticatedUser({
        per_page: perPage,
        sort: "created",
        direction: "desc",
      });

  for (const item of response.data as Array<{ full_name?: string }>) {
    if (item.full_name) repos.push(item.full_name);
    if (repos.length >= limit) break;
  }

  return repos;
}
