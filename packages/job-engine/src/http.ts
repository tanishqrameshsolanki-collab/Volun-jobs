import type { FetchLike } from './types';

export const DEFAULT_SOURCE_TIMEOUT_MS = 15_000;

async function request(
  fetcher: FetchLike,
  url: string,
  accept: string,
  timeoutMs: number,
): Promise<Awaited<ReturnType<FetchLike>>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, {
      headers: { Accept: accept },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error(
        `Job source request timed out after ${timeoutMs}ms: ${url}`,
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson(
  fetcher: FetchLike,
  url: string,
  timeoutMs = DEFAULT_SOURCE_TIMEOUT_MS,
): Promise<unknown> {
  const response = await request(fetcher, url, 'application/json', timeoutMs);
  if (!response.ok)
    throw new Error(
      `Job source request failed (${response.status} ${response.statusText}): ${url}`,
    );
  return response.json();
}

export async function fetchText(
  fetcher: FetchLike,
  url: string,
  timeoutMs = DEFAULT_SOURCE_TIMEOUT_MS,
): Promise<string> {
  const response = await request(
    fetcher,
    url,
    'text/html,application/xhtml+xml',
    timeoutMs,
  );
  if (!response.ok)
    throw new Error(
      `Job source request failed (${response.status} ${response.statusText}): ${url}`,
    );
  return response.text();
}

export function isoNow() {
  return new Date().toISOString();
}
