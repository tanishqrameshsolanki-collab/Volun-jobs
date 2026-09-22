import { createHash } from 'node:crypto';
import type { ScoreRequest } from './types';

export function scoreCacheKey(
  request: ScoreRequest,
  promptVersion: string,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        promptVersion,
        job: request.job,
        candidate: request.candidate,
      }),
    )
    .digest('hex');
}

export class MemoryScoreCache {
  private readonly values = new Map<string, unknown>();
  get(key: string) {
    return this.values.get(key);
  }
  set(key: string, value: unknown) {
    this.values.set(key, value);
  }
}
