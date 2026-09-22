import type { ScoreRequest, StructuredAiProvider } from './types';

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const DEFAULT_GEMINI_TIMEOUT_MS = 20_000;

export class GeminiProvider implements StructuredAiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = 'gemini-2.5-flash',
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_GEMINI_TIMEOUT_MS,
  ) {}

  async generateJobScore(
    request: ScoreRequest,
    prompt: string,
  ): Promise<unknown> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${prompt}\n\nCANDIDATE_JSON\n${JSON.stringify(request.candidate)}\n\nJOB_JSON\n${JSON.stringify(request.job)}\n\nELIGIBILITY_JSON\n${JSON.stringify(request.eligibility)}`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error(`Gemini request timed out after ${this.timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok)
      throw new Error(`Gemini request failed (${response.status})`);
    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no structured content');
    return JSON.parse(text) as unknown;
  }
}
