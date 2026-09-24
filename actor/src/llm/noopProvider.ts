import type { LlmProvider } from './types.js';

/** Used when LLM_PROVIDER/LLM_API_KEY aren't configured — fails independently rather than throwing, matching every other source module. */
export const noopProvider: LlmProvider = {
  name: 'none',
  async extractJson() {
    return {
      data: null,
      raw: '',
      warnings: ['No LLM provider configured (set LLM_PROVIDER and LLM_API_KEY) — structured extraction skipped.'],
    };
  },
};
