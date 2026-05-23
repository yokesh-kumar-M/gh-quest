export interface IssueCandidate {
  repo: string;
  number: number;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  labels: string[];
  competingPRs: number;
  ageInDays: number;
  daysSinceUpdate: number;
  repoStars: number;
}

export interface ScanOptions {
  repos: string[];
  labels: string[];
  maxExistingPRs: number;
  maxStaleDays: number;
  excludeBotGatedRepos: boolean;
  token?: string;
}

export interface ScanResult {
  candidates: IssueCandidate[];
  skipped: {
    repo: string;
    reason: string;
  }[];
}
