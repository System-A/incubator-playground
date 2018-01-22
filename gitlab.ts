import { ISourceCodeReference, IReferenceFactory } from './extraction'

class GitLabReferenceSource<TConfig> {
  getReference(projectId): ISourceCodeReference<TConfig> {
    throw new Error("Not implemented")
  }
  projectSearch(predicate: (name: string) => boolean): Promise<IGitLabProject[]> {
    throw new Error("Not implemented")
  }
}

export class GitLab<TConfig> implements IReferenceFactory<TConfig, GitLabReferenceSource<TConfig>> {
  constructor(baseUrl, key) {
  }
  get(configKey, data): GitLabReferenceSource<TConfig> {
    return {} as GitLabReferenceSource<TConfig>
  }
}

