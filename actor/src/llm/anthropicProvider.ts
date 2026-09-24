import type { LlmProvider } from './types.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}

function extractFirstJsonValue(text: string): unknown | null {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** Not exercised in this environment (no LLM_API_KEY configured) — see actor/src/sources/README.md. Wired up so it works as soon as a key is set. */
export function createAnthropicProvider(apiKey: string, model: string): LlmProvider {
  return {
    name: 'anthropic',
    async extractJson(systemPrompt, userPrompt) {
      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = (await response.json()) as AnthropicResponse;
        const text = json.content?.find((block) => block.type === 'text')?.text ?? '';
        const data = extractFirstJsonValue(text);
        return { data, raw: text, warnings: data ? [] : ['Anthropic response did not contain parseable JSON.'] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { data: null, raw: '', warnings: [`Anthropic extraction failed: ${message}`] };
      }
    },
  };
}
