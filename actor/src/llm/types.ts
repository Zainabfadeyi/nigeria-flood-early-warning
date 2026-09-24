export interface LlmExtractionResult {
  data: unknown | null;
  raw: string;
  warnings: string[];
}

export interface LlmProvider {
  readonly name: string;
  /** Ask the model to return JSON matching instructions in the prompts; caller is responsible for zod-validating the result. */
  extractJson(systemPrompt: string, userPrompt: string): Promise<LlmExtractionResult>;
}
