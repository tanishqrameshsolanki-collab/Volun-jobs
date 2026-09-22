import { scoreCacheKey, MemoryScoreCache } from './cache';
import { scoreJobDeterministically } from './deterministic-score';
import {
  jobScoringPrompt,
  jobScoringPromptVersion,
} from './prompts/job-scoring';
import { parseJobScore } from './validate';
import type {
  ScoreRequest,
  ScoreServiceResult,
  StructuredAiProvider,
} from './types';

export async function scoreJob(
  request: ScoreRequest,
  options: { provider?: StructuredAiProvider; cache?: MemoryScoreCache } = {},
): Promise<ScoreServiceResult> {
  const cache = options.cache ?? new MemoryScoreCache();
  const cacheKey = scoreCacheKey(request, jobScoringPromptVersion);
  const validationOptions = {
    candidateProjectNames: request.candidate.projects.map(
      (project) => project.name,
    ),
  };
  const cached = parseJobScore(cache.get(cacheKey), validationOptions);
  if (cached) return { status: 'READY', score: cached, cacheKey };
  const fallback = scoreJobDeterministically(
    request.job,
    request.candidate,
    request.eligibility,
  );
  if (!options.provider) {
    cache.set(cacheKey, fallback);
    return { status: 'READY', score: fallback, cacheKey };
  }
  let lastIssues = 'No valid structured output';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = parseJobScore(
        await options.provider.generateJobScore(
          request,
          `${jobScoringPrompt}\nAttempt ${attempt + 1}.`,
        ),
        validationOptions,
      );
      if (result) {
        cache.set(cacheKey, result);
        return { status: 'READY', score: result, cacheKey };
      }
      lastIssues = 'Provider output failed JobScore validation';
    } catch (error) {
      lastIssues =
        error instanceof Error
          ? error.message
          : 'Provider output could not be parsed';
    }
  }
  return { status: 'MANUAL_REVIEW', reason: lastIssues, cacheKey, fallback };
}
