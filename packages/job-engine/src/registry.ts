import type { JobSourceAdapter } from './types';

export class JobSourceRegistry {
  private readonly adapters = new Map<string, JobSourceAdapter>();

  register(adapter: JobSourceAdapter) {
    const key = `${adapter.source}:${adapter.company.toLowerCase()}`;
    if (this.adapters.has(key))
      throw new Error(`Job source adapter already registered: ${key}`);
    this.adapters.set(key, adapter);
    return this;
  }

  list() {
    return [...this.adapters.values()];
  }
  get(source: string, company: string) {
    return this.adapters.get(`${source}:${company.toLowerCase()}`);
  }
}
