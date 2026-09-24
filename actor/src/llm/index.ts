import { createAnthropicProvider } from './anthropicProvider.js';
import { noopProvider } from './noopProvider.js';
import type { LlmProvider } from './types.js';

export function getLlmProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? 'claude-sonnet-5';

  if (provider === 'anthropic' && apiKey) {
    return createAnthropicProvider(apiKey, model);
  }
  return noopProvider;
}

export type { LlmProvider } from './types.js';
