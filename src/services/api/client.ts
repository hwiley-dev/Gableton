import type { ChangeRequestRecord, RepoRecord, VersionRecord } from "./types";

export class ApiClient {
  async listProjects(): Promise<RepoRecord[]> {
    return [];
  }

  async listVersions(_projectId: string): Promise<VersionRecord[]> {
    return [];
  }

  async listChangeRequests(_projectId: string): Promise<ChangeRequestRecord[]> {
    return [];
  }
}
