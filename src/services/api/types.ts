export interface RepoRecord {
  id: string;
  name: string;
  defaultBranch: string;
}

export interface VersionRecord {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  state: "saved_locally" | "published" | "merged";
  summary: string;
}

export interface ChangeRequestRecord {
  id: string;
  title: string;
  author: string;
  status: "open" | "merged" | "closed";
  approvals: number;
}
