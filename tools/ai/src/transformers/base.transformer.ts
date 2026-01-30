import type { AgenstraContext, ComponentType, ToolName, ToolOutput } from '../types';

export abstract class BaseTransformer {
  abstract readonly name: ToolName;

  /** Whether this tool can use the component natively (separate files). */
  abstract canUseComponent(component: ComponentType): boolean;

  /** Components that must be merged into another (e.g. skills -> rules) for this tool. */
  needsFallbackMerge(): ComponentType[] {
    return [];
  }

  /** Produce tool-specific output files. */
  abstract transform(context: AgenstraContext): ToolOutput;
}
