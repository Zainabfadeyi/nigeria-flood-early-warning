import type { SourceRef } from '@nigeria-flood/shared';

export interface SourceOutcome<T> {
  data: T | null;
  warnings: string[];
  sources: SourceRef[];
}

/**
 * Every source module must fail independently: log it, add a warning, keep
 * going. This wraps a fetch so a thrown error becomes a warning instead of
 * crashing the run.
 */
export async function runSource<T>(
  sourceName: string,
  sources: SourceRef[],
  fn: () => Promise<T>,
): Promise<SourceOutcome<T>> {
  try {
    const data = await fn();
    return { data, warnings: [], sources };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${sourceName}] failed: ${message}`);
    return { data: null, warnings: [`${sourceName} failed: ${message}`], sources: [] };
  }
}
